import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { isDummyMode } from "../../utils/dummyMode";
import { getDummyPlayers } from "../../utils/dummyStore";
import { isBackendMode } from "../../utils/dataSource";
import { fetchBackendPlayers } from "../../utils/backendApi";
import PlayerImage from "../../components/PlayerImage";

const SUPABASE_URL = "https://ykpijunxogyxoiveffdq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlrcGlqdW54b2d5eG9pdmVmZmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4NzM0MTcsImV4cCI6MjA1MjQ0OTQxN30.m1m6O47gtaZtc9IMhQ_y1eKrdd-_jROL2JuI7aTupL4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function CricketPlayersTable() {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPlayers() {
            if (isDummyMode()) {
                setPlayers(
                    getDummyPlayers().map(({ player_name, player_image }) => ({
                        player_name,
                        player_image,
                    }))
                );
                setLoading(false);
                return;
            }
            if (isBackendMode()) {
                try {
                    const data = await fetchBackendPlayers("all");
                    setPlayers(
                        data.map(({ playerName, player_name, playerImage, player_image }) => ({
                            player_name: player_name ?? playerName,
                            player_image: player_image ?? playerImage,
                        }))
                    );
                } catch (e) {
                    console.error("Error fetching players:", e);
                }
                setLoading(false);
                return;
            }
            let { data, error } = await supabase.from("CricketPlayers").select("player_name, player_image");
            if (error) {
                console.error("Error fetching players:", error);
            } else {
                setPlayers(data);
            }
            setLoading(false);
        }
        fetchPlayers();
    }, []);

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Cricket Players</h1>
            {loading ? (
                <p>Loading...</p>
            ) : (
                <table className="table-auto w-full border-collapse border border-gray-200">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border px-4 py-2">Player</th>
                            <th className="border px-4 py-2">Image</th>
                        </tr>
                    </thead>
                    <tbody>
                        {players.map((player, index) => (
                            <tr key={index} className="text-center">
                                <td className="border px-4 py-2">{player.player_name}</td>
                                <td className="border px-4 py-2">
<PlayerImage src={player.player_image} alt={player.player_name} className="w-60 h-60 object-cover mx-auto rounded-full" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
