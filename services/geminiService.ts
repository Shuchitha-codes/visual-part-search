
import { GoogleGenAI, Type } from "@google/genai";

/**
 * SERVICE LAYER: Gemini AI Integration
 * ------------------------------------------------------------------
 * In a production Architecture (AWS), this file would not exist on the Frontend.
 * Instead, the Frontend would call an AWS API Gateway endpoint (e.g., POST /analyze-image).
 * That API Gateway would trigger an AWS Lambda function running Node.js or Python.
 * The Lambda function would hold the API_KEY securely and call Google GenAI.
 * 
 * For this PROTOTYPE, we run it client-side to demonstrate functionality immediately.
 */

// Helper to strip base64 prefix for the API call
const cleanBase64 = (dataUrl: string) => {
  return dataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
};

/**
 * VISION MODEL INTERFACE
 * Uses Gemini 2.5 Flash to "look" at the 2D render of the 3D model.
 * It converts visual features (geometry, texture) into natural language.
 */
export const generatePartDescription = async (base64Image: string): Promise<string> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key found, returning mock description");
    return "A mock description of a mechanical car part due to missing API key. It features a cylindrical metallic structure.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64(base64Image)
            }
          },
          {
            text: "Analyze this automotive mechanical part. Provide a highly detailed technical description focusing on geometry, bolt patterns, surfaces, and distinctive features. Be concise."
          }
        ]
      }
    });
    
    return response.text || "No description generated.";
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    throw error;
  }
};

/**
 * EMBEDDING MODEL INTERFACE
 * Converts the natural language description into a Vector (list of numbers).
 * This vector is what gets stored in Pinecone/Milvus.
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
  if (!process.env.API_KEY) {
    // Fallback: Return a random vector for testing UI if no key is present
    // In production, this would throw a 500 error
    return Array.from({ length: 768 }, () => Math.random());
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: text
    });

    if (response.embeddings && response.embeddings.length > 0) {
      return response.embeddings[0].values;
    }
    return [];
  } catch (error) {
    console.error("Gemini Embedding Error:", error);
    throw error;
  }
};
