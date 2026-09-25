/* eslint-disable react/prop-types */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import GodRaysBg from "../components/GodRaysBg";
import MetalButton from "../components/broadcast/MetalButton";
import TrapHeader from "../components/broadcast/TrapHeader";
import {
  formatPrice,
  getAuctionState,
  getPlayers,
  movePlayer,
  requeuePlayers,
  resetSale,
  setPlayerStatus,
  startLot,
} from "../utils/auctionApi";

// Extra control page: full player list in auction-queue order with
// reorder arrows, pool/unsold status flips, and per-sale fund release
// (purse refunded to the buying team).
const statusOf = (p) => {
  const tid = p.sold_to_team_id ?? 0;
  if (tid > 0) return "SOLD";
  if (tid === -1) return "RETRY";
  return "POOL";
};

export default function PlayerOrder({ bare = false }) {
  const [players, setPlayers] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [liveId, setLiveId] = useState(null);
  const [liveStatus, setLiveStatus] = useState("IDLE");
  const [nextId, setNextId] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [list, st] = await Promise.all([getPlayers(), getAuctionState()]);
      setLiveId(st?.player?.id ?? st?.current_player_id ?? null);
      setLiveStatus(st?.status ?? "IDLE");
      setNextId(st?.next_player?.id ?? null);
      setPlayers((list ?? []).slice().sort((a, b) => {
        const qa = (a.sold_to_team_id ?? 0) > 0 ? 1 : 0;
        const qb = (b.sold_to_team_id ?? 0) > 0 ? 1 : 0;
        if (qa !== qb) return qa - qb;
        return (
          (a.auction_order ?? 0) - (b.auction_order ?? 0) || (a.id ?? 0) - (b.id ?? 0)
        );
      }));
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const run = async (id, fn, okMsg) => {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      await fn();
      if (okMsg) setNotice(okMsg);
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const releaseFunds = (p) => {    if (
      window.confirm(
        `Release funds: ${p.player_name} returns to the pool and ₹${formatPrice(p.final_price)} is refunded to ${p.sold_to_team}?`,
      )
    ) {
      run(p.id, () => resetSale(p.id), `Funds released for ${p.player_name}`);
    }
  };

  // Jump a queued player straight to a typed position (1-based).
  const jumpTo = async (p, raw) => {
    const to = Math.max(
      1,
      Math.min(queued.length, Number.parseInt(raw, 10) || 0),
    );
    if (!to) return;
    const ids = queued.map((q) => q.id).filter((x) => x !== p.id);
    ids.splice(to - 1, 0, p.id);
    setPlayers((prev) => {
      const byId = new Map(prev.map((x) => [x.id, x]));
      return [
        ...ids.map((x) => byId.get(x)).filter(Boolean),
        ...prev.filter((x) => (x.sold_to_team_id ?? 0) > 0),
      ];
    });
    await run(p.id, () => requeuePlayers(ids), `${p.player_name} moved to #${to}`);
  };

  // Open bidding on any queued player (replaces the live lot after confirm).
  const startBidding = (p) => {
    if (liveStatus === "BIDDING" && p.id !== liveId) {
      if (!window.confirm(`Replace the live lot with ${p.player_name}?`)) return;
    }
    run(p.id, () => startLot(p.id), `Bidding opened for ${p.player_name}`);
  };

  const queued = players.filter((p) => (p.sold_to_team_id ?? 0) <= 0);

  // Drag-and-drop queue reorder.
  const [dragId, setDragId] = useState(null);
  const [overTarget, setOverTarget] = useState(null); // { id, after }

  const onDropRow = async (e, id) => {
    e.preventDefault();
    const target =
      overTarget && overTarget.id === id ? overTarget : { id, after: false };
    const from = dragId ?? Number(e.dataTransfer.getData("text/plain"));
    setDragId(null);
    setOverTarget(null);
    if (!from || from === id) return;
    const ids = queued.map((q) => q.id).filter((x) => x !== from);
    let at = ids.indexOf(id);
    if (at < 0) return;
    if (target.after) at += 1;
    ids.splice(at, 0, from);
    // Optimistic reorder; server confirm + refresh follows.
    setPlayers((prev) => {
      const byId = new Map(prev.map((p) => [p.id, p]));
      return [
        ...ids.map((x) => byId.get(x)).filter(Boolean),
        ...prev.filter((p) => (p.sold_to_team_id ?? 0) > 0),
      ];
    });
    await run(from, () => requeuePlayers(ids), "Queue order saved");
  };

  return (
    <div
      data-theme="broadcast"
      className="min-h-screen bc-shell-bg text-white overflow-x-clip relative"
    >
      {!bare && (
        <>
          <GodRaysBg />
          <img
            src="pattern.svg"
            alt=""
            aria-hidden="true"
            className="bc-spin-slow absolute left-1/2 top-20 z-[1] w-[50vw] opacity-30 pointer-events-none"
          />
          <img
            src="https://ecell.nitk.ac.in/navLogo.png"
            alt=""
            className="w-40 absolute z-40 top-5 left-4"
          />
          <div className="absolute z-40 bottom-4 left-4 flex gap-2">
            <Link to="/">
              <MetalButton>Home</MetalButton>
            </Link>
            <Link to="/control">
              <MetalButton>Control</MetalButton>
            </Link>
          </div>
        </>
      )}

      <div className="relative z-10 px-6 pt-4 pb-16">
        {!bare && (
          <>
            <div className="w-full">
              <img src="title.svg" className="h-48 mx-auto relative" />
            </div>
            <div className="flex justify-center mt-2 mb-6">
              <TrapHeader gold>Player order</TrapHeader>
            </div>
          </>
        )}

        <div className="max-w-6xl mx-auto">
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
          <div className="bc-steel-panel px-4 py-4 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-white/50">
                  <th className="py-2 pr-3 w-10">#</th>
                  <th className="py-2 pr-3">Player</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3 text-right">Base</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Sold to / Price</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const st = statusOf(p);
                  const isQueued = st !== "SOLD";
                  const qi = queued.findIndex((q) => q.id === p.id);
                  const busy = busyId === p.id;
                  const isLive = p.id === liveId && liveStatus === "BIDDING";
                  const isNext = isQueued && !isLive && p.id === nextId;
                  return (
                    <tr
                      key={p.id}
                      draggable={isQueued}
                      onDragStart={(e) => {                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", String(p.id));
                        setDragId(p.id);
                      }}
                      onDragOver={
                        isQueued
                          ? (e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                              const rect = e.currentTarget.getBoundingClientRect();
                              const after = e.clientY - rect.top > rect.height / 2;
                              setOverTarget((prev) =>
                                prev && prev.id === p.id && prev.after === after
                                  ? prev
                                  : { id: p.id, after },
                              );
                            }
                          : undefined
                      }
                      onDrop={isQueued ? (e) => onDropRow(e, p.id) : undefined}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverTarget(null);
                      }}
                      className={`border-t border-white/10 ${
                        isQueued ? "cursor-grab" : ""
                      } ${dragId === p.id ? "opacity-40" : ""} ${
                        isLive ? "bg-yellow-300/10" : ""
                      } ${
                        overTarget?.id === p.id
                          ? overTarget.after
                            ? "border-b-2 border-b-yellow-300"
                            : "border-t-2 border-t-yellow-300"
                          : ""
                      }`}
                    >
                      <td className="py-2 pr-3 text-white/50 font-bold">
                        <span className="mr-1 text-white/30">{isQueued ? "⋮⋮" : ""}</span>
                        {isQueued ? (
                          <input
                            key={`${p.id}-${qi}`}
                            type="number"
                            min={1}
                            max={queued.length}
                            defaultValue={qi + 1}
                            title="Type a position + Enter to jump"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.currentTarget.blur();
                            }}
                            onBlur={(e) => {
                              if (e.currentTarget.value !== "") {
                                jumpTo(p, e.currentTarget.value);
                              }
                            }}
                            onFocus={(e) => e.currentTarget.select()}
                            className="w-14 rounded bg-white/10 px-1.5 py-0.5 text-center text-white font-bold"
                          />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <span className="flex items-center gap-2">
                          {p.player_image ? (
                            <img
                              src={p.player_image}
                              alt={p.player_name}
                              className="h-8 w-8 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <span className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center font-extrabold shrink-0">
                              {(p.player_name ?? "?").slice(0, 1)}
                            </span>
                          )}
                          <span className="font-semibold">
                            {(p.is_overseas ? "✈ " : "") + (p.player_name ?? "")}
                          </span>
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-white/60 text-xs">
                        {p.category ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        ₹{formatPrice(p.base_price ?? 0)}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                            st === "SOLD"
                              ? "bg-green-600"
                              : st === "RETRY"
                                ? "bg-orange-600"
                                : "bg-white/20"
                          }`}
                        >
                          {st === "RETRY" ? "UNSOLD · RETRY" : st}
                        </span>{" "}
                        {isLive && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-600 animate-pulse">
                            ● LIVE
                          </span>
                        )}
                        {isNext && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-600">
                            NEXT
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {st === "SOLD" ? (
                          <span>
                            {p.sold_to_team}{" "}
                            <b className="text-yellow-300">
                              ₹{formatPrice(p.final_price ?? 0)}
                            </b>
                          </span>
                        ) : (
                          <span className="text-white/40">—</span>
                        )}
                      </td>
                      <td className="py-2">
                        <span className="flex gap-1.5 justify-end">
                          {isQueued && !isLive && (
                            <button
                              disabled={busy}
                              onClick={() => startBidding(p)}
                              className="bg-green-600/80 px-2.5 py-1 rounded text-xs font-bold hover:bg-green-500 disabled:opacity-40"
                              title="Open bidding on this player now"
                            >
                              ▶ Bid
                            </button>
                          )}
                          {isQueued && (
                            <>
                              <button
                                disabled={busy || qi <= 0}
                                onClick={() =>
                                  run(p.id, () => movePlayer(p.id, "up"), null)
                                }
                                className="bg-white/10 px-2.5 py-1 rounded text-sm font-bold hover:bg-white/20 disabled:opacity-40"
                                title="Move up the queue"
                              >
                                ↑
                              </button>
                              <button
                                disabled={busy || qi < 0 || qi >= queued.length - 1}
                                onClick={() =>
                                  run(p.id, () => movePlayer(p.id, "down"), null)
                                }
                                className="bg-white/10 px-2.5 py-1 rounded text-sm font-bold hover:bg-white/20 disabled:opacity-40"
                                title="Move down the queue"
                              >
                                ↓
                              </button>
                              {st === "POOL" ? (
                                <button
                                  disabled={busy}
                                  onClick={() =>
                                    run(p.id, () => setPlayerStatus(p.id, "unsold"), null)
                                  }
                                  className="bg-white/10 px-2.5 py-1 rounded text-xs font-bold hover:bg-white/20 disabled:opacity-40"
                                  title="Mark as passed (stays queued at the end on resale)"
                                >
                                  Unsold
                                </button>
                              ) : (
                                <button
                                  disabled={busy}
                                  onClick={() =>
                                    run(p.id, () => setPlayerStatus(p.id, "pool"), null)
                                  }
                                  className="bg-white/10 px-2.5 py-1 rounded text-xs font-bold hover:bg-white/20 disabled:opacity-40"
                                  title="Back to fresh pool"
                                >
                                  To pool
                                </button>
                              )}
                            </>
                          )}
                          {st === "SOLD" && (
                            <button
                              disabled={busy}
                              onClick={() => releaseFunds(p)}
                              className="bg-red-600/80 px-3 py-1 rounded text-xs font-bold hover:bg-red-500 disabled:opacity-40"
                              title="Refund the buying team, player returns to pool"
                            >
                              Release funds
                            </button>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!players.length && (
              <p className="text-white/50 text-sm py-6 text-center">
                No players found.
              </p>
            )}
          </div>
          <p className="text-white/40 text-xs mt-3 text-center">
            Passed (unsold) players sit at the end of the queue and come back
            for a second attempt · sold players keep their order · ▶ starts
            here — auto-start then continues down the list, skipping the sold
          </p>
        </div>
      </div>
    </div>
  );
}
