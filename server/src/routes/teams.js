import { Router } from "express";
import { prisma } from "../prisma.js";

const router = Router();

// GET /api/teams — all teams ordered by id (matches fetchSupabaseData('Teams'))
router.get("/", async (_req, res, next) => {
  try {
    const teams = await prisma.team.findMany({ orderBy: { id: "asc" } });
    res.json(teams);
  } catch (err) {
    next(err);
  }
});

// GET /api/teams/:id — single team (matches getTeamFromTeamID)
router.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid team id" });
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) return res.status(404).json({ error: "Team not found" });
    // Frontend expects an array ([0]) from Supabase — return the object;
    // the frontend adapter normalises both shapes.
    res.json(team);
  } catch (err) {
    next(err);
  }
});

// POST /api/teams — create (parity with insertSupabaseData)
router.post("/", async (req, res, next) => {
  try {
    const { team_name, teamName, purse, team_logo, teamLogo, text_color, textColor, color1, color2 } =
      req.body ?? {};
    const team = await prisma.team.create({
      data: {
        teamName: teamName ?? team_name,
        purse: purse ?? 0,
        teamLogo: teamLogo ?? team_logo ?? null,
        textColor: textColor ?? text_color ?? null,
        color1: color1 ?? null,
        color2: color2 ?? null,
      },
    });
    res.status(201).json(team);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/teams/:id/purse — update purse (matches updatePurseOfTeam)
router.patch("/:id/purse", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const purse = req.body?.purse ?? req.body?.new_purse;
    if (!Number.isInteger(id)) return res.status(400).json({ error: "Invalid team id" });
    if (typeof purse !== "number" || Number.isNaN(purse)) {
      return res.status(400).json({ error: "`purse` must be a number" });
    }
    const team = await prisma.team.update({ where: { id }, data: { purse } });
    res.json(team);
  } catch (err) {
    if (err?.code === "P2025") return res.status(404).json({ error: "Team not found" });
    next(err);
  }
});

export default router;
