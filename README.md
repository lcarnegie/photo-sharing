# PicLink

An anonymous photo-sharing web application. Vibe coded it with Google Antigravity.

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
