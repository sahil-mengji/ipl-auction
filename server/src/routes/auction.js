import { Router } from "express";
import { prisma } from "../prisma.js";
import { broadcastInvalidate, broadcastState } from "../socket.js";

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

// Push the fresh state to every screen, then tell them which cached lists
// went stale (sales / logs / player queue / teams).
const changed = async (flags = {}) => {
  broadcastState(await enrichedState());
  broadcastInvalidate(flags);
};

// Next unsold player past the cursor (wraps to the top), skipping sold.
const findNextPlayer = async (cursor) =>
  (await prisma.player.findFirst({
    where: { soldToTeamId: { in: [0, -1] }, auctionOrder: { gt: cursor } },
    orderBy: [{ auctionOrder: "asc" }, { id: "asc" }],
  })) ??
  (await prisma.player.findFirst({
    where: { soldToTeamId: { in: [0, -1] } },
    orderBy: [{ auctionOrder: "asc" }, { id: "asc" }],
  }));

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
  const cursor = await getCursor();
  const nextPlayer = await findNextPlayer(cursor);
  return { ...state, player, biddingTeam: team, queueCursor: cursor, nextPlayer };
};

// GET /api/auction/state — live state for audience + control screens
router.get("/state", async (_req, res, next) => {
  try {
    res.json(await enrichedState());
  } catch (err) {
    next(err);
  }
});

// Queue cursor (DisplayPref "queueCursor"): the auctionOrder to continue
// after. Explicit starts park it there; auto-start picks the next unsold
// player past it (wrapping to the top), skipping sold players.
const getCursor = async () => {
  try {
    const row = await prisma.displayPref.findUnique({ where: { key: "queueCursor" } });
    const v = row ? Number(JSON.parse(row.value)) : -1;
    return Number.isFinite(v) ? v : -1;
  } catch {
    return -1;
  }
};
const setCursor = (order) =>
  prisma.displayPref
    .upsert({
      where: { key: "queueCursor" },
      update: { value: JSON.stringify(order ?? 0) },
      create: { key: "queueCursor", value: JSON.stringify(order ?? 0) },
    })
    .catch(() => {});

