import { color } from "framer-motion";
import { isDummyMode } from "./dummyMode";
import { getDummyTeamsWithSquads } from "./dummyStore";
import { isBackendMode } from "./dataSource";
import { fetchBackendTeamsWithSquads } from "./backendApi";

const SUPABASE_URL = "https://ykpijunxogyxoiveffdq.supabase.co/rest/v1/";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrcGlqdW54b2d5eG9pdmVmZmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4NzM0MTcsImV4cCI6MjA1MjQ0OTQxN30.m1m6O47gtaZtc9IMhQ_y1eKrdd-_jROL2JuI7aTupL4";

// Fetch teams and players data
export const fetchTeamsWithSquads = async () => {
    if (isDummyMode()) {
        return getDummyTeamsWithSquads();
    }
    if (isBackendMode()) {
        try {
            return await fetchBackendTeamsWithSquads();
        } catch (error) {
            console.error("Error fetching data:", error);
            return [];
        }
    }
    try {
        // Fetch teams data
        const teamsResponse = await fetch(`${SUPABASE_URL}Teams`, {
            method: "GET",
            headers: {
                apiKey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
            },
        });
        const teams = await teamsResponse.json();
        // Fetch players data
        const playersResponse = await fetch(`${SUPABASE_URL}CricketPlayers`, {
            method: "GET",
            headers: {
                apiKey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
            },
        });
        const players = await playersResponse.json();

        // Map teams with their squads
        const teamsWithSquads = teams.map((team) => ({
            team_id: team.id,
            name: team.team_name,
            playerCount: players.filter((player) => player.sold_to_team_id === team.id).length,
            purse: team.purse,
            teamLogo: team.team_logo,
            textColor: team.text_color,
            squad: players
                .filter((player) => player.sold_to_team_id === team.id)
                .map((player) => ({
                    name: player.player_name,
                    role: player.category,
                    isOverseas: player.is_overseas,
                })),
            color1: team.color1,
            color2: team.color2,
        }));
        return teamsWithSquads.sort((a, b) => a.team_id - b.team_id);
    } catch (error) {
        console.error("Error fetching data:", error);
        return [];
    }
};