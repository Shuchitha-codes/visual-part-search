const axios = require('axios');
const qs = require('querystring');

exports.handler = async (event) => {
  const headers = { "Access-Control-Allow-Origin": "*" };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const { AUTODESK_CLIENT_ID, AUTODESK_CLIENT_SECRET } = process.env;

    const response = await axios.post(
      'https://developer.api.autodesk.com/authentication/v2/token',
      qs.stringify({
        client_id: AUTODESK_CLIENT_ID,
        client_secret: AUTODESK_CLIENT_SECRET,
        grant_type: 'client_credentials',
        scope: 'viewables:read'
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    return { statusCode: 200, headers, body: JSON.stringify(response.data) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Auth Failed" }) };
  }
};