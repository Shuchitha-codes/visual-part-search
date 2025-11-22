import axios from 'axios';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

// Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * BATCH REGISTRATION SCRIPT
 * 1. Scans the 'models' folder for .step/.stp files.
 * 2. Uploads them to Autodesk (using Signed S3 Flow).
 * 3. Triggers translation.
 * 4. Saves the list of Name + URN to 'public/registered_models.json'.
 */

const MODELS_DIR = path.join(__dirname, '../models');
// CHANGE: Save to public folder so frontend can fetch it easily
const REGISTRY_FILE = path.join(__dirname, '../public/registered_models.json');
const PUBLIC_DIR = path.join(__dirname, '../public');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ask = (question) => new Promise(resolve => rl.question(question, resolve));

async function main() {
    console.log("\n--- BATCH MODEL REGISTRATION ---\n");

    // 0. Ensure directories exist
    if (!fs.existsSync(MODELS_DIR)) {
        fs.mkdirSync(MODELS_DIR);
        console.log(`Created 'models' folder at: ${MODELS_DIR}`);
        console.log("❌ Please put your .STEP files in the 'models' folder and run this script again.");
        process.exit(0);
    }
    if (!fs.existsSync(PUBLIC_DIR)) {
        fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    }

    // 1. Get Files
    const files = fs.readdirSync(MODELS_DIR).filter(f => f.toLowerCase().endsWith('.step') || f.toLowerCase().endsWith('.stp'));
    
    if (files.length === 0) {
        console.log(`❌ No .step or .stp files found in: ${MODELS_DIR}`);
        console.log("Please add files and run again.");
        process.exit(0);
    }

    console.log(`Found ${files.length} files to process:`);
    files.forEach(f => console.log(` - ${f}`));

    // 2. Get Credentials
    console.log("\n--- CREDENTIALS ---");
    const clientId = await ask("Enter Autodesk Client ID: ");
    const clientSecret = await ask("Enter Autodesk Client Secret: ");

    try {
        // 3. Authenticate
        console.log("\nAuthenticating...");
        const authRes = await axios.post(
            'https://developer.api.autodesk.com/authentication/v2/token',
            new URLSearchParams({
                client_id: clientId.trim(),
                client_secret: clientSecret.trim(),
                grant_type: 'client_credentials',
                scope: 'data:read data:write data:create bucket:create bucket:read'
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
        const token = authRes.data.access_token;

        // 4. Create Bucket
        const bucketKey = 'visual_search_demo_' + Math.floor(Math.random() * 100000).toString();
        console.log(`Creating Bucket: ${bucketKey}...`);
        try {
            await axios.post(
                'https://developer.api.autodesk.com/oss/v2/buckets',
                { bucketKey: bucketKey, policyKey: 'transient' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (e) {
            if (e.response && e.response.status !== 409) throw e; // 409 means exists, which is fine
        }

        const registeredModels = [];

        // 5. Process Each File
        for (const filename of files) {
            console.log(`\nProcessing: ${filename}...`);
            const filePath = path.join(MODELS_DIR, filename);
            const fileBuffer = fs.readFileSync(filePath);

            // --- STEP 5A: Get Signed Upload URL (Fixes 403 Error) ---
            console.log(` > Getting Signed URL...`);
            const signedUrlRes = await axios.get(
                `https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/objects/${filename}/signeds3upload`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const { uploadKey, urls } = signedUrlRes.data;
            const uploadUrl = urls[0];

            // --- STEP 5B: Upload Binary to Signed URL ---
            console.log(` > Uploading Binary...`);
            await axios.put(uploadUrl, fileBuffer, {
                headers: { 'Content-Type': 'application/octet-stream' }
            });

            // --- STEP 5C: Complete Upload ---
            console.log(` > Finalizing Upload...`);
            const completeRes = await axios.post(
                `https://developer.api.autodesk.com/oss/v2/buckets/${bucketKey}/objects/${filename}/signeds3upload`,
                { uploadKey: uploadKey },
                { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
            );
            
            // The objectId is returned in the completion response
            const objectId = completeRes.data.objectId;
            const urn = Buffer.from(objectId).toString('base64');
            console.log(` > URN Generated: ${urn.substring(0, 20)}...`);

            // --- STEP 5D: Trigger Translation ---
            console.log(" > Triggering Translation...");
            await axios.post(
                'https://developer.api.autodesk.com/modelderivative/v2/designdata/job',
                {
                    input: { urn: urn },
                    output: { formats: [{ type: 'svf', views: ['2d', '3d'] }] }
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            registeredModels.push({
                name: filename,
                urn: urn,
                timestamp: new Date().toISOString()
            });
        }

        // 6. Save Registry
        fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registeredModels, null, 2));

        console.log("\n--------------------------------------------------");
        console.log("✅ BATCH COMPLETE");
        console.log(`Processed ${registeredModels.length} models.`);
        console.log(`Registry saved to: public/registered_models.json`);
        console.log("--------------------------------------------------");
        console.log("Refresh your web page to see the new models.");

    } catch (error) {
        console.error("\n❌ Error:", error.message);
        if (error.response) console.error("API Response:", JSON.stringify(error.response.data, null, 2));
    } finally {
        rl.close();
    }
}

main();