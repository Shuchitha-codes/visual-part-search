const { GoogleGenAI } = require("@google/genai");
const { Pinecone } = require("@pinecone-database/pinecone");

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: '' };

  try {
    const body = JSON.parse(event.body);
    const { imageBase64, partName, modelName, partSku, angle, category } = body;
    const cleanImage = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index(process.env.PINECONE_INDEX);

    const visionResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: cleanImage } }, { text: "Describe this mechanical part concisely." }] }
    });
    const description = visionResponse.text;

    const embedResponse = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: description
    });
    const vector = embedResponse.embeddings[0].values;

    const uniqueId = `${partSku}-${angle}-${Date.now()}`;
    await index.upsert([{
      id: uniqueId,
      values: vector,
      metadata: { name: partName, modelName: modelName, sku: partSku, category, angle, description: description.substring(0, 500) }
    }]);

    return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ success: true, id: uniqueId }) };
  } catch (error) {
    return { statusCode: 500, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: error.message }) };
  }
};