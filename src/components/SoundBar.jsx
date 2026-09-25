import { useState } from "react";
import {
  getVolume,
  isMusicOn,
  isMuted,
  setMuted,
  setVolume,
  startMusic,
  stopMusic,
} from "../utils/sound";

// Local sound controls: master mute, volume, and the ambient music loop.
// Drop anywhere (control center, break page).
export default function SoundBar() {
  const [muted, setM] = useState(isMuted());
  const [volume, setV] = useState(getVolume());
  const [music, setMu] = useState(isMusicOn());

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setM(next);
  };
  const changeVolume = (e) => {
    const v = Number(e.target.value);
    setVolume(v);
    setV(v);
    if (v > 0 && muted) {
      setMuted(false);
      setM(false);
    }
  };
  const toggleMusic = () => {
    if (music) {
      stopMusic();
      setMu(false);
    } else {
      startMusic();
      setMu(true);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-white/5 border border-white/15 rounded-full px-4 py-2">
      <button
        onClick={toggleMute}
        className="text-lg leading-none hover:scale-110"
        title={muted ? "Unmute sounds" : "Mute sounds"}
      >
        {muted ? "🔇" : "🔊"}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={volume}
        onChange={changeVolume}
        className="w-24 accent-yellow-400"
        title="Volume"
      />
      <button
        onClick={toggleMusic}
        className={`text-xs font-extrabold tracking-wider uppercase rounded-full px-3 py-1 ${
          music ? "bg-yellow-300 text-black" : "bg-white/10 hover:bg-white/20"
        }`}
        title="Ambient auction music"
      >
        {music ? "♫ On" : "♫ Off"}
      </button>
    </div>
  );
}
