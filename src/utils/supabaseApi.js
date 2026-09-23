import { isDummyMode } from "./dummyMode";
import { isBackendMode } from "./dataSource";
import { insertBackendData } from "./backendApi";

const SUPABASE_URL = "https://ykpijunxogyxoiveffdq.supabase.co/rest/v1/";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrcGlqdW54b2d5eG9pdmVmZmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4NzM0MTcsImV4cCI6MjA1MjQ0OTQxN30.m1m6O47gtaZtc9IMhQ_y1eKrdd-_jROL2JuI7aTupL4";

export const insertSupabaseData = async (table, data) => {
    if (isDummyMode()) {
        console.info(`[dummy-mode] insert into ${table} skipped:`, data);
        return Array.isArray(data) ? data : [data];
    }
    if (isBackendMode()) {
        try {
            return await insertBackendData(table, data);
        } catch (error) {
            console.error(error.message);
            return null;
        }
    }
    try {
        const response = await fetch(`${SUPABASE_URL}${table}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                apiKey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`Error inserting data: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(error.message);
        return null;
    }
};
