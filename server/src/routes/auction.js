import { Router } from "express";
import { prisma } from "../prisma.js";

const router = Router();

// Same bid ladder the old keyboard UI used, now enforced server-side so the
// control dashboard and audience view always agree.
export const nextBidFor = (prevBid, basePrice) => {
  if (prevBid === 0) return basePrice;
  if (prevBid === 150) return prevBid + 10;
  if (prevBid < 100) return prevBid + 10;
  if (prevBid < 500) return prevBid + 20;
  return prevBid + 25;
};

const getOrCreateState = () =>
  prisma.auctionState.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, status: "IDLE", currentBid: 0, currentBidderTeamId: 0 },
  });

const log = (type, { playerId = null, teamId = null, amount = null, message = null } = {}) =>
  prisma.auctionLog.create({ data: { type, playerId, teamId, amount, message } });

// Enriched state payload: state + current player + bidding team, so both
// screens render with a single request.
const enrichedState = async () => {
  const state = await getOrCreateState();
  const [player, team] = await Promise.all([
    state.currentPlayerId
      ? prisma.player.findUnique({ where: { id: state.currentPlayerId } })
      : null,
    state.currentBidderTeamId > 0
      ? prisma.team.findUnique({ where: { id: state.currentBidderTeamId } })
      : null,
  ]);
  return { ...state, player, biddingTeam: team };
};

// GET /api/auction/state — live state for audience + control screens
router.get("/state", async (_req, res, next) => {
  try {
    res.json(await enrichedState());
  } catch (err) {
    next(err);
  }
});

// POST /api/auction/start { playerId? } — open bidding on a lot.
// Defaults to the first unsold player in the pool.
router.post("/start", async (req, res, next) => {
  try {
    let player = null;
    if (req.body?.playerId != null) {
      player = await prisma.player.findUnique({ where: { id: Number(req.body.playerId) } });
      if (!player) return res.status(404).json({ error: "Player not found" });
      if (player.soldToTeamId !== 0) {
        return res.status(400).json({ error: "Player is not in the unsold pool" });
      }
    } else {
      player = await prisma.player.findFirst({
        where: { soldToTeamId: 0 },
        orderBy: { id: "asc" },
      });
      if (!player) return res.status(400).json({ error: "No unsold players left" });
    }
    await prisma.auctionState.upsert({
      where: { id: 1 },
      update: { status: "BIDDING", currentPlayerId: player.id, currentBid: 0, currentBidderTeamId: 0 },
      create: { id: 1, status: "BIDDING", currentPlayerId: player.id, currentBid: 0, currentBidderTeamId: 0 },
    });
    await log("START", { playerId: player.id, message: `Bidding opened for ${player.playerName}` });
    res.json(await enrichedState());
  } catch (err) {
    next(err);
  }
});

// POST /api/auction/bid { teamId, amount? } — ladder bid for a team, or a
// custom bid when `amount` is given (must beat the current bid).
router.post("/bid", async (req, res, next) => {
  try {
    const teamId = Number(req.body?.teamId ?? req.body?.team_id);
    if (!Number.isInteger(teamId) || teamId <= 0) {
      return res.status(400).json({ error: "`teamId` must be a positive integer" });
    }
    const state = await getOrCreateState();
    if (state.status !== "BIDDING" || state.currentPlayerId == null) {
      return res.status(400).json({ error: "No active bidding. Start a lot first." });
    }
    const [player, team] = await Promise.all([
      prisma.player.findUnique({ where: { id: state.currentPlayerId } }),
      prisma.team.findUnique({ where: { id: teamId } }),
    ]);
    if (!player || player.soldToTeamId !== 0) {
      return res.status(400).json({ error: "Current player is no longer available" });
    }
    if (!team) return res.status(404).json({ error: "Team not found" });
    let bid;
    if (req.body?.amount != null && req.body.amount !== "") {
      bid = Number(req.body.amount);
      if (!Number.isInteger(bid) || bid <= 0) {
        return res.status(400).json({ error: "`amount` must be a positive whole number (Lakh)" });
      }
      if (bid < player.basePrice) {
        return res.status(400).json({ error: `Bid ₹${bid}L is below base price ₹${player.basePrice}L` });
      }
      if (bid <= state.currentBid) {
        return res.status(400).json({ error: `Bid ₹${bid}L must beat current ₹${state.currentBid}L` });
      }
    } else {
      bid = nextBidFor(state.currentBid, player.basePrice);
    }
    if (bid > team.purse) {
      return res.status(400).json({ error: `${team.teamName} purse (₹${team.purse}L) too low for ₹${bid}L bid` });
    }
    await prisma.auctionState.update({
      where: { id: 1 },
      data: { currentBid: bid, currentBidderTeamId: teamId },
    });
    await log("BID", {
      playerId: player.id,
      teamId,
      amount: bid,
      message: `${team.teamName} bid ₹${bid}L for ${player.playerName}`,
    });
    res.json(await enrichedState());
  } catch (err) {
    next(err);
  }
});

