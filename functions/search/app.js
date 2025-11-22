const { GoogleGenAI } = require("@google/genai");
const { Pinecone } = require("@pinecone-database/pinecone");

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: '' };

  try {
    const body = JSON.parse(event.body);
    const cleanImage = body.imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index(process.env.PINECONE_INDEX);

    const visionResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: cleanImage } }, { text: "Describe this mechanical part for search." }] }
    });
    const description = visionResponse.text;

    const embedResponse = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: description
    });
    const vector = embedResponse.embeddings[0].values;

    const searchResults = await index.query({
      vector: vector,
      topK: 3,
      includeMetadata: true
    });

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ matches: searchResults.matches })
    };
  } catch (error) {
    return { statusCode: 500, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: error.message }) };
  }
};