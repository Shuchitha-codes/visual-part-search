import React, { useState } from 'react';
import { AppMode, PartRecord } from './types';
import IngestionPanel from './components/IngestionPanel';
import SearchPanel from './components/SearchPanel';

const App = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.INGEST);
  
  // Load from LocalStorage (Prototype Mode)
  const [database, setDatabase] = useState<PartRecord[]>(() => {
    try {
      const saved = localStorage.getItem('visual_search_db');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const addToDatabase = (part: PartRecord) => {
    setDatabase((prev) => {
      // Remove duplicates by SKU
      const filtered = prev.filter(p => p.sku !== part.sku);
      const updated = [...filtered, part];
      localStorage.setItem('visual_search_db', JSON.stringify(updated));
      return updated;
    });
  };

  const resetLocalDB = () => {
      if(confirm("Clear local browser data? This removes parts from the 'Identify' list.")) {
          localStorage.removeItem('visual_search_db');
          setDatabase([]);
      }
  }

  return (
    <div className="h-screen w-screen bg-slate-950 text-white flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
           <h1 className="font-bold text-lg tracking-tight text-slate-200">Auto<span className="text-white">Part</span> ID</h1>
        </div>
        <nav className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button onClick={() => setMode(AppMode.INGEST)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === AppMode.INGEST ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Database Admin</button>
          <button onClick={() => setMode(AppMode.SEARCH)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === AppMode.SEARCH ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}>Identify Part</button>
        </nav>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-slate-900 px-3 py-1.5 rounded border border-slate-800">
          <span className={`w-2 h-2 rounded-full ${database.length > 0 ? 'bg-green-500' : 'bg-red-500'}`}></span>
          Indexed: {database.length}
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-6 relative">
        <div className="relative z-10 h-full max-w-7xl mx-auto">
            {mode === AppMode.INGEST ? (
            <IngestionPanel onAddToDatabase={addToDatabase} onReset={resetLocalDB} />
            ) : (
            <SearchPanel />
            )}
        </div>
      </main>
    </div>
  );
};

export default App;