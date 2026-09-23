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

// Ladder bid (amount omitted) or custom bid: placeBid(teamId, 350)
export const placeBid = async (teamId, amount) =>
  normalizeAuctionState(
    await backendFetch("/api/auction/bid", {
      method: "POST",
      body: JSON.stringify(amount != null ? { teamId, amount } : { teamId }),
    })
  );

export const hammerSold = async () =>
  normalizeAuctionState(await backendFetch("/api/auction/sold", { method: "POST" }));

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

export const getAuctionLogs = async (limit = 100) =>
  (await backendFetch(`/api/auction/logs?limit=${encodeURIComponent(limit)}`)).map(normalizeLog);

export const getAuctionSales = async () =>
  (await backendFetch("/api/auction/sales")).map(normalizePlayer);

export const getTeams = () => fetchBackendTeams();

export const getTeamsWithSquads = () => fetchBackendTeamsWithSquads();

// Price unit is Lakh in the DB (100 = 1 Crore) — same helper used across screens.
export function formatPrice(price) {
  const n = Number(price ?? 0);
  if (Number.isNaN(n)) return "—";
  if (n >= 100) return `${Number((n / 100).toFixed(2)).toLocaleString("en-IN")} Cr`;
  return `${n.toLocaleString("en-IN")} L`;
}
