import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { getForgeToken } from '../services/api';

declare global {
  interface Window {
    Autodesk: any;
    THREE: any;
  }
}

export interface ViewerHandle {
  captureScreenshot: () => string;
  setAngle: (angleName: string) => void;
}

interface ViewerProps {
  urn: string; 
}

// Global flag to ensure we only initialize the Autodesk Global System once per session
let isAutodeskInitialized = false;

const Viewer3D = forwardRef<ViewerHandle, ViewerProps>(({ urn }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Function to just load the document into an existing or new viewer
  const loadModel = (viewer: any, urnToLoad: string) => {
    if (!urnToLoad) return;
    
    const documentId = urnToLoad.startsWith('urn:') ? urnToLoad : `urn:${urnToLoad}`;
    
    window.Autodesk.Viewing.Document.load(
        documentId, 
        (doc: any) => {
            const defaultModel = doc.getRoot().getDefaultGeometry();
            viewer.loadDocumentNode(doc, defaultModel);
        },
        (errorCode: any) => {
            console.error("Autodesk Viewer Load Error:", errorCode);
            setError(`Failed to load model (Error Code: ${errorCode})`);
        }
    );
  };

  const launchViewer = (token: string) => {
      if (!containerRef.current) return;

      // If viewer exists, we just tear it down to be safe and fresh
      if (viewerRef.current) {
          viewerRef.current.finish();
          viewerRef.current = null;
      }

      const viewer = new window.Autodesk.Viewing.GuiViewer3D(containerRef.current);
      viewer.start();
      viewerRef.current = viewer;
      
      // Load the requested URN
      loadModel(viewer, urn);
  };

  const initializeEngine = async () => {
    if (!window.Autodesk) {
        setError("Autodesk SDK script not loaded in index.html");
        return;
    }

    let token = "";
    try {
        token = await getForgeToken();
    } catch (e: any) {
        console.error("[Viewer] Token Error:", e);
        setError("Could not fetch Forge Token. Check API connection.");
        return;
    }

    if (!token || token === 'mock_token') {
        setError("No valid Token returned from Backend. Check .env");
        return;
    }
    setError(null);

    const options = {
      env: 'AutodeskProduction',
      accessToken: token,
    };

    if (!isAutodeskInitialized) {
        window.Autodesk.Viewing.Initializer(options, () => {
            isAutodeskInitialized = true;
            launchViewer(token);
        });
    } else {
        // Already initialized, just launch
        launchViewer(token);
    }
  };

  // React to URN changes
  useEffect(() => {
    initializeEngine();

    // Cleanup on unmount
    return () => {
      if (viewerRef.current) {
        viewerRef.current.finish();
        viewerRef.current = null;
      }
    };
  }, [urn]);

  useImperativeHandle(ref, () => ({
    captureScreenshot: () => {
      if (viewerRef.current) {
        // CRITICAL FIX: Return Base64 Data URL instead of Blob URL
        // Force a render frame to ensure it's fresh
        viewerRef.current.impl.invalidate(true, true, true);
        
        // Use the internal canvas to get the raw image data
        const canvas = viewerRef.current.canvas;
        if (canvas) {
            return canvas.toDataURL('image/jpeg', 0.8);
        }
      }
      return "";
    },
    setAngle: (angleName: string) => {
      if (!viewerRef.current) return;
      
      const nav = viewerRef.current.navigation;
      const target = nav.getTarget();
      
      switch (angleName) {
        case 'Top':
            nav.setView(new window.THREE.Vector3(0, 100, 0), target);
            break;
        case 'Front':
            nav.setView(new window.THREE.Vector3(0, 0, 100), target);
            break;
        case 'Left':
            nav.setView(new window.THREE.Vector3(-100, 0, 0), target);
            break;
        case 'Right':
        case 'Side': // Backward compatibility
            nav.setView(new window.THREE.Vector3(100, 0, 0), target);
            break;
        case 'Isometric':
        default:
            // Standard Isometric view
            nav.setView(new window.THREE.Vector3(100, 100, 100), target);
            break;
      }
    }
  }));

  return (
    <div className="w-full h-full bg-slate-800 rounded-lg overflow-hidden relative group border border-slate-700">
        <div ref={containerRef} className="w-full h-full relative z-0" />
        
        {error && (
             <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/90">
                <div className="p-6 bg-red-900/20 border border-red-600 rounded-xl max-w-md text-center">
                    <h3 className="text-red-500 font-bold text-lg mb-2">Viewer Error</h3>
                    <p className="text-red-200 text-sm">{error}</p>
                </div>
             </div>
        )}

        {!urn && !error && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-500 z-10">
                <div className="text-center p-4 bg-slate-900/80 rounded backdrop-blur-sm">
                    <p className="font-bold">No Model Selected</p>
                    <p className="text-xs">Select a model from the list to view.</p>
                </div>
            </div>
        )}
    </div>
  );
});

export default Viewer3D;