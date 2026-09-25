import { Router } from "express";
import { prisma } from "../prisma.js";

const router = Router();

// GET /api/teams-with-squads — aggregated view (matches fetchTeamsWithSquads).
// Response shape mirrors the frontend mapper:
// [{ team_id, name, playerCount, purse, teamLogo, textColor, squad: [{id, name, role, isOverseas, price}], color1, color2 }]
router.get("/", async (_req, res, next) => {
  try {
    const [teams, players] = await Promise.all([
      prisma.team.findMany({ orderBy: { id: "asc" } }),
      prisma.player.findMany(),
    ]);
    const teamsWithSquads = teams
      .map((team) => {
        const squad = players.filter((p) => p.soldToTeamId === team.id);
        return {
          team_id: team.id,
          name: team.teamName,
          playerCount: squad.length,
          purse: team.purse,
          teamLogo: team.teamLogo,
          textColor: team.textColor,
          squad: squad.map((p) => ({
            id: p.id,
            name: p.playerName,
            role: p.category,
            isOverseas: p.isOverseas,
            price: p.finalPrice ?? 0,
          })),
          color1: team.color1,
          color2: team.color2,
        };
      })
      .sort((a, b) => a.team_id - b.team_id);
    res.json(teamsWithSquads);
  } catch (err) {
    next(err);
  }
});

export default router;
