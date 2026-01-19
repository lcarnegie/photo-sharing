# piqlinq

A room-based photo-sharing web application based on SvelteKit and MS Azure Blob Storage as the photo storage backend. Vibe coded with Google Antigravity. Might not maintain it long term but if you find it useful I could!

## Features
- **Anonymous Uploads**: No login required.
- **Auto-Expiry**: Photos deleted after 7 days.
- **Tech Stack**: SvelteKit, Azure Blob Storage, Azure Table Storage.

## Setup

```bash
npm install
npm run dev
```

## Configuration
All environment variables are optional for local development (**Mock Mode** enabled by default).

- `AZURE_STORAGE_CONNECTION_STRING`: Set this in `.env` to connect to real Azure services.
