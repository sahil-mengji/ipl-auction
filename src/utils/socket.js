import { io } from "socket.io-client";
import { getApiBaseUrl } from "./dataSource";

// Singleton socket.io client for live auction pushes. Server emits:
//   auction:state     — fresh enriched state after every mutation
//   auction:invalidate — { sales, logs, players, teams } staleness flags
//   display:state     — remote audience-screen prefs from /control
let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(getApiBaseUrl(), { reconnection: true });
  }
  return socket;
};

// Subscribe to an event; returns an unsubscribe fn for useEffect cleanup.
export const onSocket = (event, cb) => {
  const s = getSocket();
  s.on(event, cb);
  return () => {
    s.off(event, cb);
  };
};

export const emitSocket = (event, payload) => {
  getSocket().emit(event, payload);
};
