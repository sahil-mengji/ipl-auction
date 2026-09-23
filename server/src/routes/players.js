import { Router } from "express";
import { prisma } from "../prisma.js";

const router = Router();

const pick = (obj, keys) => {
  for (const k of keys) {
    if (obj?.[k] !== undefined) return obj[k];
  }
  return undefined;
};

// GET /api/players?status=unsold|sold|all — matches fetchUnsoldPlayers / fetcnsoldPlayers
router.get("/", async (req, res, next) => {
  try {
    const status = String(req.query.status ?? "all").toLowerCase();
    const where =
      status === "unsold"
        ? { soldToTeamId: 0 }
        : status === "sold"
          ? { soldToTeamId: { notIn: [0, -1] } }
          : {};
    const players = await prisma.player.findMany({ where, orderBy: { id: "asc" } });
    res.json(players);
  } catch (err) {
    next(err);
  }
});

// GET /api/players/expensive — most expensive sold player (matches fetchExpensivePlayer)
// NOTE: must be registered before `/:id`.
router.get("/expensive", async (_req, res, next) => {
  try {
    const players = await prisma.player.findMany({
      where: { soldToTeamId: { gt: 0 } },
      orderBy: { finalPrice: "desc" },
      take: 1,
    });
    res.json(players);
  } catch (err) {
    next(err);
  }
});

// GET /api/players/last-sold — most recently sold player (matches fetchPrevPlayer)
router.get("/last-sold", async (_req, res, next) => {
  try {
    const players = await prisma.player.findMany({
      where: { soldToTeamId: { gt: 0 } },
      orderBy: { timeOfSelling: "desc" },
      take: 1,
    });
    res.json(players);
  } catch (err) {
    next(err);
  }
});

// GET /api/players/:id — single player
router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid player id" });
    const player = await prisma.player.findUnique({ where: { id } });
    if (!player) return res.status(404).json({ error: "Player not found" });
    res.json(player);
  } catch (err) {
    next(err);
  }
});

// POST /api/players — create (parity with insertSupabaseData)
router.post("/", async (req, res, next) => {
  try {
    const b = req.body ?? {};
    const player = await prisma.player.create({
      data: {
        playerName: pick(b, ["playerName", "player_name"]),
        playerImage: pick(b, ["playerImage", "player_image"]) ?? null,
        basePrice: pick(b, ["basePrice", "base_price"]) ?? 0,
        finalPrice: pick(b, ["finalPrice", "final_price"]) ?? 0,
        soldToTeamId: pick(b, ["soldToTeamId", "sold_to_team_id"]) ?? 0,
        soldToTeam: pick(b, ["soldToTeam", "sold_to_team"]) ?? null,
        timeOfSelling: pick(b, ["timeOfSelling", "time_of_selling"])
          ? new Date(pick(b, ["timeOfSelling", "time_of_selling"]))
          : null,
        category: b.category ?? null,
        isOverseas: pick(b, ["isOverseas", "is_overseas"]) ?? false,
        matches: b.matches ?? 0,
        runs: b.runs ?? 0,
        batAvg: pick(b, ["batAvg", "bat_avg"]) ?? null,
        sr: b.sr ?? null,
        catches: b.catches ?? 0,
        stumpings: b.stumpings ?? 0,
        wickets: b.wickets ?? 0,
        bowlAvg: pick(b, ["bowlAvg", "bowl_avg"]) ?? null,
        eco: b.eco ?? null,
      },
    });
    res.status(201).json(player);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/players/:id/sold — mark sold/unsold (matches markPlayerAsSold)
// Body accepts camelCase or snake_case:
//   { finalPrice|final_price, soldToTeamId|sold_to_team_id, soldToTeam|sold_to_team }
// Unsold: { finalPrice: 0, soldToTeamId: -1, soldToTeam: null }
router.patch("/:id/sold", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid player id" });
    const b = req.body ?? {};
    const finalPrice = pick(b, ["finalPrice", "final_price"]);
    const soldToTeamId = pick(b, ["soldToTeamId", "sold_to_team_id"]);
    const hasSoldToTeam = b.soldToTeam !== undefined || b.sold_to_team !== undefined;
    const soldToTeam = hasSoldToTeam ? pick(b, ["soldToTeam", "sold_to_team"]) : undefined;

    if (finalPrice === undefined || soldToTeamId === undefined) {
      return res
        .status(400)
        .json({ error: "Body must include finalPrice and soldToTeamId (snake_case also accepted)" });
    }

    const player = await prisma.player.update({
      where: { id },
      data: {
        finalPrice,
        soldToTeamId,
        ...(hasSoldToTeam ? { soldToTeam } : {}),
        timeOfSelling: finalPrice === 0 ? new Date("2000-01-01") : new Date(),
      },
    });
    res.json(player);
  } catch (err) {
    if (err?.code === "P2025") return res.status(404).json({ error: "Player not found" });
    next(err);
  }
});

export default router;
