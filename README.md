# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Backend (Express + Prisma + Postgres)

A Node.js backend lives in [`./server`](./server/README.md). It mirrors the
Supabase tables (`Teams`, `CricketPlayers`) with Prisma + Postgres and exposes
the REST API the UI consumes.

```bash
cd server && cp .env.example .env && npm install
docker compose up -d
npx prisma migrate deploy && npm run db:seed
npm run dev   # http://localhost:4000
```

Point the frontend at it via `.env` (see [`.env.example`](./.env.example)):

```bash
VITE_DUMMY_MODE=false
VITE_DATA_SOURCE=backend
VITE_API_URL=http://localhost:4000
```

Data-source precedence: `VITE_DUMMY_MODE=true` (local dummy) → `VITE_DATA_SOURCE=backend` (this API) → Supabase (legacy default).
