// Full-screen GodRays shader backdrop used by AuctionShell
// (so `/`, `/live` and `/control` share one animated background).
import { GodRays } from "@paper-design/shaders-react";

export default function GodRaysBg() {
  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden bg-[#05070f]"
      aria-hidden="true"
    >
      <GodRays
        width={1280}
        height={720}
        style={{ width: "100%", height: "100%", display: "block" }}
        colors={["#a600ff6e", "#6200fff0", "#ffffff", "#33fff5"]}
        colorBack="#000000"
        colorBloom="#0000ff"
        bloom={0.4}
        intensity={0.8}
        density={0.3}
        spotty={0.3}
        midSize={0.2}
        midIntensity={0.4}
        speed={0.75}
        offsetY={-0.38}
      />
      {/* readability veil so cards stay legible over the rays */}
      <div className="absolute inset-0 bg-[#0a1730]/55" />
    </div>
  );
}
