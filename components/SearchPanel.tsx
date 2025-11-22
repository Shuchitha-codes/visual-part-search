import React, { useState, useRef } from 'react';
import { SearchResult } from '../types';
import { searchPartImage } from '../services/api';

const SearchPanel: React.FC<any> = () => {
  const [searchImage, setSearchImage] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSearchImage(reader.result as string);
        setResults([]); // Clear previous
        setErrorMsg(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const executeSearch = async () => {
    if (!searchImage) return;
    setIsSearching(true);
    setErrorMsg(null);
    
    try {
      // Call AWS Lambda via API Service
      console.log("[Search] Executing search...");
      const matches = await searchPartImage(searchImage);
      console.log("[Search] Matches:", matches);

      if (!matches || matches.length === 0) {
          setErrorMsg("No matches found in Database. Ensure you have 'Captured & Indexed' parts in the Admin tab first.");
      } else {
          setResults(matches);
      }
    } catch (error: any) {
      console.error("Search failed", error);
      setErrorMsg(`Search Failed: ${error.message}. Check console for details.`);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-full flex flex-col shadow-lg">
            <h2 className="text-xl font-bold mb-4">Visual Search</h2>
            <div 
                className="flex-1 border-2 border-dashed border-slate-600 rounded-xl flex items-center justify-center p-4 cursor-pointer hover:border-indigo-500 bg-slate-900/50 overflow-hidden relative"
                onClick={() => fileInputRef.current?.click()}
            >
                {searchImage ? 
                    <img src={searchImage} className="absolute inset-0 w-full h-full object-contain" /> :
                    <span className="text-slate-400">Tap to upload photo</span>
                }
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
            </div>
            <button 
                onClick={executeSearch}
                disabled={!searchImage || isSearching}
                className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-bold py-3 rounded-xl"
            >
                {isSearching ? 'Searching Vector DB...' : 'Identify Part'}
            </button>
        </div>
      </div>

      <div className="lg:col-span-8 flex flex-col h-full overflow-hidden">
         <h2 className="text-xl font-bold mb-4">Results</h2>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {results.length === 0 && !isSearching && !errorMsg && (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 border border-slate-800 rounded-xl">
                    <span>Upload an image to identify.</span>
                </div>
            )}
            
            {errorMsg && (
                <div className="p-4 bg-red-900/20 border border-red-700 rounded-xl text-red-200">
                    {errorMsg}
                </div>
            )}

            {results.map((result, idx) => (
                <div key={idx} className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex gap-4">
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            {/* Part Name - Part Number Format */}
                            <h3 className="text-lg font-bold text-white">
                                {result.part.name} - <span className="text-indigo-400">{result.part.sku}</span>
                            </h3>
                            <span className="text-green-400 font-mono text-xs">{(result.score * 100).toFixed(1)}% Match</span>
                        </div>
                        <p className="text-slate-400 text-sm mt-2">{result.part.description}</p>
                        <div className="mt-2 flex gap-2">
                             <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">View: {result.matchedView.angleName}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default SearchPanel;