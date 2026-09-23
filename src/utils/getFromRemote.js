import { isDummyMode } from "./dummyMode";
import { getDummyPlayers, getDummyTeams } from "./dummyStore";
import { isBackendMode } from "./dataSource";
import { fetchBackendPlayers, fetchBackendTeams } from "./backendApi";

const SUPABASE_URL = "https://ykpijunxogyxoiveffdq.supabase.co/rest/v1/";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrcGlqdW54b2d5eG9pdmVmZmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4NzM0MTcsImV4cCI6MjA1MjQ0OTQxN30.m1m6O47gtaZtc9IMhQ_y1eKrdd-_jROL2JuI7aTupL4";

export const fetchSupabaseData = async (table) => {
    if (isDummyMode()) {
        if (table === "Teams") return getDummyTeams();
        return getDummyPlayers();
    }
    if (isBackendMode()) {
        try {
            if (table === "Teams") return await fetchBackendTeams();
            return await fetchBackendPlayers("all");
        } catch (error) {
            console.error(error.message);
            return [];
        }
    }
    try {
        const response = await fetch(`${SUPABASE_URL}${table}?order=id.asc`, {
            method: "GET",
            headers: {
                apiKey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Error fetching data: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(error.message);
        return [];
    }
};