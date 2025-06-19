# Front-end

A simple static page that lists and lets you test the API routes for the auth and game services.

## Prerequisites

- Node.js >= 16

## How to run (development)

1. Make sure the backend services are running:
   - Auth Service at http://localhost:3000
   - Game Service at http://localhost:3001

2. In a new terminal, install dependencies and start the front-end:
   ```bash
   cd srcs/frontend
   npm install
   npm run dev
   ```

   This will launch a Vite dev server on http://localhost:4000 and open it automatically.

## Build for production

```bash
cd srcs/frontend
npm run build
npm run preview
```