// POST /api/auction/sold — hammer down: persist sale + deduct purse.
router.post("/sold", async (_req, res, next) => {
  try {
    const state = await getOrCreateState();
    if (state.status !== "BIDDING" || state.currentPlayerId == null) {
      return res.status(400).json({ error: "No active bidding to close" });
    }
    if (state.currentBid <= 0 || state.currentBidderTeamId <= 0) {
      return res.status(400).json({ error: "No bids placed yet" });
    }
    const [player, team] = await Promise.all([
      prisma.player.findUnique({ where: { id: state.currentPlayerId } }),
      prisma.team.findUnique({ where: { id: state.currentBidderTeamId } }),
    ]);
    if (!player || player.soldToTeamId !== 0) {
      return res.status(400).json({ error: "Current player is no longer available" });
    }
    if (!team) return res.status(404).json({ error: "Bidding team not found" });
    if (team.purse < state.currentBid) {
      return res.status(400).json({ error: `${team.teamName} purse too low for final bid` });
    }
    const now = new Date();
    await prisma.$transaction([
      prisma.player.update({
        where: { id: player.id },
        data: {
          finalPrice: state.currentBid,
          soldToTeamId: team.id,
          soldToTeam: team.teamName,
          timeOfSelling: now,
        },
      }),
      prisma.team.update({ where: { id: team.id }, data: { purse: team.purse - state.currentBid } }),
      prisma.auctionState.update({ where: { id: 1 }, data: { status: "SOLD" } }),
    ]);
    await log("SOLD", {
      playerId: player.id,
      teamId: team.id,
      amount: state.currentBid,
      message: `${player.playerName} SOLD to ${team.teamName} for ₹${state.currentBid}L`,
    });
    res.json(await enrichedState());
  } catch (err) {
    next(err);
  }
});

// POST /api/auction/unsold — pass on the current lot.
router.post("/unsold", async (_req, res, next) => {
  try {
    const state = await getOrCreateState();
    if (state.currentPlayerId == null) {
      return res.status(400).json({ error: "No current player" });
    }
    const player = await prisma.player.findUnique({ where: { id: state.currentPlayerId } });
    if (player && player.soldToTeamId === 0) {
      await prisma.player.update({
        where: { id: player.id },
        data: {
          finalPrice: 0,
          soldToTeamId: -1,
          soldToTeam: null,
          timeOfSelling: new Date("2000-01-01"),
        },
      });
    }
    await prisma.auctionState.update({
      where: { id: 1 },
      data: { status: "IDLE", currentPlayerId: null, currentBid: 0, currentBidderTeamId: 0 },
    });
    await log("UNSOLD", {
      playerId: state.currentPlayerId,
      message: `${player?.playerName ?? "Player"} went UNSOLD`,
    });
    res.json(await enrichedState());
  } catch (err) {
    next(err);
  }
});

// POST /api/auction/next — clear the desk after a SOLD lot.
router.post("/next", async (_req, res, next) => {
  try {
    await prisma.auctionState.update({
      where: { id: 1 },
      data: { status: "IDLE", currentPlayerId: null, currentBid: 0, currentBidderTeamId: 0 },
    });
    await log("NEXT", { message: "Moved to next lot" });
    res.json(await enrichedState());
  } catch (err) {
    if (err?.code === "P2025") {
      await prisma.auctionState.create({ data: { id: 1, status: "IDLE" } });
      return res.json(await enrichedState());
    }
    next(err);
  }
});

// POST /api/auction/reset-sale { playerId } — undo a sale: player returns to
// the pool, purse refunded. Powers the dashboard's "Reset sale" action.
router.post("/reset-sale", async (req, res, next) => {
  try {
    const playerId = Number(req.body?.playerId);
    if (!Number.isInteger(playerId)) return res.status(400).json({ error: "`playerId` required" });
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) return res.status(404).json({ error: "Player not found" });
    if (player.soldToTeamId <= 0) {
      return res.status(400).json({ error: "Player is not sold" });
    }
    const team = await prisma.team.findUnique({ where: { id: player.soldToTeamId } });
    await prisma.$transaction([
      prisma.player.update({
        where: { id: player.id },
        data: {
          finalPrice: 0,
          soldToTeamId: 0,
          soldToTeam: null,
          timeOfSelling: new Date("2000-01-01"),
        },
      }),
      ...(team
        ? [prisma.team.update({ where: { id: team.id }, data: { purse: team.purse + player.finalPrice } })]
        : []),
    ]);
    const state = await getOrCreateState();
    if (state.currentPlayerId === player.id) {
      await prisma.auctionState.update({
        where: { id: 1 },
        data: { status: "IDLE", currentPlayerId: null, currentBid: 0, currentBidderTeamId: 0 },
      });
    }
    await log("RESET_SALE", {
      playerId: player.id,
      teamId: team?.id ?? null,
      amount: player.finalPrice,
      message: `Sale reset: ${player.playerName} back to pool, ₹${player.finalPrice}L refunded to ${team?.teamName ?? "team"}`,
    });
    res.json(await enrichedState());
  } catch (err) {
    next(err);
  }
});

// GET /api/auction/logs?limit=100 — dashboard Logs view.
router.get("/logs", async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit ?? 100) || 100, 1), 500);
    const logs = await prisma.auctionLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// GET /api/auction/sales — dashboard Sales view (latest first).
router.get("/sales", async (_req, res, next) => {
  try {
    const sales = await prisma.player.findMany({
      where: { soldToTeamId: { gt: 0 } },
      orderBy: { timeOfSelling: "desc" },
    });
    res.json(sales);
  } catch (err) {
    next(err);
  }
});

export default router;
