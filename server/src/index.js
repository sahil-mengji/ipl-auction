import "dotenv/config";
import express from "express";
import cors from "cors";
import teamsRouter from "./routes/teams.js";
import playersRouter from "./routes/players.js";
import squadsRouter from "./routes/squads.js";
import auctionRouter from "./routes/auction.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

const corsOrigin = (process.env.CORS_ORIGIN ?? "*").split(",").map((s) => s.trim());
app.use(cors({ origin: corsOrigin.includes("*") ? "*" : corsOrigin }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "iplauction-server", time: new Date().toISOString() });
});

app.use("/api/teams", teamsRouter);
app.use("/api/players", playersRouter);
app.use("/api/teams-with-squads", squadsRouter);
app.use("/api/auction", auctionRouter);

// 404 for unknown API routes
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Central error handler — always JSON so the frontend can rely on shape
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err?.status ?? 500;
  res.status(status).json({ error: err?.message ?? "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`iplauction-server listening on http://localhost:${PORT}`);
});

export default app;
