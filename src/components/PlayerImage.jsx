/* eslint-disable react/prop-types */
import { useState } from "react";

export const FALLBACK_PLAYER_IMAGE =
  "https://media.gettyimages.com/id/2155702970/photo/india-portraits-icc-mens-t20-cricket-world-cup-west-indies-usa-2024.jpg?s=2048x2048&w=gi&k=20&c=9dw4DlGIQJpgMEOoquqnTRnUv_ES5TSqmOsj0kBL45M=";

// Drop-in <img> replacement for player photos. Falls back to the default
// player image when src is missing or fails to load.
export default function PlayerImage({ src, alt = "Player", ...rest }) {
  const [failed, setFailed] = useState(false);
  const shown = !src || failed ? FALLBACK_PLAYER_IMAGE : src;
  return (
    <img
      src={shown}
      alt={alt}
      onError={() => {
        if (!failed) setFailed(true);
      }}
      {...rest}
    />
  );
}
