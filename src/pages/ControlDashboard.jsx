import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AuctionShell from "../components/AuctionShell";
import CurrentBidWidget from "../components/CurrentBidWidget";
import LeftComponent from "./Page1/LeftComponent";
import Overview from "./Page1/Overview";
import { PlayerHero, PlayerInfoPanel } from "./Page1/PlayerCard";
import MetalButton from "../components/broadcast/MetalButton";
import {
  formatPrice,
  getAuctionLogs,
  getAuctionSales,
  getAuctionState,
  getTeams,
  hammerSold,
  markLotUnsold,
  nextLot,
  placeBid,
  recentBidsBefore,
  resetSale,
  startLot,
} from "../utils/auctionApi";

const POLL_MS = 2000;
const TABS = ["Bidding", "Sales", "Logs"];

// Auctioneer screen on the classic template: same shell as `/` and `/live`
// (Left | PlayerCard | Overview) plus a control deck underneath for bidding,
// custom prices, sales reset and logs.
export default function ControlDashboard() {
  const [tab, setTab] = useState("Bidding");
  const [state, setState] = useState(null);
  const [teams, setTeams] = useState([]);
  const [sales, setSales] = useState([]);
  const [logs, setLogs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [customTeam, setCustomTeam] = useState("");
  const [recentLogs, setRecentLogs] = useState([]);

  const refresh = useCallback(async () => {
    try {
      const [s, t, l] = await Promise.all([
        getAuctionState(),
        getTeams(),
        getAuctionLogs(10),
      ]);
      setState(s);
      setTeams(t);
      setRecentLogs(l);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const refreshTab = useCallback(async () => {
    try {
      if (tab === "Sales") setSales(await getAuctionSales());
      if (tab === "Logs") setLogs(await getAuctionLogs());
    } catch (e) {
      setError(e.message);
    }
  }, [tab]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    refreshTab();
  }, [refreshTab, state?.updated_at]);

  const run = async (fn, okMsg) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const s = await fn();
      setState(s);
      if (okMsg) setNotice(okMsg);
      await refreshTab();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const setCustomBid = () => {
    const amount = Number(customAmount);
    if (!customTeam) {
      setError("Pick a team for the custom bid.");
      return;
    }
    if (!Number.isInteger(amount) || amount <= 0) {
      setError("Enter a whole-number bid in Lakh.");
      return;
    }
    run(() => placeBid(Number(customTeam), amount), `Custom bid ₹${amount}L recorded`);
  };

  const player = state?.player ?? null;
  const status = state?.status ?? "IDLE";
  const bidding = status === "BIDDING";

  const center = !player ? (
    <div className="text-center">
      <h1 className="text-2xl mb-5">No active lot</h1>
      <MetalButton tone="" onClick={() => run(() => startLot(), "Bidding opened")} disabled={busy}>
        Start next player
      </MetalButton>
    </div>
  ) : (
    <>
      <PlayerHero
        player={player}
        showHammer={false}
        currentBidder={state?.bidding_team?.team_name ?? null}
        currentBid={state?.current_bid ?? 0}
        showPlayerCard={status === "SOLD"}
      />
      <div className="mt-2 flex flex-wrap gap-3 justify-center relative z-10">
        <MetalButton
          tone="green"
          disabled={busy || !bidding || (state?.current_bid ?? 0) <= 0}
          onClick={() => run(() => hammerSold(), "Player SOLD — visible on /live")}
        >
          Sold
        </MetalButton>
        <MetalButton
          tone="danger"
          disabled={busy || !player || status === "IDLE"}
          onClick={() => run(() => markLotUnsold(), "Marked unsold")}
        >
          Unsold
        </MetalButton>
        <MetalButton
          disabled={busy || status === "BIDDING"}
          onClick={() => run(() => nextLot(), "Ready for next lot")}
        >
          Next / Clear
        </MetalButton>
        <MetalButton
          disabled={busy || bidding}
          onClick={() => run(() => startLot(), "Bidding opened")}
        >
          Start next player
        </MetalButton>
      </div>
    </>
  );

  const right = player ? (
    <PlayerInfoPanel player={player} currentBid={state?.current_bid ?? 0} showPlayerCard={status === "SOLD"} />
  ) : null;

  return (
    <div className="min-h-screen bg-[#193153] text-white">
      <CurrentBidWidget
        bid={state?.current_bid ?? 0}
        team={state?.bidding_team ?? null}
        recentBids={recentBidsBefore(
          recentLogs,
          teams,
          state?.player?.id,
          state?.current_bid,
        )}
      />
      <AuctionShell
        title="AUCTION CONTROL"
        left={<><Overview /><LeftComponent /></>}
        center={center}
        right={right}
        topRight={
          <>
            <span
              className={`text-xs font-bold px-3 py-1.5 rounded ${
                bidding ? "bg-yellow-400 text-black" : status === "SOLD" ? "bg-green-500" : "bg-white/15"
              }`}
            >
              {status}
            </span>
            <Link to="/live" className="bg-white/10 text-xs px-3 py-1.5 rounded hover:bg-white/20">
              Audience view
            </Link>
            <Link to="/" className="bg-white/10 text-xs px-3 py-1.5 rounded hover:bg-white/20">
              Classic
            </Link>
          </>
        }
      />

      {/* Control deck */}
      <div className="relative z-10 px-6 pb-10 max-w-6xl mx-auto">
        {error && (
          <div className="mb-4 rounded bg-red-500/15 border border-red-400/40 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-4 rounded bg-green-500/15 border border-green-400/40 px-4 py-2 text-sm text-green-200">
            {notice}
          </div>
        )}

        <div className="flex gap-3 mb-4">
          {TABS.map((t) => (
            <MetalButton
              key={t}
              tone={tab === t ? "gold" : ""}
              onClick={() => setTab(t)}
            >
              {t === "Sales" ? `Sales (${sales.length})` : t}
            </MetalButton>
          ))}
        </div>

        {tab === "Bidding" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="rounded-xl bg-white/5 border border-white/10 p-6">
              <h2 className="font-bold mb-1">Quick bid (ladder)</h2>
              <p className="text-xs text-white/50 mb-4">Tap a team — next ladder price applies automatically.</p>
              <div className="grid grid-cols-2 gap-2.5">
                {teams.map((t) => (
                  <button
                    key={t.id}
                    disabled={busy || !bidding}
                    onClick={() => run(() => placeBid(t.id), `Bid recorded for ${t.team_name}`)}
                    className="bc-btn rounded-md px-3 py-2.5 disabled:opacity-40 text-sm"
                  >
                    <span className="flex justify-between items-center gap-2">
                      <span className="font-extrabold tracking-wide">{t.team_name}</span>
                      <span className="bc-gold-text font-extrabold">₹{formatPrice(t.purse)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-xl bg-white/5 border border-white/10 p-6">
              <h2 className="font-bold mb-1">Set custom price</h2>
              <p className="text-xs text-white/50 mb-4">
                Fix any price you announce on stage — must beat the current bid and fit the purse.
              </p>
              <label className="block text-xs text-white/50 mb-1">Team</label>
              <select
                value={customTeam}
                onChange={(e) => setCustomTeam(e.target.value)}
                className="w-full mb-3 rounded-lg bg-white/10 px-3 py-2.5 text-sm text-white"
              >
                <option value="">Select team…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id} className="text-black">
                    {t.team_name} (₹{formatPrice(t.purse)})
                  </option>
                ))}
              </select>
              <label className="block text-xs text-white/50 mb-1">Price (Lakh)</label>
              <input
                type="number"
                min="1"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder={`e.g. ${(state?.current_bid ?? 0) + 20 || player?.base_price || 200}`}
                className="w-full mb-3 rounded-lg bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30"
              />
              <MetalButton
                tone="gold"
                disabled={busy || !bidding}
                onClick={setCustomBid}
                className="w-full"
              >
                Set bid
              </MetalButton>
              <p className="mt-3 text-xs text-white/50">
                Current: ₹{formatPrice(state?.current_bid ?? 0)}
                {state?.bidding_team ? ` (${state.bidding_team.team_name})` : ""} · Base: ₹
                {formatPrice(player?.base_price ?? 0)}
              </p>
            </section>
          </div>
        )}

        {tab === "Sales" && (
          <section className="rounded-xl bg-white/5 border border-white/10 p-6 overflow-x-auto">
            <h2 className="font-bold mb-4">Sold players</h2>
            {!sales.length ? (
              <p className="text-white/50 text-sm">Nothing sold yet.</p>
            ) : (
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-white/50">
                    <th className="py-2 pr-4">Player</th>
                    <th className="py-2 pr-4">Team</th>
                    <th className="py-2 pr-4 text-right">Price</th>
                    <th className="py-2 pr-4">Sold at</th>
                    <th className="py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((p) => (
                    <tr key={p.id} className="border-t border-white/10">
                      <td className="py-2 pr-4 font-semibold">{p.player_name}</td>
                      <td className="py-2 pr-4">{p.sold_to_team}</td>
                      <td className="py-2 pr-4 text-right text-yellow-300 font-bold">
                        ₹{formatPrice(p.final_price)}
                      </td>
                      <td className="py-2 pr-4 text-white/50">
                        {p.time_of_selling ? new Date(p.time_of_selling).toLocaleString() : "—"}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          disabled={busy}
                          onClick={() => {
                            if (window.confirm(`Reset sale of ${p.player_name}? Purse will be refunded.`)) {
                              run(() => resetSale(p.id), `Sale reset for ${p.player_name}`);
                            }
                          }}
                          className="bg-red-600/80 px-3 py-1 rounded text-xs font-bold hover:bg-red-500 disabled:opacity-40"
                        >
                          Reset sale
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        {tab === "Logs" && (
          <section className="rounded-xl bg-white/5 border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Event log</h2>
              <button onClick={refreshTab} className="text-xs bg-white/10 px-3 py-1.5 rounded hover:bg-white/20">
                Refresh
              </button>
            </div>
            {!logs.length ? (
              <p className="text-white/50 text-sm">No events yet.</p>
            ) : (
              <ul className="space-y-1.5 text-sm max-h-[60vh] overflow-auto">
                {logs.map((l) => (
                  <li key={l.id} className="flex gap-3 bg-white/5 rounded px-3 py-2">
                    <span
                      className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded h-fit ${
                        l.type === "SOLD"
                          ? "bg-green-600"
                          : l.type === "BID"
                            ? "bg-blue-600"
                            : l.type === "UNSOLD"
                              ? "bg-orange-600"
                              : l.type === "RESET_SALE"
                                ? "bg-red-600"
                                : "bg-white/20"
                      }`}
                    >
                      {l.type}
                    </span>
                    <span className="flex-1">{l.message ?? "—"}</span>
                    <span className="text-white/40 text-xs shrink-0">
                      {l.created_at ? new Date(l.created_at).toLocaleTimeString() : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
