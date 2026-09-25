import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ReactConfetti from "react-confetti";
import AuctionShell from "../components/AuctionShell";
import CurrentBidWidget from "../components/CurrentBidWidget";
import LeftComponent from "./Page1/LeftComponent";
import Overview from "./Page1/Overview";
import TeamsWithCompactDesign from "./FinalSquad";
import TimerPage from "./TimerPage";
import BudgetGraph from "./BudgetGraph";
import { PlayerHero } from "./Page1/PlayerCard";
import { formatPriceInLakhs } from "./Page1/PlayerCard";
import { recentBidsBefore } from "../utils/auctionApi";
import { useDisplay, useLiveAuction } from "../utils/useLiveAuction";
import { playBidPlaced, playTrumpet } from "../utils/sound";

// Read-only big-screen view for the audience, on the same classic template:
// left = team overview + highlights, center = hero, right = prices + stats.
// Live over websockets — control-room actions land instantly, with bid blips,
// a SOLD stamp + confetti + fanfare on the hammer (all remote-controllable
// from /control's Live tab).
// Cycle mode: rotate chart -> squads -> break every 10s while enabled.
const CYCLE_VIEWS = ["chart", "squads", "break"];
const CYCLE_MS = 10000;

export default function AudienceView() {
  const { state, teams, logs, error } = useLiveAuction({ logs: true });
  const display = useDisplay();
  const [showStamp, setShowStamp] = useState(false);
  const [cycleIdx, setCycleIdx] = useState(0);
  const prev = useRef({ bid: 0, status: "IDLE", playerId: null });

  const player = state?.player ?? null;
  const status = state?.status ?? "IDLE";
  const bid = Number(state?.current_bid ?? 0);

  useEffect(() => {
    const p = prev.current;
    const sameLot = state?.player?.id === p.playerId;
    if (display.sounds) {
      if (sameLot && bid > p.bid) playBidPlaced();
      if (status === "SOLD" && p.status !== "SOLD" && display.trumpet) {
        playTrumpet();
      }
    }
    if (status === "SOLD" && p.status !== "SOLD" && display.celebration) {
      setShowStamp(true);
      const id = setTimeout(() => setShowStamp(false), 2600);
      prev.current = { bid, status, playerId: state?.player?.id };
      return () => clearTimeout(id);
    }
    prev.current = { bid, status, playerId: state?.player?.id };
  }, [bid, status, state?.player?.id, display.sounds, display.celebration, display.trumpet]);

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

  // Right column stays empty on audience view: bid/price live in the
  // top-right widget and the docked ticket instead.
  const right = null;

  // Broadcast screen: control room picks what the crowd sees — or runs
  // the 10s auto-cycle across chart / squads / break.
  useEffect(() => {
    if (!display.cycle) return;
    const id = setInterval(
      () => setCycleIdx((i) => (i + 1) % CYCLE_VIEWS.length),
      CYCLE_MS,
    );
    return () => clearInterval(id);
  }, [display.cycle]);

  const liveView = display.cycle
    ? CYCLE_VIEWS[cycleIdx % CYCLE_VIEWS.length]
    : (display.liveView ?? "bidding");
  if (liveView === "squads") return <TeamsWithCompactDesign bare />;
  if (liveView === "break") return <TimerPage bare />;
  if (liveView === "chart") return <BudgetGraph bare />;

  return (
    <>
      {showStamp && (
        <div
          key={`sold-${player?.id}-${bid}`}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <div className="bc-sold-stamp bc-trap-r bc-trap-gold px-16 py-6 text-center">
            <p className="text-8xl font-extrabold tracking-[0.1em] uppercase">
              Sold
            </p>
            <p className="text-2xl font-extrabold uppercase tracking-wide mt-2 text-[#1a1200]">
              {player?.player_name} to {state?.bidding_team?.team_name} for ₹
              {formatPriceInLakhs(bid)}
            </p>
          </div>
        </div>
      )}
      {status === "SOLD" && display.celebration && (
        <ReactConfetti
          width={window.innerWidth}
          height={window.innerHeight}
        />
      )}
      {display.showWidget && (
        <CurrentBidWidget
          bid={bid}
          team={state?.bidding_team ?? null}
          recentBids={recentBidsBefore(
            logs,
            teams,
            state?.player?.id,
            state?.current_bid,
          )}
        />
      )}
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
        </>
      }
      />
    </>
  );
}
