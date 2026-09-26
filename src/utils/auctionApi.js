// Client for the live-auction endpoints (`/api/auction/*`).
// Used by the Audience view (/live) and the Control dashboard (/control).
// Backend is hardcoded in dataSource.js — no env setup needed.
//
// All payloads are normalised to the UI's snake_case shape (see backendApi).

import { backendFetch } from "./dataSource";
import {
  fetchBackendTeams,
  fetchBackendTeamsWithSquads,
  normalizeAuctionState,
  normalizeLog,
  normalizePlayer,
} from "./backendApi";

export const getAuctionState = async () =>
  normalizeAuctionState(await backendFetch("/api/auction/state"));

export const startLot = async (playerId) =>
  normalizeAuctionState(
    await backendFetch("/api/auction/start", {
      method: "POST",
      body: JSON.stringify(playerId != null ? { playerId } : {}),
    })
  );

// Hammer down: the winning team/amount come from the control panel's own
// (unpersisted) live bid — the backend never tracks the running bid.
export const hammerSold = async (teamId, amount) =>
  normalizeAuctionState(
    await backendFetch("/api/auction/sold", {
      method: "POST",
      body: JSON.stringify({ teamId, amount }),
    })
  );

export const markLotUnsold = async () =>
  normalizeAuctionState(await backendFetch("/api/auction/unsold", { method: "POST" }));

export const nextLot = async () =>
  normalizeAuctionState(await backendFetch("/api/auction/next", { method: "POST" }));

export const resetSale = async (playerId) =>
  normalizeAuctionState(
    await backendFetch("/api/auction/reset-sale", {
      method: "POST",
      body: JSON.stringify({ playerId }),
    })
  );

export const nukeDatabase = async () =>
  backendFetch("/api/auction/nuke", {
    method: "POST",
    body: JSON.stringify({ confirm: "NUKE" }),
  });

export const getAuctionLogs = async (limit = 100) =>
  (await backendFetch(`/api/auction/logs?limit=${encodeURIComponent(limit)}`)).map(normalizeLog);

export const getHealthDb = async () => backendFetch("/api/health/db");

export const getAuctionSales = async () =>
  (await backendFetch("/api/auction/sales")).map(normalizePlayer);

export const getPlayers = async () =>
  (await backendFetch("/api/players?status=all")).map(normalizePlayer);

export const movePlayer = async (playerId, direction) =>
  backendFetch("/api/auction/reorder", {
    method: "POST",
    body: JSON.stringify({ playerId, direction }),
  });

export const requeuePlayers = async (orderedIds) =>
  backendFetch("/api/auction/requeue", {
    method: "POST",
    body: JSON.stringify({ orderedIds }),
  });

export const setPlayerStatus = async (playerId, status) =>
  backendFetch("/api/auction/player-status", {
    method: "POST",
    body: JSON.stringify({ playerId, status }),
  });

export const getTeams = () => fetchBackendTeams();

export const getTeamsWithSquads = () => fetchBackendTeamsWithSquads();

// Price unit is Lakh in the DB (100 = 1 Crore) — same helper used across screens.
export function formatPrice(price) {
  const n = Number(price ?? 0);
  if (Number.isNaN(n)) return "—";
  if (n >= 100) return `${Number((n / 100).toFixed(2)).toLocaleString("en-IN")} Cr`;
  return `${n.toLocaleString("en-IN")} L`;
}
