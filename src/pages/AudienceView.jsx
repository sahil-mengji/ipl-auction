import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AuctionShell from "../components/AuctionShell";
import LeftComponent from "./Page1/LeftComponent";
import Overview from "./Page1/Overview";
import { PlayerHero, PlayerInfoPanel } from "./Page1/PlayerCard";
import { getAuctionState } from "../utils/auctionApi";

const POLL_MS = 2000;

// Read-only big-screen view for the audience, on the same classic template:
// left = team overview + highlights, center = hero, right = prices + stats.
// Polls the shared auction state — whatever the control dashboard does
// appears here within ~2s.
export default function AudienceView() {
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const s = await getAuctionState();
        if (!alive) return;
        setState(s);
        setError(null);
      } catch (e) {
        if (alive) setError(e.message);
      }
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const player = state?.player ?? null;
  const status = state?.status ?? "IDLE";

  const center = !player ? (
    <div className="text-center">
      <h1 className="text-2xl mb-5">Waiting for the next player…</h1>
      {error && <p className="text-red-300 text-sm">Backend unreachable ({error})</p>}
    </div>
  ) : (
    <PlayerHero
      player={player}
      showHammer={false}
      currentBidder={state?.bidding_team?.team_name ?? null}
      showPlayerCard={status === "SOLD"}
      docked
    />
  );

  const right = player ? (
    <PlayerInfoPanel player={player} currentBid={state?.current_bid ?? 0} showPlayerCard={status === "SOLD"} hideStats />
  ) : null;

  return (
    <AuctionShell
      title="IPL MOCK AUCTION — LIVE"
      left={<><Overview /><LeftComponent /></>}
      center={center}
      right={right}
      topRight={
        <>
          <span className="flex items-center gap-2 text-xs bg-red-600 text-white px-3 py-1.5 rounded">
            <span className="bc-led" />
            LIVE
          </span>
          <Link to="/control" className="bg-white/10 text-white text-xs px-3 py-1.5 rounded hover:bg-white/20">
            Control
          </Link>
          <Link to="/" className="bg-white/10 text-white text-xs px-3 py-1.5 rounded hover:bg-white/20">
            Classic
          </Link>
        </>
      }
    />
  );
}