// POST /api/auction/start { playerId? } — open bidding on a lot.
// Defaults to the next unsold player past the cursor (wraps to the top).
router.post("/start", async (req, res, next) => {
  try {
    let player = null;
    if (req.body?.playerId != null) {
      player = await prisma.player.findUnique({ where: { id: Number(req.body.playerId) } });
      if (!player) return res.status(404).json({ error: "Player not found" });
      if (player.soldToTeamId > 0) {
        return res.status(400).json({ error: "Player is not in the unsold pool" });
      }
    } else {
      const cursor = await getCursor();
      player = await findNextPlayer(cursor);
      if (!player) return res.status(400).json({ error: "No unsold players left" });
    }
    await setCursor(player.auctionOrder);
    await prisma.auctionState.upsert({
      where: { id: 1 },
      update: { status: "BIDDING", currentPlayerId: player.id, currentBid: 0, currentBidderTeamId: 0 },
      create: { id: 1, status: "BIDDING", currentPlayerId: player.id, currentBid: 0, currentBidderTeamId: 0 },
    });
    await log("START", { playerId: player.id, message: `Bidding opened for ${player.playerName}` });
    await changed({ logs: true });
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
    if (!player || player.soldToTeamId > 0) {
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
    await changed({ logs: true });
    res.json(await enrichedState());
  } catch (err) {
    next(err);
  }
});

// POST /api/auction/undo-bid — retract the latest BID on the current lot:
// state falls back to the previous BID (or no bid if it was the first).
// Append-only: the retracted bid stays in the log, stamped with UNDO_BID.
router.post("/undo-bid", async (_req, res, next) => {
  try {
    const state = await getOrCreateState();
    if (state.status !== "BIDDING" || state.currentPlayerId == null) {
      return res.status(400).json({ error: "No active bidding to undo" });
    }
    const bids = await prisma.auctionLog.findMany({
      where: { type: "BID", playerId: state.currentPlayerId },
      orderBy: { id: "desc" },
      take: 2,
    });
    if (bids.length === 0) {
      return res.status(400).json({ error: "No bids to undo on this lot" });
    }
    const [undone, prev] = bids;
    await prisma.auctionState.update({
      where: { id: 1 },
      data: { currentBid: prev?.amount ?? 0, currentBidderTeamId: prev?.teamId ?? 0 },
    });
    const team = undone.teamId
      ? await prisma.team.findUnique({ where: { id: undone.teamId } })
      : null;
    await log("UNDO_BID", {
      playerId: state.currentPlayerId,
      teamId: undone.teamId,
      amount: undone.amount,
      message: `Undid ${team?.teamName ?? "team"}'s ₹${undone.amount}L bid`,
    });
    await changed({ logs: true });
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
    if (!player || player.soldToTeamId > 0) {
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
    await changed({ sales: true, logs: true, players: true, teams: true });
    res.json(await enrichedState());
  } catch (err) {
    next(err);
  }
});

// POST /api/auction/unsold — pass on the current lot. The player is sent
// to the back of the queue (auctionOrder = max + 1) for a second attempt.
router.post("/unsold", async (_req, res, next) => {
  try {
    const state = await getOrCreateState();
    if (state.currentPlayerId == null) {
      return res.status(400).json({ error: "No current player" });
    }
    const player = await prisma.player.findUnique({ where: { id: state.currentPlayerId } });
    if (player && player.soldToTeamId === 0) {
      const maxOrder = await prisma.player.aggregate({ _max: { auctionOrder: true } });
      await prisma.player.update({
        where: { id: player.id },
        data: {
          finalPrice: 0,
          soldToTeamId: -1,
          soldToTeam: null,
          timeOfSelling: new Date("2000-01-01"),
          auctionOrder: (maxOrder._max.auctionOrder ?? 0) + 1,
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
    await changed({ logs: true, players: true });
    res.json(await enrichedState());
  } catch (err) {
    next(err);
  }
});

// POST /api/auction/reorder { playerId, direction: "up" | "down" } — move a
// queued (unsold pool / passed) player one slot, swapping auctionOrder with
// the adjacent queued player.
router.post("/reorder", async (req, res, next) => {
  try {
    const playerId = Number(req.body?.playerId);
    const direction = String(req.body?.direction ?? "");
    if (!Number.isInteger(playerId)) {
      return res.status(400).json({ error: "`playerId` required" });
    }
    if (direction !== "up" && direction !== "down") {
      return res.status(400).json({ error: "`direction` must be 'up' or 'down'" });
    }
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) return res.status(404).json({ error: "Player not found" });
    if (player.soldToTeamId > 0) {
      return res.status(400).json({ error: "Sold players cannot be reordered" });
    }
    const queue = await prisma.player.findMany({
      where: { soldToTeamId: { in: [0, -1] } },
      orderBy: [{ auctionOrder: "asc" }, { id: "asc" }],
    });
    const idx = queue.findIndex((p) => p.id === playerId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= queue.length) {
      return res.status(400).json({ error: `Cannot move ${direction} from here` });
    }
    const other = queue[swapIdx];
    await prisma.$transaction([
      prisma.player.update({ where: { id: player.id }, data: { auctionOrder: other.auctionOrder } }),
      prisma.player.update({ where: { id: other.id }, data: { auctionOrder: player.auctionOrder } }),
    ]);
    res.json({ moved: player.playerName, direction, with: other.playerName });
    broadcastInvalidate({ players: true });  } catch (err) {
    next(err);
  }
});

// POST /api/auction/requeue { orderedIds: [...] } — batch-set the queue
// order from a drag-and-drop (queued players only, sold excluded).
// Positions are spaced by 10 to leave room for single-step swaps.
router.post("/requeue", async (req, res, next) => {
  try {
    const ids = req.body?.orderedIds;
    if (!Array.isArray(ids) || ids.length === 0 || !ids.every(Number.isInteger)) {
      return res.status(400).json({ error: "`orderedIds` must be a non-empty int array" });
    }
    const existing = await prisma.player.findMany({ where: { id: { in: ids } } });
    if (existing.length !== ids.length) {
      return res.status(404).json({ error: "Unknown player id in queue" });
    }
    if (existing.some((p) => p.soldToTeamId > 0)) {
      return res.status(400).json({ error: "Sold players cannot be reordered" });
    }
    await prisma.$transaction(
      ids.map((id, i) =>
        prisma.player.update({ where: { id }, data: { auctionOrder: (i + 1) * 10 } }),
      ),
    );
    broadcastInvalidate({ players: true });
    res.json({ requeued: ids.length });
  } catch (err) {
    next(err);
  }
});

// POST /api/auction/player-status { playerId, status: "pool" | "unsold" } —
// flip a player between fresh-pool (0) and passed (-1). No purse movement;
// use reset-sale to refund a sold player.
router.post("/player-status", async (req, res, next) => {
  try {
    const playerId = Number(req.body?.playerId);
    const status = String(req.body?.status ?? "");
    if (!Number.isInteger(playerId)) {
      return res.status(400).json({ error: "`playerId` required" });
    }
    if (status !== "pool" && status !== "unsold") {
      return res.status(400).json({ error: "`status` must be 'pool' or 'unsold'" });
    }
    const player = await prisma.player.findUnique({ where: { id: playerId } });
    if (!player) return res.status(404).json({ error: "Player not found" });
    if (player.soldToTeamId > 0) {
      return res.status(400).json({ error: "Sold players must be reset first (refunds purse)" });
    }
    const updated = await prisma.player.update({
      where: { id: playerId },
      data: {
        soldToTeamId: status === "unsold" ? -1 : 0,
        finalPrice: 0,
        soldToTeam: null,
        timeOfSelling: new Date("2000-01-01"),
      },
    });
    res.json(updated);
    broadcastInvalidate({ players: true });
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
    await changed({ logs: true });
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
    await changed({ sales: true, logs: true, players: true, teams: true });
    res.json(await enrichedState());
  } catch (err) {
    next(err);
  }
});

// POST /api/auction/nuke { confirm: "NUKE" } — full sales reset:
// every sold player's price is refunded to its team, all players return
// to the pool, logs are cleared, desk parked at IDLE. Teams + players stay.
router.post("/nuke", async (req, res, next) => {
  try {
    if (req.body?.confirm !== "NUKE") {
      return res.status(400).json({ error: 'Type NUKE in the confirm field' });
    }
    const sold = await prisma.player.findMany({ where: { soldToTeamId: { gt: 0 } } });
    const refunds = new Map();
    for (const p of sold) {
      refunds.set(p.soldToTeamId, (refunds.get(p.soldToTeamId) ?? 0) + p.finalPrice);
    }
    await prisma.$transaction([
      ...[...refunds].map(([teamId, amt]) =>
        prisma.team.update({ where: { id: teamId }, data: { purse: { increment: amt } } }),
      ),
      prisma.player.updateMany({
        data: {
          finalPrice: 0,
          soldToTeamId: 0,
          soldToTeam: null,
          timeOfSelling: new Date("2000-01-01"),
        },
      }),
      prisma.auctionLog.deleteMany(),
      prisma.displayPref.deleteMany({ where: { key: "queueCursor" } }),
    ]);
    await prisma.auctionState.upsert({
      where: { id: 1 },
      update: { status: "IDLE", currentPlayerId: null, currentBid: 0, currentBidderTeamId: 0 },
      create: { id: 1, status: "IDLE", currentBid: 0, currentBidderTeamId: 0 },
    });
    await log("NUKE", {
      message: `Database nuked: ${sold.length} sale(s) reset, purses refunded`,
    });
    await changed({ sales: true, logs: true, players: true, teams: true });
    res.json({ reset: true, refundedSales: sold.length });
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
