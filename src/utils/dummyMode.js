// Central switch for dummy mode.
// HARDCODED OFF — the app always uses the backend. Flip to `true` to
// serve local dummy data in the UI without any network calls.

export const DUMMY_MODE_ENV_KEY = "VITE_DUMMY_MODE";

export const isDummyMode = () => false;
