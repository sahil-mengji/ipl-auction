/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { playCoin } from "../utils/sound";

// Number that tweens to its new value (ease-out cubic) instead of jumping.
// `format` receives the eased float — pass a rounding formatter for Lakh.
// `coin` plays the coin cascade when the value climbs.
export default function AnimatedNumber({ value, format, duration = 650, coin = false, className = "" }) {
  const target = Number(value ?? 0);
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);

  useEffect(() => {
    const from = shownRef.current;
    if (from === target) {
      setShown(target);
      return;
    }
    if (coin && target > from) playCoin();
    let raf = 0;
    const start = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = from + (target - from) * eased;
      shownRef.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return <span className={className}>{format(shown)}</span>;
}
