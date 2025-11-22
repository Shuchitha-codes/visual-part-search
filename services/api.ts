import { PartRecord, SearchResult } from '../types';

/**
 * CLIENT SIDE API SERVICE
 * Interacts with AWS API Gateway.
 */

const API_BASE_URL = process.env.REACT_APP_API_URL;

// Debugging Log
console.log("[API] Loaded Config. API URL:", API_BASE_URL || "UNDEFINED (Check .env)");

if (!API_BASE_URL) {
    console.error("[API] CRITICAL ERROR: REACT_APP_API_URL is not defined.");
    console.error("[API] Please create a .env file in the root directory with: REACT_APP_API_URL=https://...");
}

export const getForgeToken = async (): Promise<string> => {
  try {
    if (!API_BASE_URL) return "";
    
    const res = await fetch(`${API_BASE_URL}/auth/token`);
    if (!res.ok) throw new Error(`Auth Error: ${res.statusText}`);
    const data = await res.json();
    return data.access_token;
  } catch (e: any) {
    console.error("Failed to get forge token:", e.message);
    return "";
  }
};

export const ingestPart = async (
  part: { name: string; sku: string; category: string },
  image: string,
  angle: string
) => {
    if (!API_BASE_URL) throw new Error("API URL missing.");

    const res = await fetch(`${API_BASE_URL}/parts/ingest`, {
        method: 'POST',
        body: JSON.stringify({
            imageBase64: image,
            partName: part.name,
            partSku: part.sku,
            category: part.category,
            angle: angle
        })
    });
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Ingest Failed: ${err}`);
    }
    return res.json();
};

export const searchPartImage = async (image: string): Promise<SearchResult[]> => {
    if (!API_BASE_URL) throw new Error("API URL missing.");

    const res = await fetch(`${API_BASE_URL}/parts/search`, {
        method: 'POST',
        body: JSON.stringify({ imageBase64: image })
    });
    
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Search Failed: ${err}`);
    }
    
    const data = await res.json();
    
    // Transform Pinecone matches to SearchResult type to avoid UI crashes
    if (!data.matches || !Array.isArray(data.matches)) return [];

    return data.matches.map((match: any) => {
        const meta = match.metadata || {};
        
        return {
            score: match.score,
            part: {
                id: match.id,
                name: meta.name || "Unknown Part",
                modelName: meta.modelName || "Unknown Model",
                sku: meta.sku || "Unknown SKU",
                description: meta.description || "No description available.",
                category: meta.category || "Uncategorized",
                views: [] // Search results don't return full view history
            },
            matchedView: {
                id: match.id,
                angleName: meta.angle || "Unknown View",
                imageUrl: "", // Image URL is not returned by search
                embedding: []
            }
        };
    });
};