/**
 * DEPRECATED
 * 
 * This local vector engine is no longer used.
 * The application now relies on the AWS Lambda Backend connected to Pinecone
 * for all vector search operations.
 * 
 * See: functions/search/app.js
 */

export const searchParts = () => {
    console.warn("Local search is deprecated. Use API search.");
    return [];
};