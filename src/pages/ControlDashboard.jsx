/* eslint-disable react/prop-types */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import TrapHeader from "../components/broadcast/TrapHeader";
import { teamTextColor } from "../components/CurrentBidWidget";
import MetalButton from "../components/broadcast/MetalButton";
import AnimatedNumber from "../components/AnimatedNumber";
import SoundBar from "../components/SoundBar";
import PlayerOrder from "./PlayerOrder";
import { fetchPrevPlayer } from "../utils/previousPlayer.js";
import { fetchUnsoldPlayers } from "../utils/getUnSoldPlayers";
import { emitSocket, getSocket } from "../utils/socket";
import { useDisplay, useLiveAuction } from "../utils/useLiveAuction";
import { playBidPlaced, playTrumpet } from "../utils/sound";
import {
  formatPrice,
  getHealthDb,
  hammerSold,
  markLotUnsold,
  nextLot,
  nukeDatabase,
  placeBid,
  resetSale,
  startLot,
  undoLastBid,
} from "../utils/auctionApi";

const TABS = [
  {
    id: "Bidding",
    label: "Bidding",
    hint: "Pick a team, set the price, hammer it down.",
  },
  {
    id: "Live",
    label: "Live screen",
    hint: "Drive the broadcast ( / ): views, break clock, sounds.",
  },
  {
    id: "Players",
    label: "Players",
    hint: "Queue order, pool status, refunds, start any lot.",
  },
  {
    id: "Sales",
    label: "Sales",
    hint: "Sold lots, hammer prices, undo a sale.",
  },
  {
    id: "Logs",
    label: "Event log",
    hint: "Every bid, sale and reset, newest last.",
  },
  {
    id: "Health",
    label: "Health",
    hint: "Backend, database and socket status at a glance.",
  },
];

// Auctioneer screen: left rail (30%) shows current / past / next player,
// right side (70%) holds every control (status actions, tabs, tables).
// Same bg stack + theme toggle + widget as the other screens.

// Compact player row for the left rail.
function RailPlayer({ name, image, lines, emptyText }) {
  if (!name) {
    return (
      <p className="text-white/50 text-sm py-4 border border-dashed border-white/15 rounded-lg text-center">
        {emptyText}
      </p>
    );
  }
  return (
    <div className="bc-team-row px-3 py-2">
      <div className="flex items-center gap-3">
        {image ? (
          <img
            src={image}
            alt={name}
            className="h-12 w-12 rounded-full object-cover object-center border border-white/30 shrink-0"
          />
        ) : (
          <span className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-xl font-extrabold shrink-0">
            {(name ?? "?").slice(0, 1)}
          </span>
        )}
        <div className="min-w-0">
          <p className="font-extrabold truncate">{name}</p>
          {lines}
        </div>
      </div>
    </div>
  );
}

// Break-timer remote for the Live tab: shared countdown every break
// screen follows, with a live remaining readout.
function BreakControls() {
  const display = useDisplay();
  const [now, setNow] = useState(() => Date.now());
  const [mins, setMins] = useState("5");
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const endsAt = display.breakEndsAt ?? null;
  const leftMs = endsAt != null ? endsAt - now : null;
  const fmt = (ms) => {
    if (ms <= 0) return "ended";
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };
  const shift = (ms) =>
    emitSocket("display:set", { breakEndsAt: (endsAt ?? Date.now()) + ms });
  return (
    <div>
      <h2 className="font-bold mb-1">Break timer</h2>
      <p className="text-xs text-white/50 mb-4">
        {endsAt != null ? (
          <>Remaining: <b className="bc-gold-text text-sm">{fmt(leftMs)}</b></>
        ) : (
          "Not running — every break screen runs its own clock until you start this."
        )}
      </p>
      <div className="flex flex-wrap gap-2">
        <MetalButton onClick={() => emitSocket("display:set", { breakEndsAt: Date.now() + 5 * 60 * 1000 })}>
          Start 5:00
        </MetalButton>
        <MetalButton onClick={() => shift(5 * 60 * 1000)}>+5</MetalButton>
        <MetalButton onClick={() => shift(30 * 60 * 1000)}>+30</MetalButton>
        <MetalButton onClick={() => shift(-5 * 60 * 1000)}>-5</MetalButton>
        <MetalButton tone="danger" onClick={() => emitSocket("display:set", { breakEndsAt: null })}>
          End break
        </MetalButton>
      </div>
      <div className="flex items-center gap-2 mt-3">
        <input
          type="number"
          min={1}
          value={mins}
          onChange={(e) => setMins(e.target.value)}
          className="w-24 rounded-lg bg-white/10 px-3 py-2 text-sm text-white"
          title="Break length in minutes"
        />
        <span className="text-xs text-white/50">min</span>
        <MetalButton
          tone="gold"
          onClick={() => {
            const m = Number(mins);
            if (Number.isFinite(m) && m > 0) {
              emitSocket("display:set", { breakEndsAt: Date.now() + m * 60 * 1000 });
            }
          }}
        >
          Set timer
        </MetalButton>
      </div>
    </div>
  );
}

