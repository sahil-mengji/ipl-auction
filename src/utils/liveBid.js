// The live (in-progress) bid is intentionally never persisted anywhere —
// not in the database, not even as an event log. It only needs to travel
// from /control to the live screen, so it's kept purely in the browser:
// a BroadcastChannel for same-browser tabs (instant) plus localStorage as
// a fallback/late-join snapshot (storage event fires in *other* tabs, and
// reading the key on mount catches a tab opened after the last broadcast).
//
// Shape: { playerId, amount, teamId, team, ts }
// team is the denormalised {id, team_name, color1, color2} the widgets need
// so they don't have to cross-reference a teams list.

const CHANNEL_NAME = "ipl-auction:live-bid";
const STORAGE_KEY = "ipl-auction:live-bid";

const EMPTY_BID = { playerId: null, amount: 0, teamId: null, team: null, ts: 0 };

let channel = null;
try {
  channel = "BroadcastChannel" in window ? new BroadcastChannel(CHANNEL_NAME) : null;
} catch {
  channel = null;
}

// Same-tab listeners: neither `storage` nor a BroadcastChannel message is
// delivered back to the tab/document that sent it, so the control panel
// (which reads and writes the bid in the same tab) needs a direct fan-out
// to see its own publishes — cross-tab listeners still ride the channel.
const localListeners = new Set();

export const publishBid = (bid) => {
  const payload = { ...EMPTY_BID, ...bid, ts: Date.now() };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode / storage disabled — BroadcastChannel still works */
  }
  try {
    channel?.postMessage(payload);
  } catch {
    /* ignore */
  }
  localListeners.forEach((cb) => cb(payload));
  return payload;
};

export const clearBid = (playerId = null) => publishBid({ ...EMPTY_BID, playerId });

export const readBid = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY_BID, ...JSON.parse(raw) } : EMPTY_BID;
  } catch {
    return EMPTY_BID;
  }
};

// Subscribe to bid updates from any tab (including this one's own writes,
// so a single control-panel component can just listen instead of also
// tracking local state separately).
export const subscribeBid = (cb) => {
  const onMessage = (e) => cb(e.data);
  const onStorage = (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      cb(JSON.parse(e.newValue));
    } catch {
      /* ignore malformed payload */
    }
  };
  channel?.addEventListener("message", onMessage);
  window.addEventListener("storage", onStorage);
  localListeners.add(cb);
  return () => {
    channel?.removeEventListener("message", onMessage);
    window.removeEventListener("storage", onStorage);
    localListeners.delete(cb);
  };
};
