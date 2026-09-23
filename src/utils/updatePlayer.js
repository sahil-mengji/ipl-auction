// Supabase setup
import { isDummyMode } from "./dummyMode";
import { markDummyPlayerAsSold } from "./dummyStore";
import { isBackendMode } from "./dataSource";
import { markBackendPlayerAsSold } from "./backendApi";

const SUPABASE_URL = "https://ykpijunxogyxoiveffdq.supabase.co/rest/v1/";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrcGlqdW54b2d5eG9pdmVmZmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4NzM0MTcsImV4cCI6MjA1MjQ0OTQxN30.m1m6O47gtaZtc9IMhQ_y1eKrdd-_jROL2JuI7aTupL4";

export const markPlayerAsSold = async (playerId, finalPrice, soldToTeamId, sold_to_team) => {
  if (isDummyMode()) {
    return markDummyPlayerAsSold(playerId, finalPrice, soldToTeamId, sold_to_team);
  }
  if (isBackendMode()) {
    return markBackendPlayerAsSold(playerId, finalPrice, soldToTeamId, sold_to_team);
  }
  if (finalPrice === 0) {
    var date = new Date('2000-01-01');
  }
  else {
    var date = new Date().toISOString()
  }
  try {
    const response = await fetch(`${SUPABASE_URL}CricketPlayers?id=eq.${playerId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apiKey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        'final_price': finalPrice,
        'sold_to_team_id': soldToTeamId,
        'sold_to_team': sold_to_team,
        'time_of_selling': date
      }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }
    const data = response.status;
    return data;
  } catch (error) {
    throw error;
  }
};