// Health tab: backend + database + socket status cards, self-refreshing.
function HealthPanel() {
  const [health, setHealth] = useState(null);
  const [sockOk, setSockOk] = useState(false);
  const [sockId, setSockId] = useState(null);
  const [checking, setChecking] = useState(false);
  const [nukeText, setNukeText] = useState("");
  const [nuking, setNuking] = useState(false);
  const [nukeResult, setNukeResult] = useState(null);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      setHealth(await getHealthDb());
    } catch (e) {
      setHealth({ ok: false, error: e.message });
    }
    try {
      const s = getSocket();
      setSockOk(s.connected);
      setSockId(s.id ?? null);
    } catch {
      setSockOk(false);
      setSockId(null);
    }
    setChecking(false);
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, [check]);

  const nuke = async () => {
    if (nukeText !== "NUKE") return;
    setNuking(true);
    setNukeResult(null);
    try {
      const r = await nukeDatabase();
      setNukeResult(`Reset complete — ${r.refundedSales} sale(s) refunded.`);
      setNukeText("");
      check();
    } catch (e) {
      setNukeResult(`Failed: ${e.message}`);
    } finally {
      setNuking(false);
    }
  };

  const dot = (ok) => (
    <span
      className={`inline-block h-3 w-3 rounded-full ${ok ? "bg-green-400" : "bg-red-500"}`}
    />
  );

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold">System health</h2>
        <button
          onClick={check}
          disabled={checking}
          className="text-xs bg-white/10 px-3 py-1.5 rounded hover:bg-white/20 disabled:opacity-40"
        >
          {checking ? "Checking…" : "Refresh"}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/15 p-4">
          <p className="flex items-center gap-2 font-bold mb-2">
            {dot(health?.ok)} Backend
          </p>
          {health == null ? (
            <p className="text-xs text-white/50">Checking…</p>
          ) : health.ok ? (
            <>
              <p className="text-2xl font-extrabold bc-gold-text">
                {health.latencyMs} ms
              </p>
              <p className="text-xs text-white/50 mt-1">DB round-trip</p>
              <p className="text-xs text-white/50">
                {health.time ? new Date(health.time).toLocaleTimeString() : ""}
              </p>
            </>
          ) : (
            <p className="text-xs text-red-300">{health.error ?? "Unreachable"}</p>
          )}
        </div>
        <div className="rounded-xl border border-white/15 p-4">
          <p className="flex items-center gap-2 font-bold mb-2">
            {dot(health?.ok)} Database
          </p>
          {health?.ok ? (
            <div className="text-sm flex flex-col gap-1">
              {[
                ["Teams", health.teams],
                ["Players", health.players],
                ["Log events", health.logs],
                ["Display prefs", health.displayPrefs],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-white/10 py-1">
                  <span className="text-white/50">{k}</span>
                  <b>{v}</b>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/50">
              {health == null ? "Checking…" : "No data — backend unreachable."}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-white/15 p-4">
          <p className="flex items-center gap-2 font-bold mb-2">
            {dot(sockOk)} Live socket
          </p>
          <p className="text-sm">{sockOk ? "Connected" : "Disconnected"}</p>
          {sockId && (
            <p className="text-xs text-white/50 mt-1 break-all">id: {sockId}</p>
          )}
          <p className="text-xs text-white/50 mt-2">
            Bids, sales and view switches push instantly while connected.
          </p>
        </div>
      </div>
      <div className="rounded-xl border border-red-500/50 p-4 mt-4">
        <p className="font-bold text-red-300 mb-1">Danger zone — nuke database</p>
        <p className="text-xs text-white/50 mb-3">
          Resets every sale, clears all logs, refunds every purse, parks the
          desk at IDLE. Teams and players stay. Type{" "}
          <b className="text-white">NUKE</b> to arm the button.
        </p>
        <div className="flex items-center gap-2">
          <input
            value={nukeText}
            onChange={(e) => setNukeText(e.target.value)}
            placeholder="Type NUKE"
            className="w-40 rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder-white/30"
          />
          <button
            onClick={nuke}
            disabled={nuking || nukeText !== "NUKE"}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-extrabold hover:bg-red-500 disabled:opacity-40"
          >
            {nuking ? "Nuking…" : "Nuke database"}
          </button>
        </div>
        {nukeResult && (
          <p className="text-xs mt-2 text-white/70">{nukeResult}</p>
        )}
      </div>
    </div>
  );
}

export default function ControlDashboard() {
  const [tab, setTab] = useState("Bidding");
  const {
    state,
    setState,
    teams,
    sales,
    logs,
    error,
    setError,
    refreshSales,
    refreshLogs,
  } = useLiveAuction({ sales: true, logs: tab === "Logs" });
  const display = useDisplay();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [customTeam, setCustomTeam] = useState("");
  const [prevPlayer, setPrevPlayer] = useState(null);
  const [nextPlayer, setNextPlayer] = useState(null);
  // Becomes true once the lot resolves (sold / unsold) — gates Next + Start.
  const [lotResolved, setLotResolved] = useState(false);
  const [theme, setTheme] = useState(
    () => window.localStorage.getItem("ipl-theme") || "broadcast",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("ipl-theme", theme);
  }, [theme]);

  const player = state?.player ?? null;
  const status = state?.status ?? "IDLE";
  const bidding = status === "BIDDING";

  const run = async (fn, okMsg) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const s = await fn();
      setState(s);
      if (okMsg) setNotice(okMsg);
      // Socket invalidate echoes back too — belt and suspenders.
      refreshSales();
      refreshLogs();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Sounds on live changes: bid blips, sold fanfare.
  const prevLive = useRef({ bid: 0, status: "IDLE", playerId: null });
  useEffect(() => {
    const p = prevLive.current;
    const b = Number(state?.current_bid ?? 0);
    const st = state?.status ?? "IDLE";
    const sameLot = state?.player?.id === p.playerId;
    if (sameLot && b > p.bid) playBidPlaced();
    if (st === "SOLD" && p.status !== "SOLD" && display.trumpet) {
      playTrumpet();
    }
    prevLive.current = { bid: b, status: st, playerId: state?.player?.id };
  }, [state, display.trumpet]);

  // Fresh lists whenever the Logs tab opens.
  useEffect(() => {
    if (tab === "Logs") refreshLogs();
  }, [tab, refreshLogs]);

  const currentBid = Number(state?.current_bid ?? 0);
  const basePrice = Number(player?.base_price ?? 0);
  // Floor: beat the live bid, or at least meet base on a fresh lot.
  const minBid = currentBid > 0 ? currentBid + 1 : basePrice;

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
    if (amount < minBid) {
      setError(
        currentBid > 0
          ? `Bid must beat the current ₹${formatPrice(currentBid)}.`
          : `First bid must meet the ₹${formatPrice(basePrice)} base price.`,
      );
      return;
    }
    run(() => placeBid(Number(customTeam), amount), `Custom bid ₹${amount}L recorded`);
  };

  // Custom price field tracks the live bid until the auctioneer types:
  // reset to base on a new lot, follow the current bid while untouched.
  const [priceDirty, setPriceDirty] = useState(false);
  useEffect(() => {
    setCustomAmount(String(player?.base_price ?? state?.current_bid ?? "") || "");
    setPriceDirty(false);
    setCustomTeam("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.id]);
  useEffect(() => {
    if (!priceDirty) {
      setCustomAmount(String(state?.current_bid || player?.base_price || ""));
    }
  }, [state?.current_bid, player?.base_price, priceDirty]);

  // Most recent sale first — powers "Undo last sale".
  const latestSale = (sales ?? [])
    .filter((p) => (p.sold_to_team_id ?? 0) > 0)
    .slice()
    .sort(
      (a, b) =>
        new Date(b.time_of_selling ?? 0).getTime() -
        new Date(a.time_of_selling ?? 0).getTime(),
    )[0];

  const undoLastSale = () => {
    if (!latestSale) return;
    if (
      window.confirm(
        `Undo sale of ${latestSale.player_name} to ${latestSale.sold_to_team}? Purse will be refunded.`,
      )
    ) {
      run(() => resetSale(latestSale.id), `Sale undone for ${latestSale.player_name}`);
    }
  };

  const bumpAmount = (step) => {
    setPriceDirty(true);
    setCustomAmount((prev) => {
      const next =
        (Number(prev) || state?.current_bid || player?.base_price || 0) + step;
      return String(Math.max(next, minBid || 0));
    });
  };

  // Number-key team selection: 1-9 pick teams 1-9, 0 picks team 10.
  // Skipped while typing in the price field.
  useEffect(() => {
    const onKey = (e) => {
      if (busy || !bidding) return;
      if (!/^[0-9]$/.test(e.key)) return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const idx = e.key === "0" ? 9 : Number(e.key) - 1;
      if (idx < teams.length) setCustomTeam(String(teams[idx].id));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [teams, busy, bidding]);

  // Shortcut label for team i (0-based): 1..9, then 0.
  const teamKey = (i) => ((i + 1) % 10).toString();
  useEffect(() => {
    let alive = true;
    fetchPrevPlayer()
      .then((d) => {
        if (alive) setPrevPlayer(d?.[0] ?? null);
      })
      .catch(() => {});
    fetchUnsoldPlayers()
      .then((list) => {
        if (!alive) return;
        const pool = list ?? [];
        // Server's true next lot wins; fall back to pool head.
        setNextPlayer(
          (state?.next_player && pool.find((p) => p.id === state.next_player.id)) ??
            pool.find((p) => p.id !== player?.id) ??
            null,
        );
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [player?.id, status, state?.next_player?.id]);

  // Left rail: current bid top-left, then the big current-player feature
  // card, then past (left) and next (right) side by side underneath.
  const leftRail = (
    <div className="flex flex-col gap-8">
      <div className="text-left">
        <p className="text-xs tracking-[0.25em] text-white/50 font-bold">
          Current bid
        </p>
        <p className="text-6xl font-extrabold bc-gold-text leading-none">
          ₹
          <AnimatedNumber
            value={state?.current_bid ?? 0}
            coin
            format={(v) => formatPrice(Math.round(v))}
          />
        </p>
        {state?.bidding_team && (
          <p className="text-sm font-bold text-white/80 mt-1">
            with {state.bidding_team.team_name}
          </p>
        )}
      </div>
      <div>
        <div className="mb-2">
          <TrapHeader gold>Current player</TrapHeader>
        </div>
        {!player ? (
          <p className="text-white/50 text-sm py-6 border border-dashed border-white/15 rounded-lg text-center">
            No active lot — hit “Start next player”
          </p>
        ) : (
          <div className="bc-steel-panel rounded-xl p-5 border-2 border-yellow-300/50">
            <div className="flex items-center gap-4">
              {player?.player_image ? (
                <img
                  src={player.player_image}
                  alt={player.player_name}
                  className="h-28 w-28 rounded-full object-cover object-center border-4 border-yellow-300/70 shrink-0"
                />
              ) : (
                <span className="h-28 w-28 rounded-full bg-white/10 flex items-center justify-center text-5xl font-extrabold shrink-0">
                  {(player?.player_name ?? "?").slice(0, 1)}
                </span>
              )}
              <div className="min-w-0">
                <p className="text-3xl font-extrabold bc-gold-text leading-tight truncate">
                  {player.player_name}
                </p>
                <p className="text-sm text-white/60 mt-1">
                  Base ₹{formatPrice(player?.base_price ?? 0)}
                  {player?.category ? ` · ${player.category}` : ""}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <div className="mb-2">
            <TrapHeader>Past player</TrapHeader>
          </div>
          <RailPlayer
            name={prevPlayer?.player_name}
            image={prevPlayer?.player_image}
            emptyText="Nothing sold yet"
            lines={
              prevPlayer && (
                <>
                  <p className="text-xs text-white/60">{prevPlayer?.sold_to_team}</p>
                  <p className="text-sm font-extrabold bc-gold-text">
                    ₹{formatPrice(prevPlayer?.final_price ?? 0)}
                  </p>
                </>
              )
            }
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="mb-2">
            <TrapHeader mirror>Next player</TrapHeader>
          </div>
          <RailPlayer
            name={nextPlayer?.player_name}
            image={nextPlayer?.player_image}
            emptyText="Pool empty"
            lines={
              nextPlayer && (
                <p className="text-xs text-white/60">
                  Base ₹{formatPrice(nextPlayer?.base_price ?? 0)}
                </p>
              )
            }
          />
        </div>
      </div>
      <div>
        <div className="mb-2">
          <TrapHeader>Team purses</TrapHeader>
        </div>
        <div className="flex flex-col gap-1.5">
          {teams.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-full pl-1.5 pr-3 py-1"
            >
              <span
                className="h-6 w-6 rounded-full border border-white/20 shrink-0"
                style={{
                  backgroundImage: `linear-gradient(135deg, #${t.color1}, #${t.color2})`,
                }}
              />
              <span className="flex-1 min-w-0 text-xs text-white font-bold truncate">
                {t.team_name}
              </span>
              <span className="text-xs font-extrabold bc-gold-text whitespace-nowrap">
                ₹{formatPrice(t.purse)}
              </span>
            </div>
                ))}
              </div>
            </div>
    </div>
  );

  return (
    <div className="h-screen overflow-hidden bc-shell-bg text-white">
      <div className="fixed z-40 bottom-4 left-4 flex gap-2">
        <button
          onClick={() => setTheme((t) => (t === "broadcast" ? "ice" : "broadcast"))}
          className="bg-white/10 text-white text-xs px-3 py-1.5 rounded hover:bg-white/20"
          title="Switch theme"
        >
          {theme === "broadcast" ? "Broadcast" : "❄ Ice"}
        </button>
        <span
          className={`text-xs font-bold px-3 py-1.5 rounded ${
            bidding ? "bg-yellow-400 text-black" : status === "SOLD" ? "bg-green-500" : "bg-white/15"
          }`}
        >
          {status}
        </span>
        <Link to="/" className="bg-white/10 text-xs px-3 py-1.5 rounded hover:bg-white/20">
          Live screen
        </Link>
      </div>

      <div className="relative z-10 h-full flex gap-10 px-10 py-10">
          {/* Left rail (30%): current / past / next player */}
          <div className="w-[30%] shrink-0 min-w-[300px] min-h-0 overflow-y-auto bc-scroll-hidden">
            {leftRail}
          </div>

          {/* Controls (70%) */}
          <div className="flex-1 min-w-0 min-h-0 overflow-y-auto bc-scroll-hidden px-10 pb-16">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-1.5 mb-2">
          <div className="flex gap-1" role="tablist" aria-label="Control sections">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-extrabold tracking-wide uppercase ${
                    active
                      ? "bg-yellow-300 text-black"
                      : "text-white/60 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {t.id === "Sales" ? `Sales (${sales.length})` : t.label}
                </button>
              );
            })}
          </div>
        </div>
        <p className="text-xs text-white/50 mb-8">
          {TABS.find((t) => t.id === tab)?.hint}
        </p>

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

        {tab === "Bidding" && (
          <>
        <div>
            <section>
              <h2 className="font-bold mb-1">1. Select team</h2>
              <p className="text-xs text-white/50 mb-4">Click, or press 1–9 / 0 — one team per bid.</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Bidding team">
                {teams.map((t, i) => {
                  const selected = String(customTeam) === String(t.id);
                  return (
                    <label
                      key={t.id}
                      title={`${t.team_name} (key ${teamKey(i)})`}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer shrink-0 max-w-[150px] ${
                        selected ? "outline outline-2 outline-yellow-300" : "outline outline-1 outline-black/40"
                      } ${busy || !bidding ? "opacity-40 pointer-events-none" : ""}`}
                      style={{
                        backgroundImage: `linear-gradient(135deg, #${t.color1}, #${t.color2})`,
                        color: teamTextColor(t.color1),
                      }}
                    >
                      <input
                        type="radio"
                        name="bid-team"
                        value={t.id}
                        checked={selected}
                        onChange={(e) => setCustomTeam(e.target.value)}
                        disabled={busy || !bidding}
                        className="sr-only"
                      />
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-black/45 text-[11px] font-extrabold text-white shrink-0">
                        {teamKey(i)}
                      </span>
                      <span className="font-extrabold tracking-wide text-sm leading-tight">
                        {t.team_name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </section>

            <section className="mt-10">
              <h2 className="font-bold mb-1">2. Set price</h2>
              <p className="text-xs text-white/50 mb-4">
                Prefilled with the current bid — bump it with the quick (+) options.
              </p>
              <label className="block text-xs text-white/50 mb-1">Price (Lakh)</label>
              <input
                type="number"
                min={minBid || 1}
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setPriceDirty(true);
                }}
                placeholder={`e.g. ${(state?.current_bid ?? 0) + 20 || player?.base_price || 200}`}
                className="w-full mb-1 rounded-lg bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30"
              />
              <p className="text-[11px] text-white/40 mb-3">
                Minimum: ₹{formatPrice(minBid)}
              </p>
              <div className="flex gap-2 mb-2">
                {[
                  { step: 1, label: "+1L" },
                  { step: 2, label: "+2L" },
                  { step: 3, label: "+3L" },
                  { step: 5, label: "+5L" },
                  { step: 10, label: "+10L" },
                  { step: 50, label: "+50L" },
                  { step: 100, label: "+1Cr" },
                ].map(({ step, label }) => (
                  <button
                    key={label}
                    title={`${label === "+1Cr" ? "1 Crore" : `${step} lakh`}`}
                    disabled={busy || !bidding}
                    onClick={() => bumpAmount(step)}
                    className="flex-1 rounded-lg border border-white/15 px-2 py-2 text-sm font-extrabold hover:border-yellow-300 disabled:opacity-40"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mb-3">
                {[
                  { step: 1, label: "-1L" },
                  { step: 2, label: "-2L" },
                  { step: 3, label: "-3L" },
                  { step: 5, label: "-5L" },
                  { step: 10, label: "-10L" },
                  { step: 50, label: "-50L" },
                  { step: 100, label: "-1Cr" },
                ].map(({ step, label }) => (
                  <button
                    key={label}
                    title={`Minus ${label === "-1Cr" ? "1 Crore" : `${step} lakh`}`}
                    disabled={busy || !bidding}
                    onClick={() => bumpAmount(-step)}
                    className="flex-1 rounded-lg border border-white/15 px-2 py-2 text-sm font-extrabold hover:border-red-400 disabled:opacity-40"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <MetalButton
                tone="gold"
                disabled={busy || !bidding}
                onClick={setCustomBid}
                className="w-full"
              >
                Set bid
              </MetalButton>
              {Number(customAmount) > 0 && (
                <p className="mt-2 text-sm text-center">
                  {Number(customAmount) >= minBid ? (
                    <>
                      <span className="text-white/60">
                        ₹{formatPrice(currentBid)} + ₹
                        {formatPrice(Number(customAmount) - currentBid)} =
                      </span>{" "}
                      <b className="bc-gold-text text-base">
                        ₹{formatPrice(Number(customAmount))}
                      </b>
                    </>
                  ) : (
                    <span className="text-red-300">
                      Below minimum ₹{formatPrice(minBid)}
                    </span>
                  )}
                </p>
              )}
              <p className="mt-3 text-xs text-white/50">
                Current: ₹{formatPrice(state?.current_bid ?? 0)}
                {state?.bidding_team ? ` (${state.bidding_team.team_name})` : ""} · Base: ₹
                {formatPrice(player?.base_price ?? 0)}
              </p>
            </section>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-8 mb-2">
          <div className="w-full">
            <h2 className="font-bold mb-1">3. Hammer actions</h2>
            <p className="text-xs text-white/50 mb-1">
              Close the lot, clear the desk, or take something back.
            </p>
          </div>
          <MetalButton
            tone="green"
            disabled={busy || !bidding || (state?.current_bid ?? 0) <= 0}
            onClick={() => {
              setLotResolved(true);
              run(() => hammerSold(), "Player SOLD — visible on /live");
            }}
          >
            Mark as sold
          </MetalButton>
          <MetalButton
            tone="danger"
            disabled={busy || !player || status === "IDLE"}
            onClick={() => {
              setLotResolved(true);
              run(() => markLotUnsold(), "Marked unsold");
            }}
          >
            Mark as unsold
          </MetalButton>
          {lotResolved && (
            <MetalButton
              disabled={busy || status === "BIDDING"}
              onClick={() => {
                setLotResolved(false);
                run(() => nextLot(), "Ready for next lot");
              }}
            >
              Next / Clear
            </MetalButton>
          )}
          {(lotResolved || (status !== "BIDDING" && player == null)) && (
            <MetalButton
              disabled={busy || bidding}
              onClick={() => {
                setLotResolved(false);
                run(() => startLot(), "Bidding opened");
              }}
            >
              Start next player
            </MetalButton>
          )}
          <span className="flex-1" />
          <MetalButton
            disabled={busy || !bidding || (state?.current_bid ?? 0) <= 0}
            onClick={() => run(() => undoLastBid(), "Last bid undone")}
          >
            Undo bid
          </MetalButton>
          <MetalButton disabled={busy || !latestSale} onClick={undoLastSale}>
            Undo last sale
          </MetalButton>
        </div>
          </>
        )}

        {tab === "Sales" && (
          <section className="overflow-x-auto py-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Sold players</h2>
              <MetalButton disabled={busy || !latestSale} onClick={undoLastSale}>
                Undo last sale
              </MetalButton>
            </div>
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
          <section className="py-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Event log</h2>
              <button onClick={() => refreshLogs()} className="text-xs bg-white/10 px-3 py-1.5 rounded hover:bg-white/20">
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

        {tab === "Live" && (
          <div className="py-2 flex flex-col gap-5">
            <div>
              <h2 className="font-bold mb-1">On the live screen ( / )</h2>
              <p className="text-xs text-white/50 mb-4">
                Pick what the crowd sees — switches instantly over the socket.
              </p>
              <div className="rounded-2xl bg-white/5 border border-white/10 p-1.5">
                <div className="flex gap-1 items-stretch" role="tablist" aria-label="Live screen view">
                  {[
                    ["bidding", "Bidding"],
                    ["squads", "Team squads"],
                    ["break", "Break"],
                    ["chart", "Chart"],
                  ].map(([view, label]) => {
                    const active = !display.cycle && display.liveView === view;
                    return (
                      <button
                        key={view}
                        role="tab"
                        aria-selected={active}
                        onClick={() => {
                          emitSocket("display:set", { cycle: false, liveView: view });
                        }}
                        className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-extrabold tracking-wide uppercase ${
                          active
                            ? "bg-yellow-300 text-black"
                            : "text-white/60 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                  <div className="w-px bg-white/10 mx-1" aria-hidden="true" />
                  <button
                    aria-pressed={display.cycle}
                    title="Auto-rotate chart · squads · break every 10s"
                    onClick={() => emitSocket("display:set", { cycle: !display.cycle })}
                    className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-extrabold tracking-wide uppercase ${
                      display.cycle
                        ? "bg-yellow-300 text-black"
                        : "text-white/60 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {display.cycle ? "⏸ Cycling" : "▶ Cycle / 10s"}
                  </button>
                </div>
              </div>
            </div>
            <BreakControls />
            <div>
              <h2 className="font-bold mb-1">Audience screen ( / )</h2>              <p className="text-xs text-white/50 mb-4">
                Remote-control what the crowd sees — pushes instantly over the socket.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  ["showWidget", "Bid widget (top-right)"],
                  ["celebration", "Celebration effects (stamp + confetti)"],
                  ["sounds", "Audience sounds"],
                  ["trumpet", "IPL trumpet sting"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer w-fit">
                    <input
                      type="checkbox"
                      checked={!!display[key]}
                      onChange={(e) => emitSocket("display:set", { [key]: e.target.checked })}
                      className="h-5 w-5 accent-yellow-400"
                    />
                    <span className="font-bold text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h2 className="font-bold mb-1">Sounds on this device</h2>
              <p className="text-xs text-white/50 mb-4">
                Bid blips, gavel, fanfare + ambient music — control room only.
              </p>
              <SoundBar />
            </div>
          </div>
        )}

        {tab === "Health" && <HealthPanel />}

        {tab === "Players" && (          <>
            <p className="text-xs text-white/50 mb-4">
              Drag rows or type a position to reorder · ▶ starts any lot ·
              Unsold/pool flips and fund releases apply instantly.
            </p>
            <PlayerOrder bare />
          </>
        )}
        </div>
      </div>
    </div>
  );
}
