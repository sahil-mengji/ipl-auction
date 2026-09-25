import { Server } from "socket.io";
import { prisma } from "./prisma.js";

let io = null;

// Remote display prefs for the audience screen, controlled from /control.
// Persisted in DisplayPref so choices survive server restarts.
const LIVE_VIEWS = ["bidding", "squads", "break", "chart"];
const DEFAULTS = {
  showWidget: true,
  celebration: true,
  sounds: true,
  trumpet: true,
  liveView: "bidding",
  breakEndsAt: null,
  cycle: false,
};
const display = { ...DEFAULTS };

const persist = () => {
  // Fire-and-forget: a missed write just means an older pref on reboot.
  Promise.all(
    Object.entries(display).map(([key, value]) =>
      prisma.displayPref.upsert({
        where: { key },
        update: { value: JSON.stringify(value) },
        create: { key, value: JSON.stringify(value) },
      }),
    ),
  ).catch((e) => console.error("display persist failed:", e.message));
};

const restore = async () => {
  try {
    const rows = await prisma.displayPref.findMany();
    for (const r of rows) {
      if (!(r.key in DEFAULTS)) continue;
      try {
        display[r.key] = JSON.parse(r.value);
      } catch {
        /* keep default */
      }
    }
    // Re-validate (old rows could predate the allowlist).
    if (!LIVE_VIEWS.includes(display.liveView)) display.liveView = "bidding";
    for (const k of ["showWidget", "celebration", "sounds", "trumpet", "cycle"]) {
      if (typeof display[k] !== "boolean") display[k] = k === "cycle" ? false : true;
    }
    if (display.breakEndsAt != null && typeof display.breakEndsAt !== "number") {
      display.breakEndsAt = null;
    }
  } catch (e) {
    console.error("display restore failed:", e.message);
  }
};

export const getIo = () => io;

export const getDisplay = () => ({ ...display });

export const initSocket = (httpServer, corsOrigin) => {
  io = new Server(httpServer, {
    cors: { origin: corsOrigin.includes("*") ? "*" : corsOrigin },
  });

  void restore().then(() => {
    // Late joiners after a reboot get the restored prefs immediately.
    io.emit("display:state", getDisplay());
  });

  io.on("connection", (socket) => {
    // New screen syncs instantly on connect.
    socket.emit("display:state", getDisplay());

    socket.on("display:set", (patch) => {
      if (patch == null || typeof patch !== "object") return;
      let touched = false;
      for (const key of ["showWidget", "celebration", "sounds", "trumpet", "cycle"]) {
        if (typeof patch[key] === "boolean" && display[key] !== patch[key]) {
          display[key] = patch[key];
          touched = true;
        }
      }
      if (
        typeof patch.liveView === "string" &&
        LIVE_VIEWS.includes(patch.liveView) &&
        display.liveView !== patch.liveView
      ) {
        display.liveView = patch.liveView;
        touched = true;
      }
      if (
        (typeof patch.breakEndsAt === "number" || patch.breakEndsAt === null) &&
        display.breakEndsAt !== patch.breakEndsAt
      ) {
        display.breakEndsAt = patch.breakEndsAt;
        touched = true;
      }
      if (touched) {
        persist();
        io.emit("display:state", getDisplay());
      }
    });
  });

  return io;
};

// Fire-and-forget broadcasts (safe to call before init / with no clients).
export const broadcastState = (enrichedState) => {
  try {
    io?.emit("auction:state", enrichedState);
  } catch {
    /* no clients */
  }
};

export const broadcastInvalidate = (flags = {}) => {
  try {
    io?.emit("auction:invalidate", {
      sales: false,
      logs: false,
      players: false,
      teams: false,
      ...flags,
    });
  } catch {
    /* no clients */
  }
};
