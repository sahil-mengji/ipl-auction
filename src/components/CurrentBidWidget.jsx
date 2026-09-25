/* eslint-disable react/prop-types */
import { formatPriceInLakhs } from "../pages/Page1/PlayerCard";
import AnimatedNumber from "./AnimatedNumber";

// Readable text color for a team-colored background: dark text on bright
// teams (e.g. CSK yellow), white text on dark teams (e.g. MI blue).
export const teamTextColor = (color1) =>
  hexLuminance(color1) > 0.45 ? "#1a1200" : "#ffffff";
const hexLuminance = (hex) => {
  const h = String(hex ?? "").replace("#", "");
  if (h.length !== 6) return 0;
  const c = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
  return 0.2126 * c(0) + 0.7152 * c(2) + 0.0722 * c(4);
};

// Fixed top-right broadcast widget: big current-bid parallelogram, the
// bidding-team ticket in that team's own colors ("by …"), plus the last few
// bids as plain unobtrusive text underneath. Rendered by `/`, `/live` and
// `/control`. Hides itself when there is no active bid.
export default function CurrentBidWidget({
  bid = 0,
  team = null,
  recentBids = [],
}) {
  const amount = Number(bid ?? 0);
  if (!team && amount <= 0) return null;
  const name = team?.team_name ?? team?.name ?? null;
  const teamColors = Boolean(team?.color1 && team?.color2);
  const teamBg = teamColors
    ? {
        backgroundImage: `linear-gradient(180deg, #${team.color1}, #${team.color2})`,
        borderColor: "#ffe08a",
      }
    : undefined;
  // Bright team bg -> dark text, dark team bg -> white text, no team -> gold default.
  const onTeam = teamColors
    ? { color: teamTextColor(team.color1) }
    : undefined;

  return (
    <div className="fixed top-4 right-4 z-30 flex flex-col items-end gap-2">
      <div
        className={`bc-para px-10 py-3 ${teamColors ? "" : "bc-para-gold"}`}
        style={teamBg}
      >
        <div className="text-right" style={onTeam}>
          <p className="text-sm font-bold tracking-[0.25em] uppercase">
            Current bid
          </p>
          <p className="text-8xl font-extrabold whitespace-nowrap bc-emboss">
            ₹
            <AnimatedNumber
              value={amount}
              coin
              format={(v) => formatPriceInLakhs(Math.round(v))}
            />
          </p>
        </div>
      </div>
      {name && (
        <div className="bc-para px-8 py-2" style={teamBg}>
          <p
            className="text-4xl font-extrabold uppercase tracking-wide bc-emboss"
            style={onTeam ?? { color: "#fff" }}
          >
            <span className="text-xl tracking-[0.2em] opacity-70">by </span>
            {name}
          </p>
        </div>
      )}
      {(recentBids ?? []).slice(0, 3).map((b, i) => (
        <p
          key={`${b.amount}-${i}`}
          className="text-[28px] leading-tight text-white/70"
        >
          ₹{formatPriceInLakhs(b.amount)}{" "}
          <span className="opacity-70">· {b.teamName}</span>
        </p>
      ))}
    </div>
  );
}
