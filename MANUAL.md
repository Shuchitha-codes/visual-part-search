# 🚀 Deployment Manual: Visual Part Search System

This manual guides you through setting up the project from scratch on your local machine and deploying it to AWS.

## 🛠 Phase 1: Credential Gathering

Before writing code, gather these keys:

### 1. Autodesk Platform Services (APS)
1. Go to [aps.autodesk.com](https://aps.autodesk.com/).
2. Sign up/Log in.
3. Create an App (Select "Model Derivative API" and "Data Management API").
4. **Save:** `Client ID` and `Client Secret`.

### 2. Google Gemini API
1. Go to [aistudio.google.com](https://aistudio.google.com/).
2. Create an API Key.
3. **Save:** `API Key`.

### 3. Pinecone (Vector Database)
1. Go to [pinecone.io](https://www.pinecone.io/).
2. Create an Index:
   - **Name:** `parts-index`
   - **Dimensions:** `768`
   - **Metric:** `cosine`
   - **Cloud:** `AWS`, Region: `us-east-1` (Recommended).
3. **Save:** `API Key`.

---

## 💻 Phase 2: Local Setup & Model Registration

### 1. Install Dependencies
Open your terminal in the project root:
```bash
# Install Frontend dependencies
npm install

# Install Script dependencies (for uploading models)
npm install axios form-data
```

### 2. Get STEP Files
1. Go to [GrabCAD.com](https://grabcad.com/library) (or any CAD site).
2. Download .STEP or .STP files (e.g., piston.step, gear.stp).
3. **Create a folder named `models` in your project root.**
4. Put all your `.step` files inside the `models/` folder.

### 3. Run Batch Registration
We run a script to upload all files in the `models/` folder to Autodesk automatically.

1. Run the registration script:
   ```bash
   node scripts/register_model.js
   ```
2. Enter your **Autodesk Client ID** and **Secret** when prompted.
3. The script will upload every file, get their URNs, and save them to `registered_models.json`.
4. **Restart your React App** (if running) so it picks up the new JSON file.

---

## ☁️ Phase 3: AWS Deployment

### 1. Install Backend Dependencies
You must install dependencies for *each* Lambda function folder so AWS knows what to pack.

```bash
cd functions/auth
npm install
cd ../ingest
npm install
cd ../search
npm install
cd ../..  # Return to root
```

### 2. Deploy with SAM
Make sure you have AWS CLI and SAM CLI installed.

```bash
# Build the package
sam build

# Deploy
sam deploy --guided
```

### 3. Enter Parameters
The terminal will ask you for the keys you gathered in Phase 1:
- **Stack Name**: `visual-search-app`
- **GeminiApiKey**: `[Paste Google Key]`
- **PineconeApiKey**: `[Paste Pinecone Key]`
- **PineconeIndex**: `parts-index`
- **AutodeskId**: `[Paste Autodesk ID]`
- **AutodeskSecret**: `[Paste Autodesk Secret]`

### 4. Get API URL
When deployment finishes, AWS prints an **Outputs** section.
- Look for `ApiEndpoint`.
- Copy the URL (e.g., `https://xyz...amazonaws.com/Prod/`).

---

## 🔌 Phase 4: Connect Frontend

1. Create a file named `.env` in the root folder.
2. Add your API URL:
   ```
   REACT_APP_API_URL=https://YOUR_API_URL_FROM_PHASE_3.amazonaws.com/Prod
   ```
3. Start the app:
   ```bash
   npm start
   ```

---

## 🎮 Phase 5: Running the Demo

1. **Ingest (Admin)**:
   - Open the app in your browser.
   - Go to "Database Admin".
   - **Select a Model** from the dropdown menu (populated from your `models/` folder).
   - The Name and SKU will auto-fill (you can edit them).
   - Click **Capture & Index**.
   - *Repeat this for all your models.*

2. **Search (User)**:
   - Go to "Identify Part".
   - Upload an image of one of the parts.
   - The system will match it against the ones you indexed.