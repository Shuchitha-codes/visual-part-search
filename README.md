Visual Part Search – Prototype

This project is a lightweight prototype of a Visual Part Search System — a tool that lets users upload a photo of a machine part and instantly find the closest matching 3D component. Think of it as the smallest possible version of:

Snap → Search → Identify Part

The goal was to demonstrate systems thinking, API learning speed, and a clear approach to combining 3D rendering, AI vision models, and vector search.

🏗 Architecture Overview

The system is built with a modern, minimal, serverless-first architecture:

Frontend: React (Vite) + Tailwind CSS

3D Viewer: Autodesk Platform Services (APS)

Backend: AWS API Gateway + Lambda (SAM deployment)

AI/ML:

Vision model: Gemini 2.5 Flash (Image-to-Text)

Text embeddings: Google Text-Embedding-004

Vector DB: Pinecone

No servers to manage — everything runs on-demand.

✨ Features

Autodesk Viewer integration to load and explore 3D models

Programmatic 2D snapshot generation from consistent angles

AI-generated part descriptions from images

Vector embedding generation and storage

Vector search using Pinecone for similarity matching

Simple UI where a user uploads an image and receives the closest match

Fully serverless backend with secure token handling

🧠 Approach
1. Ingestion – Teaching the System

The system rotates a 3D model inside the browser and automatically captures five standard views: front, top, iso, left, right

Each view is run through a vision model for a natural-language description, converted to vector embeddings, and stored in Pinecone.

2. Search – Finding the Part

When a user uploads an image, the same process runs:

Generate an AI description

Convert to embeddings

Search Pinecone for nearest neighbors

Return the closest matching part

This keeps the ingestion and search pipelines symmetrical.


🚧 Challenges & How They Were Solved
🧩 Type Mismatch Crashing the Frontend

Issue: Pinecone’s raw responses didn't match strict TypeScript interfaces.
Solution: Added a transformation layer in the API service to normalize backend responses before sending them to the UI.

🔐 Autodesk Tokens Expiring Frequently

Issue: APS requires short-lived access tokens.
Solution: Created an AWS Lambda /auth/token endpoint to fetch fresh tokens securely, without exposing secrets on the client.


Bonus future implementation

If expanded into a production-scale system:

1. Asynchronous Ingestion Pipeline

Instead of running ingestion in the browser, CAD files would be uploaded to S3, triggering an SQS + Lambda pipeline that:

Renders snapshots

Generates descriptions

Creates embeddings

Stores metadata

All fully async and fault-tolerant.

2. Hybrid Data Storage

Vectors: Pinecone

Metadata: DynamoDB or PostgreSQL
This reduces cost and improves query flexibility.

3. Metadata-Based Pre-Filtering

Before vector search, filter candidates by part category to reduce search space and speed up queries.

📱 Mobile UX for Field Technicians

To make the tool practical for on-site usage:

PWA support for offline-first behavior

Direct camera capture using capture="environment"

Offline caching of recent or commonly used parts

Touch-friendly UI layout