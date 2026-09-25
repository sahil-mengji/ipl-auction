/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { fetcnsoldPlayers } from "../utils/getSoldPlayers";
import { formatPriceInLakhs } from "../pages/Page1/PlayerCard";

// Pixels per second for the auto-scroll — duration is measured from the
// actual list height so motion stays visible at any squad size.
const SCROLL_PX_PER_SEC = 60;

// Vertical purchased-players rail: sold players glide up and down
// automatically in a fixed-height window (pauses on hover). Used on `/break`.
export default function SoldPlayersRail({ className = "" }) {
  const [soldPlayers, setSoldPlayers] = useState([]);
  const winRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    let alive = true;
    const fetchPlayers = async () => {
      try {
        const data = await fetcnsoldPlayers();
        if (!alive) return;
        setSoldPlayers((data ?? []).filter((p) => p.sold_to_team_id > 0));
      } catch (error) {
        console.error("Error fetching players:", error);
      }
    };
    fetchPlayers();
    return () => {
      alive = false;
    };
  }, []);

  // Constant-speed auto-scroll that always glides: the list repeats 4x
  // so there is travel distance even with just 1-2 sales.
  useEffect(() => {
    const ul = listRef.current;
    if (!ul || soldPlayers.length === 0) return;
    const travel = ul.scrollHeight / 2;
    ul.style.animation = "";
    ul.style.animationDuration = `${Math.max(travel / SCROLL_PX_PER_SEC, 6)}s`;
  }, [soldPlayers]);

  if (soldPlayers.length === 0) {
    return (
      <p className="text-center text-white/60 py-8">
        No players purchased yet.
      </p>
    );
  }

  const loop = [...soldPlayers, ...soldPlayers, ...soldPlayers, ...soldPlayers];
  return (
    <div ref={winRef} className={`bc-mask-y overflow-hidden h-[38vh] ${className}`}>
      <ul ref={listRef} className="bc-scroll-y flex flex-col gap-2 px-2 py-2">
        {loop.map((player, idx) => (
          <li
            key={`${player.id ?? player.player_name}-${idx}`}
            className="bc-team-row px-4 py-2"
          >
            <div className="flex items-center gap-3">
              {player.player_image ? (
                <img
                  src={player.player_image}
                  alt={player.player_name}
                  className="h-10 w-10 rounded-full object-cover border border-white/30 shrink-0"
                />
              ) : (
                <span className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-lg font-extrabold shrink-0">
                  {(player.player_name ?? "?").slice(0, 1)}
                </span>
              )}
              <span className="flex-1 min-w-0 font-bold truncate">
                {player.player_name}
              </span>
              <span className="text-sm text-white/60 truncate">
                {player.sold_to_team}
              </span>
              <span className="font-extrabold bc-gold-text whitespace-nowrap">
                &#8377;{formatPriceInLakhs(player.final_price)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
