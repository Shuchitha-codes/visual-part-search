import React, { useState, useRef, useEffect } from 'react';
import Viewer3D, { ViewerHandle } from './Viewer3D';
import { PartRecord } from '../types';
import { ingestPart } from '../services/api';

interface IngestionPanelProps {
  onAddToDatabase: (part: PartRecord) => void;
  onReset?: () => void;
}

const IngestionPanel: React.FC<IngestionPanelProps> = ({ onAddToDatabase, onReset }) => {
  const viewerRef = useRef<ViewerHandle>(null);
  
  // State for Form Inputs
  const [urn, setUrn] = useState<string>(""); 
  const [partName, setPartName] = useState("New Part");
  const [partSku, setPartSku] = useState("SKU-001");
  const [registeredModels, setRegisteredModels] = useState<any[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [`> ${msg}`, ...prev]);

  // Function to load models
  const loadModels = () => {
    const timestamp = Date.now();
    // Absolute path from public root
    const fileUrl = `/registered_models.json?t=${timestamp}`;
    
    console.log(`[Ingest] Fetching ${fileUrl}`);
    addLog(`Loading registry...`);
    
    fetch(fileUrl)
      .then(res => {
        if (res.status === 404) {
            throw new Error("Registry file missing (404). Run 'node scripts/register_model.js'");
        }
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log("[Ingest] Loaded models:", data);
        setRegisteredModels(data);
        
        if (data.length === 0) {
            addLog("⚠️ Registry is empty.");
            addLog("Run 'node scripts/register_model.js'");
        } else {
            addLog(`Loaded ${data.length} models.`);
            // Auto-select first if nothing selected
            if (!urn && data.length > 0) {
              handleModelSelect(data[0].urn, data[0].name);
            }
        }
      })
      .catch(err => {
        console.error("[Ingest] Registry Error:", err);
        addLog(`❌ Error: ${err.message}`);
      });
  };

  // Load on mount
  useEffect(() => {
    loadModels();
  }, []);

  const handleModelSelect = (selectedUrn: string, filename: string) => {
    console.log("Selected:", filename);
    setUrn(selectedUrn);
    
    // Auto-guess name from filename
    const guessName = filename
        .replace(/\.step|\.stp/gi, "")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, l => l.toUpperCase());
        
    setPartName(guessName);
    setPartSku(`SKU-${Math.floor(Math.random() * 9000) + 1000}`);
  };

  const handleIngest = async () => {
    if (!partName || !partSku || !urn) {
        addLog("Error: Missing Fields");
        return;
    }

    setIsProcessing(true);
    setLogs([]);
    addLog(`Starting Ingest for ${partSku}...`);

    // Expanded view list as requested
    const views = ["Front", "Top", "Isometric", "Left", "Right"];

    try {
      for (const viewName of views) {
        addLog(`Move Camera -> ${viewName}`);
        viewerRef.current?.setAngle(viewName);
        
        // Wait for render
        await new Promise(r => setTimeout(r, 1500));
        
        addLog(`Capturing Screenshot...`);
        const screenshotData = viewerRef.current?.captureScreenshot();
        
        if (screenshotData) {
            addLog(`Sending to AI...`);
            const result = await ingestPart(
                { name: partName, sku: partSku, category: "Mechanical" },
                screenshotData,
                viewName
            );
            addLog(`Indexed: ${result.id}`);
            
            onAddToDatabase({
                id: result.id,
                name: partName,
                sku: partSku,
                category: "Mechanical",
                description: result.description || "AI Generated",
                views: [],
                modelName: partName
            });
        }
      }
      addLog("✅ Success! Part is searchable.");
    } catch (error: any) {
        console.error(error);
        addLog(`❌ Error: ${error.message}`);
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      
      {/* LEFT COLUMN: CONTROLS (Wizard Style) */}
      <div className="lg:col-span-4 flex flex-col gap-6 h-full overflow-y-auto pr-2">
        
        {/* CARD 1: SELECT */}
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-indigo-400 font-bold text-sm tracking-wider">1. SELECT MODEL</h2>
                <button 
                    onClick={loadModels} 
                    className="text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300 transition-colors"
                >
                    ↻ Refresh List
                </button>
            </div>

            <div className="relative">
                <select 
                    className="w-full bg-slate-900 border border-slate-600 text-white text-sm rounded-lg p-3 appearance-none outline-none focus:border-indigo-500 cursor-pointer"
                    onChange={(e) => {
                        const selected = registeredModels.find(m => m.urn === e.target.value);
                        if (selected) handleModelSelect(selected.urn, selected.name);
                    }}
                    value={urn}
                >
                    {registeredModels.length === 0 ? (
                        <option value="">Registry Empty (Run Script)</option>
                    ) : (
                        registeredModels.map((model, idx) => {
                            // Format the display name to be cleaner (e.g. "gear.step" -> "Gear")
                            const displayName = model.name
                                .replace(/\.step|\.stp/gi, "")
                                .replace(/[-_]/g, " ")
                                .replace(/\b\w/g, (l: string) => l.toUpperCase());
                            
                            return (
                                <option key={idx} value={model.urn}>{displayName}</option>
                            );
                        })
                    )}
                </select>
                <div className="absolute right-3 top-3.5 pointer-events-none text-slate-400">▼</div>
            </div>
        </div>

        {/* CARD 2: METADATA */}
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-lg">
             <h2 className="text-indigo-400 font-bold text-sm tracking-wider mb-4">2. PART METADATA</h2>
             <div className="space-y-4">
                <div>
                    <span className="text-xs text-slate-400 block mb-1">Part Name</span>
                    <input 
                        type="text" 
                        value={partName}
                        onChange={(e) => setPartName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-sm text-white outline-none focus:border-indigo-500"
                    />
                </div>
                <div>
                    <span className="text-xs text-slate-400 block mb-1">SKU / PART NUMBER</span>
                    <input 
                        type="text" 
                        value={partSku}
                        onChange={(e) => setPartSku(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-sm text-white outline-none focus:border-indigo-500"
                    />
                </div>
             </div>
        </div>

        {/* ACTION BUTTON */}
        <button 
            onClick={handleIngest}
            disabled={isProcessing || !urn}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2"
        >
            {isProcessing ? (
                 <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                    Processing...
                 </>
            ) : "Capture & Index"}
        </button>

        {/* LOGS */}
        <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 p-3 font-mono text-[10px] overflow-y-auto text-green-400/80 shadow-inner min-h-[100px]">
             {logs.map((log, i) => <div key={i} className="mb-1">{log}</div>)}
        </div>

      </div>

      {/* RIGHT COLUMN: VIEWER */}
      <div className="lg:col-span-8 bg-slate-900 rounded-xl overflow-hidden border border-slate-800 relative shadow-2xl">
         <Viewer3D ref={viewerRef} urn={urn} />
         
         <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white text-[10px] p-3 rounded-lg border border-white/10 pointer-events-none">
            <ul className="space-y-1 text-slate-300">
                <li>1. Select Model</li>
                <li>2. Verify Name/SKU</li>
                <li>3. Click Capture & Index</li>
            </ul>
         </div>
      </div>

    </div>
  );
};

export default IngestionPanel;