import "dotenv/config";
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import teamsRouter from "./routes/teams.js";
import playersRouter from "./routes/players.js";
import squadsRouter from "./routes/squads.js";
import auctionRouter from "./routes/auction.js";
import { prisma } from "./prisma.js";
import { initSocket } from "./socket.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

const corsOrigin = (process.env.CORS_ORIGIN ?? "*").split(",").map((s) => s.trim());
app.use(cors({ origin: corsOrigin.includes("*") ? "*" : corsOrigin }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "iplauction-server", time: new Date().toISOString() });
});

// DB-aware health for the control center: connectivity + row counts.
// Reuses the shared prisma instance (no extra pool pressure).
app.get("/api/health/db", async (_req, res) => {
  const started = Date.now();
  try {
    const [ping, teams, players, logs, prefs] = await Promise.all([
      prisma.$queryRaw`SELECT 1 AS ok`,
      prisma.team.count(),
      prisma.player.count(),
      prisma.auctionLog.count(),
      prisma.displayPref.count(),
    ]);
    res.json({
      ok: true,
      latencyMs: Date.now() - started,
      database: Array.isArray(ping) ? "reachable" : "unknown",
      teams,
      players,
      logs,
      displayPrefs: prefs,
      time: new Date().toISOString(),
    });
  } catch (e) {
    res.status(503).json({ ok: false, error: e.message });
  }
});

app.use("/api/teams", teamsRouter);
app.use("/api/players", playersRouter);
app.use("/api/teams-with-squads", squadsRouter);
app.use("/api/auction", auctionRouter);

// 404 for unknown API routes
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Static frontend (repo-root dist/, built by `npm run build`) + SPA fallback.
// API + socket.io live on the same origin, so no CORS config is needed.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "..", "..", "dist");
app.use(express.static(distDir));
app.get(/^\/(?!api).*/, (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

// Central error handler — always JSON so the frontend can rely on shape
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err?.status ?? 500;
  res.status(status).json({ error: err?.message ?? "Internal server error" });
});

const httpServer = createServer(app);
initSocket(httpServer, corsOrigin);

httpServer.listen(PORT, () => {
  console.log(`iplauction-server listening on http://localhost:${PORT}`);
});

export default app;
