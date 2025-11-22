import axios from 'axios';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ask = (question) => new Promise(resolve => rl.question(question, resolve));

async function main() {
    console.log("\n--- ⚠️  PINECONE DATABASE RESET ⚠️  ---\n");
    console.log("This will DELETE ALL vectors in your Pinecone Index.");
    console.log("This action cannot be undone.\n");

    const apiKey = await ask("Enter Pinecone API Key: ");
    const indexHost = await ask("Enter Pinecone Index Host (e.g., https://parts-index-xyz.svc.pinecone.io): ");

    if (!apiKey || !indexHost) {
        console.error("Missing credentials.");
        process.exit(1);
    }

    // Remove trailing slash if present
    const host = indexHost.replace(/\/$/, "");

    try {
        console.log("\nSending delete command...");
        
        const response = await axios.post(
            `${host}/vectors/delete`,
            { deleteAll: true },
            {
                headers: {
                    'Api-Key': apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log("\n✅ Success! Database cleared.");
        console.log("Response:", JSON.stringify(response.data));

    } catch (error) {
        console.error("\n❌ Error resetting database:");
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    } finally {
        rl.close();
    }
}

main();