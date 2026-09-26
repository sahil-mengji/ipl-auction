import { useCallback, useEffect, useState } from "react";
import { getSocket, onSocket } from "./socket";
import {
  getAuctionLogs,
  getAuctionSales,
  getAuctionState,
  getPlayers,
  getTeams,
} from "./auctionApi";
import { normalizeAuctionState } from "./backendApi";
import { readBid, subscribeBid } from "./liveBid";

// Live auction data over websockets — replaces 2s polling.
// options: { sales, logs, players, salesLimit, logsLimit }
export const useLiveAuction = (options = {}) => {
  const {
    sales: wantSales = false,
    logs: wantLogs = false,
    players: wantPlayers = false,
    logsLimit = 10,
  } = options;
  const [state, setState] = useState(null);
  const [teams, setTeams] = useState([]);
  const [sales, setSales] = useState([]);
  const [logs, setLogs] = useState([]);
  const [players, setPlayers] = useState([]);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);

  const refreshTeams = useCallback(async () => {
    try {
      setTeams(await getTeams());
    } catch {
      /* keep stale */
    }
  }, []);

  const refreshSales = useCallback(async () => {
    if (!wantSales) return;
    try {
      setSales(await getAuctionSales());
    } catch {
      /* keep stale */
    }
  }, [wantSales]);

  const refreshLogs = useCallback(async (limit = logsLimit) => {
    if (!wantLogs) return;
    try {
      setLogs(await getAuctionLogs(limit));
    } catch {
      /* keep stale */
    }
  }, [wantLogs, logsLimit]);

  const refreshPlayers = useCallback(async () => {
    if (!wantPlayers) return;
    try {
      setPlayers(await getPlayers());
    } catch {
      /* keep stale */
    }
  }, [wantPlayers]);

  const refreshAll = useCallback(async () => {
    try {
      const [s, t] = await Promise.all([getAuctionState(), getTeams()]);
      setState(s);
      setTeams(t);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
    await Promise.all([refreshSales(), refreshLogs(), refreshPlayers()]);
  }, [refreshSales, refreshLogs, refreshPlayers]);

  useEffect(() => {
    refreshAll();
    const offState = onSocket("auction:state", (s) => {
      try {
        setState(normalizeAuctionState(s));
        setError(null);
      } catch {
        /* ignore malformed push */
      }
    });
    const offInvalidate = onSocket("auction:invalidate", (flags = {}) => {
      if (flags.sales) refreshSales();
      if (flags.logs) refreshLogs();
      if (flags.players) refreshPlayers();
      if (flags.teams) refreshTeams();
    });
    const offConnect = onSocket("connect", () => {
      setConnected(true);
      refreshAll();
    });
    const offDisconnect = onSocket("disconnect", () => setConnected(false));
    if (getSocket().connected) setConnected(true);
    // Safety net: full refresh every 30s in case a push was missed.
    const id = setInterval(refreshAll, 30000);
    return () => {
      offState();
      offInvalidate();
      offConnect();
      offDisconnect();
      clearInterval(id);
    };
  }, [refreshAll, refreshSales, refreshLogs, refreshPlayers, refreshTeams]);

  return {
    state,
    setState,
    teams,
    sales,
    logs,
    players,
    error,
    setError,
    connected,
    refreshAll,
    refreshSales,
    refreshLogs,
    refreshPlayers,
  };
};

// The running bid while a lot is open — never touches the backend, just
// BroadcastChannel/localStorage between /control and the live screen on
// the same browser (see utils/liveBid.js). `forPlayerId` scopes it: a bid
// for a different (stale) lot reads as empty instead of showing carry-over.
export const useLiveBid = (forPlayerId) => {
  const [bid, setBid] = useState(readBid);
  useEffect(() => subscribeBid(setBid), []);
  if (forPlayerId != null && bid.playerId !== forPlayerId) {
    return { playerId: null, amount: 0, teamId: null, team: null, ts: 0 };
  }
  return bid;
};

// Remote display prefs for the audience screen (driven from /control).
export const useDisplay = () => {
  const [display, setDisplay] = useState({
    showWidget: true,
    celebration: true,
    sounds: true,
    trumpet: true,
    liveView: "bidding",
    breakEndsAt: null,
    cycle: false,
  });
  useEffect(() => onSocket("display:state", (d) => setDisplay({ ...d })), []);
  return display;
};
