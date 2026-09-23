// Backend (Express + Prisma) equivalents of every Supabase query/mutation
// used by the UI. Existing utils delegate here when backend mode is on.
//
// IMPORTANT: Prisma returns camelCase, but the whole UI was built on the
// Supabase snake_case shape. Every response is normalised back to
// snake_case here so no component needs to change.

import { backendFetch } from "./dataSource";

const asArray = (data) => (Array.isArray(data) ? data : data == null ? [] : [data]);

export const normalizeTeam = (t) =>
  t == null
    ? t
    : {
        id: t.id,
        team_name: t.teamName ?? t.team_name,
        purse: t.purse,
        team_logo: t.teamLogo ?? t.team_logo,
        text_color: t.textColor ?? t.text_color,
        color1: t.color1,
        color2: t.color2,
      };

export const normalizePlayer = (p) =>
  p == null
    ? p
    : {
        id: p.id,
        player_name: p.playerName ?? p.player_name,
        player_image: p.playerImage ?? p.player_image,
        base_price: p.basePrice ?? p.base_price ?? 0,
        final_price: p.finalPrice ?? p.final_price ?? 0,
        sold_to_team_id: p.soldToTeamId ?? p.sold_to_team_id ?? 0,
        sold_to_team: p.soldToTeam ?? p.sold_to_team ?? null,
        time_of_selling: p.timeOfSelling ?? p.time_of_selling ?? null,
        category: p.category,
        is_overseas: p.isOverseas ?? p.is_overseas ?? false,
        matches: p.matches ?? 0,
        runs: p.runs ?? 0,
        bat_avg: p.batAvg ?? p.bat_avg ?? 0,
        sr: p.sr ?? 0,
        catches: p.catches ?? 0,
        stumpings: p.stumpings ?? 0,
        wickets: p.wickets ?? 0,
        bowl_avg: p.bowlAvg ?? p.bowl_avg ?? 0,
        eco: p.eco ?? 0,
      };

export const normalizeLog = (l) =>
  l == null
    ? l
    : {
        id: l.id,
        type: l.type,
        player_id: l.playerId ?? l.player_id ?? null,
        team_id: l.teamId ?? l.team_id ?? null,
        amount: l.amount ?? null,
        message: l.message ?? null,
        created_at: l.createdAt ?? l.created_at ?? null,
      };

// Auction-state payload normalised the same way: snake_case keys,
// nested player + bidding team.
export const normalizeAuctionState = (s) =>
  s == null
    ? s
    : {
        id: s.id,
        status: s.status,
        current_player_id: s.currentPlayerId ?? s.current_player_id ?? null,
        current_bid: s.currentBid ?? s.current_bid ?? 0,
        current_bidder_team_id: s.currentBidderTeamId ?? s.current_bidder_team_id ?? 0,
        updated_at: s.updatedAt ?? s.updated_at ?? null,
        player: normalizePlayer(s.player ?? null),
        bidding_team: normalizeTeam(s.biddingTeam ?? s.bidding_team ?? null),
      };

export const fetchBackendTeams = async () =>
  (await backendFetch("/api/teams")).map(normalizeTeam);

export const fetchBackendTeamById = async (teamId) =>
  asArray(await backendFetch(`/api/teams/${teamId}`)).map(normalizeTeam);

export const fetchBackendPlayers = async (status = "all") =>
  (await backendFetch(`/api/players?status=${encodeURIComponent(status)}`)).map(normalizePlayer);

export const fetchBackendUnsoldPlayers = () => fetchBackendPlayers("unsold");

export const fetchBackendSoldPlayers = () => fetchBackendPlayers("sold");

export const fetchBackendExpensivePlayer = async () =>
  (await backendFetch("/api/players/expensive")).map(normalizePlayer);

export const fetchBackendLastSoldPlayer = async () =>
  (await backendFetch("/api/players/last-sold")).map(normalizePlayer);

export const fetchBackendTeamsWithSquads = () => backendFetch("/api/teams-with-squads");

export const markBackendPlayerAsSold = (playerId, finalPrice, soldToTeamId, soldToTeam) =>
  backendFetch(`/api/players/${playerId}/sold`, {
    method: "PATCH",
    body: JSON.stringify({
      final_price: finalPrice,
      sold_to_team_id: soldToTeamId,
      sold_to_team: soldToTeam,
    }),
  }).then(normalizePlayer);

export const updateBackendTeamPurse = (teamId, purse) =>
  backendFetch(`/api/teams/${teamId}/purse`, {
    method: "PATCH",
    body: JSON.stringify({ purse }),
  }).then(normalizeTeam);

export const insertBackendData = (table, data) => {
  const path = table === "Teams" ? "/api/teams" : "/api/players";
  const payload = Array.isArray(data) ? data[0] : data;
  return backendFetch(path, { method: "POST", body: JSON.stringify(payload ?? {}) });
};
