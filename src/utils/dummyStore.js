// In-memory mutable store backing dummy mode.
// Reads/writes (mark sold, update purse) mutate this store so the auction
// flow works end-to-end in the UI without a backend.

import { dummyPlayers, dummyTeams } from "../data/dummyData";

// Deep copies so live edits never mutate the imported seed data.
let players = structuredClone
  ? structuredClone(dummyPlayers)
  : JSON.parse(JSON.stringify(dummyPlayers));
let teams = structuredClone
  ? structuredClone(dummyTeams)
  : JSON.parse(JSON.stringify(dummyTeams));

const clone = (v) => JSON.parse(JSON.stringify(v));

export const getDummyTeams = () => clone(teams);

export const getDummyPlayers = () => clone(players);

export const getDummyUnsoldPlayers = () =>
  clone(players.filter((p) => p.sold_to_team_id === 0).sort((a, b) => a.id - b.id));

export const getDummySoldPlayers = () =>
  clone(players.filter((p) => p.sold_to_team_id !== 0 && p.sold_to_team_id !== -1));

export const getDummyExpensivePlayer = () => {
  const sold = players
    .filter((p) => p.sold_to_team_id > 0)
    .sort((a, b) => b.final_price - a.final_price);
  return clone(sold.slice(0, 1));
};

export const getDummyPrevPlayer = () => {
  const sold = players
    .filter((p) => p.sold_to_team_id > 0 && p.time_of_selling)
    .sort((a, b) => new Date(b.time_of_selling) - new Date(a.time_of_selling));
  return clone(sold.slice(0, 1));
};

export const getDummyTeamById = (teamId) =>
  clone(teams.filter((t) => String(t.id) === String(teamId)));

export const getDummyTeamsWithSquads = () => {
  const mapped = teams.map((team) => {
    const squad = players.filter((p) => p.sold_to_team_id === team.id);
    return {
      team_id: team.id,
      name: team.team_name,
      playerCount: squad.length,
      purse: team.purse,
      teamLogo: team.team_logo,
      textColor: team.text_color,
      squad: squad.map((p) => ({
        name: p.player_name,
        role: p.category,
        isOverseas: p.is_overseas,
      })),
      color1: team.color1,
      color2: team.color2,
    };
  });
  return clone(mapped.sort((a, b) => a.team_id - b.team_id));
};

export const markDummyPlayerAsSold = (playerId, finalPrice, soldToTeamId, soldToTeam) => {
  const player = players.find((p) => String(p.id) === String(playerId));
  if (!player) return 404;
  player.final_price = finalPrice;
  player.sold_to_team_id = soldToTeamId;
  player.sold_to_team = soldToTeam;
  player.time_of_selling =
    finalPrice === 0 ? new Date("2000-01-01").toISOString() : new Date().toISOString();
  return 200;
};

export const updateDummyTeamPurse = (teamId, newPurse) => {
  const team = teams.find((t) => String(t.id) === String(teamId));
  if (!team) return null;
  team.purse = newPurse;
  return clone([team]);
};

// Test/dev helper: restore seed data (e.g. between tests or via console).
export const resetDummyStore = () => {
  players = JSON.parse(JSON.stringify(dummyPlayers));
  teams = JSON.parse(JSON.stringify(dummyTeams));
};
