/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import Confetti from "react-confetti";
import Ha from "./Ha";
import PlayerImage from "../../components/PlayerImage";
import TrapHeader from "../../components/broadcast/TrapHeader";
import PriceTicket from "../../components/broadcast/PriceTicket";
import MetalButton from "../../components/broadcast/MetalButton";
import { Link } from "react-router-dom";

const roleIcons = {
  Batsmen: "🏏",
  Bowler: "⚾",
  "All-rounder": "🏏⚾",
  WK: "🧤",
};

// Display labels for the DB category values.
const ROLE_TICKET = {
  Batsman: {
    label: "Batsman",
    icon: "https://cdn-icons-png.flaticon.com/512/1454/1454437.png",
  },
  Bowler: {
    label: "Bowler",
    icon: "https://cdn-icons-png.flaticon.com/512/5140/5140352.png",
  },
  "Wicket Keeper": {
    label: "Wicket Keeper",
    icon: "https://cdn-icons-png.flaticon.com/512/13132/13132322.png",
  },
  "All Rounder": {
    label: "All Rounder",
    icon: "https://cdn-icons-png.flaticon.com/512/9097/9097536.png",
  },
};

const isOverseas = (p) => p?.is_overseas ?? p?.isOverseas ?? false;

// Crisp white airplane mark (inline SVG, never an emoji).
const PlaneIcon = ({ className = "w-4 h-4" }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
  </svg>
);

// Role + overseas markers, each in its own little parallelogram with a
// white icon. `center` for the standard hero, left-aligned under the ticket.
function RoleTickets({ player, center = false }) {
  const role = ROLE_TICKET[player?.category];
  if (!role && !isOverseas(player)) return null;
  return (
    <div className={`flex gap-2 ${center ? "justify-center" : "justify-start"}`}>
      {role && (
        <div className="bc-para px-4 py-1.5">
          <span className="flex items-center gap-2 text-2xl font-extrabold tracking-[0.15em] uppercase text-white">
            <img
              src={role.icon}
              alt=""
              className="w-8 h-8 brightness-0 invert"
            />
            {role.label}
          </span>
        </div>
      )}
      {isOverseas(player) && (
        <div className="bc-para px-4 py-1.5">
          <span className="flex items-center gap-2 text-2xl font-extrabold tracking-[0.15em] uppercase text-white">
            <PlaneIcon className="w-8 h-8" />
            Overseas
          </span>
        </div>
      )}
    </div>
  );
}

export function formatPriceInLakhs(price) {
  const n = Number(price ?? 0);
  if (Number.isNaN(n)) return "—";
  if (n >= 100) {
    const crore = (n / 100).toFixed(2);
    return `${Number(crore).toLocaleString("en-IN")} Crore`;
  }
  return `${Number(n).toLocaleString("en-IN")} Lakh`;
}

const STAT_DEFS = [
  ["Matches", "matches", 250, "🏟️"],
  ["Runs", "runs", 8000, "🏏"],
  ["Bat Avg", "bat_avg", 60, "💯"],
  ["SR", "sr", 220, "⚡"],
  ["Catches", "catches", 150, "🧤"],
  ["Stumpings", "stumpings", 50, "🥅"],
  ["Wickets", "wickets", 250, "🎯"],
  ["Bowl Avg", "bowl_avg", 45, "📉"],
  ["Economy", "eco", 12, "⏱️"],
];

const HEADLINE_KEY_BY_CATEGORY = {
  Batsmen: "runs",
  Bowler: "wickets",
  WK: "runs",
  "All-rounder": "runs",
};

// Pick the single most relevant stat to feature big — the player's role
// stat when present, otherwise whichever of runs/wickets is bigger.
function pickHeadlineStat(player, activeStats) {
  const preferredKey = HEADLINE_KEY_BY_CATEGORY[player.category];
  const preferred = activeStats.find(([, k]) => k === preferredKey);
  if (preferred) return preferred;
  const runs = activeStats.find(([, k]) => k === "runs");
  const wickets = activeStats.find(([, k]) => k === "wickets");
  if (runs && wickets)
    return Number(player.runs) >= Number(player.wickets) ? runs : wickets;
  return runs || wickets || activeStats[0];
}

// Center column: floodlit hero — a tall trapezium photo with the player's
// name overlapping its lower half, and a ticket-shaped bid riser overlapping
// up from beneath the photo.
// `docked` pins the IMAGE itself to the viewport's bottom edge (broadcast
// cutout); actions then render in-flow at the top. Used by `/` and `/live`.
// `/control` keeps the in-flow hero so its buttons stay clickable.
export function PlayerHero({
  player,
  showHammer,
  currentBidder,
  currentBid = 0,
  showPlayerCard,
  actions,
  docked = false,
}) {
  if (!player) return null;
  const sold = showPlayerCard == true;
  const hasBid = Number(currentBid) > 0;

  const photoBlock = (
    <div className={`relative ${docked ? "" : "w-[340px] sm:w-[420px]"}`}>
      <div className="absolute left-1/2 -translate-x-1/2 top-6 w-[30rem] h-[18rem] rounded-t-full bg-gradient-to-br from-[#00d4e1] to-purple-500 opacity-45 blur-lg animate-pulse" />

      {/* Tall trapezium photo with a gold rim frame + shine sweep */}
      <div
        className={`relative w-full z-[2] ${docked ? "h-[66vh] min-h-[540px] max-h-[840px] aspect-[4/5]" : "h-[58vh] min-h-[520px] max-h-[780px]"}`}
      >
        {/* Gold rim peeking out from behind the photo */}
        <div
          className="bc-photo-trap bc-photo-glow absolute -inset-2 bg-gradient-to-b from-[#ffe08a] via-[#dd9400] to-[#8f5c00]"
          aria-hidden="true"
        />
        {/* Photo masked to the trapezium */}
        <div className="bc-photo-trap absolute inset-0 overflow-hidden">
          <PlayerImage
            src={player.player_image}
            alt={player.player_name}
            className="w-full h-full object-cover"
          />
          <div className="bc-shine" aria-hidden="true" />
        </div>
        {/* Scrim so the overlapping name stays legible over any photo */}
        {!docked && (
          <div className="absolute inset-x-0 bottom-0 bc-photo-fade" />
        )}
        {/* Big name overlapping the lower half of the photo */}
        {!docked && (
          <div
            className={`absolute inset-x-3 z-10 ${docked ? "bottom-[7.5rem]" : "bottom-20"}`}
          >
            <h2 className="bc-hero-name text-center">{player.player_name}</h2>
            <div className="mt-2 flex justify-center">
              <RoleTickets player={player} center />
            </div>
          </div>
        )}
      </div>

      {showHammer && (
        <div className="absolute inset-0 flex justify-center items-center z-30">
          <Ha className="w-2 h-2" />
        </div>
      )}

      {/* Ticket-shaped bid block: hangs below the photo in-flow,
          sits inside the photo's bottom edge when docked.
          Hidden when docked — name/price live in the corner ticket. */}
      {!docked && (
        <div className="absolute left-1/2 -translate-x-1/2 z-30 w-[92%] -bottom-14">
          <div
            className={`bc-riser ${sold ? "bc-riser-gold" : ""} pt-5 pb-3 px-6`}
          >
            <p
              className={`text-center text-[10px] font-bold tracking-[0.3em] uppercase ${sold ? "text-[#4a3200]" : "text-white/60"}`}
            >
              {sold ? "Sold for" : hasBid ? "Current Bid" : "Base Price"}
            </p>
            <p
              className={`text-center text-3xl font-extrabold leading-tight ${sold ? "text-[#1a1200] bc-emboss" : "bc-gold-text"}`}
            >
              ₹
              {formatPriceInLakhs(
                sold || hasBid ? currentBid : player.base_price,
              )}
            </p>
            {currentBidder != null && (
              <p
                className={`text-center text-sm font-extrabold uppercase tracking-wide mt-1 ${sold ? "text-[#3a2600]" : "text-yellow-300 animate-pulse"}`}
              >
                {sold ? currentBidder : `Bid by ${currentBidder}`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Docked corner ticket: anchored to the photo itself, jutting out
          past its right edge so the two can never separate. Split layers —
          steel bg (z-0) slides UNDER the cutout, content (z-3) stays above. */}
      {docked && (
        <div className="hidden lg:block absolute bottom-0 right-0 z-[3] translate-x-[calc(100%-2rem)]">
          {/* No steel panel behind — name, price and stat cells float free */}
          <div className="relative z-[3] py-4 w-fit max-w-[720px]">
            {/* Price above name, both pulled left over the cutout, no gap */}
            <div className="-ml-3">
              <PriceTicket
                label="Base price"
                value={`₹${formatPriceInLakhs(player.base_price)}`}
                mirror
                compact
                align="left"
                inline
              />
            </div>
            <div className="-ml-16">
              <TrapHeader gold big mirror align="left" skewText>
                {player.player_name}
              </TrapHeader>
              <div className="mt-2 ml-1">
                <RoleTickets player={player} />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {STAT_DEFS.filter(([, k]) => Number(player[k] ?? 0) !== 0).map(
                ([label, k, , icon]) => (
                  <div
                    key={k}
                    className="bc-para px-5 py-3 relative overflow-hidden"
                  >
                    <span
                      aria-hidden="true"
                      className="bc-icon-ghost absolute -right-1 -bottom-2 text-6xl opacity-30 select-none pointer-events-none"
                    >
                      {icon}
                    </span>
                    <div className="relative text-left">
                      <p className="text-6xl font-extrabold bc-gold-text leading-none">
                        {player[k]}
                      </p>
                      <p className="text-lg font-bold tracking-[0.15em] uppercase text-white/60 mt-1">
                        {label}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (docked) {
    return (
      <>
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-20">
          {photoBlock}
        </div>
        {actions && (
          <div className="relative z-30 flex justify-center pt-4">
            {actions}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col items-center justify-end min-h-[84vh] pt-12 pb-2 bc-spotlight">
      <div className="relative flex justify-center items-start">
        {photoBlock}
      </div>

      {actions && <div className="mt-24 relative z-10">{actions}</div>}
    </div>
  );
}

// Right column: slanted panel with price tickets + a livelier stat deck —
// one featured headline stat plus a bar-chart list for the rest.
// `hideStats` drops the deck (used where the docked ticket shows stats).
export function PlayerInfoPanel({
  player,
  currentBid,
  showPlayerCard,
  hideStats = false,
}) {
  if (!player) return null;
  const sold = showPlayerCard == true;
  const activeStats = STAT_DEFS.filter(([, k]) => Number(player[k] ?? 0) !== 0);
  const headline = pickHeadlineStat(player, activeStats);
  const restStats = activeStats.filter((s) => s !== headline);

  return (
    <div className="bc-card-wrap">
      <div className="bc-card-slant p-5">
        <TrapHeader gold={sold}>{sold ? "Final price" : "Live bid"}</TrapHeader>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <PriceTicket
            label="Base price"
            value={`₹${formatPriceInLakhs(player.base_price)}`}
          />
          <PriceTicket
            label={sold ? "Sold for" : "Current bid"}
            value={`₹${formatPriceInLakhs(currentBid)}`}
            gold
          />
        </div>
        {!hideStats && (
          <>
            <div className="bc-chrome-rule my-4 opacity-70" />
            <TrapHeader>Player stats</TrapHeader>

            {headline && (
              <div className="bc-stat-hero rounded-lg mt-3 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-white/60">
                    {headline[0]}
                  </p>
                  <p className="text-4xl font-extrabold bc-gold-text leading-none mt-1">
                    {player[headline[1]]}
                  </p>
                </div>
                <span className="text-4xl opacity-80">
                  {roleIcons[player.category] ?? "🏆"}
                </span>
              </div>
            )}

            {restStats.length > 0 && (
              <div className="mt-3 space-y-2.5">
                {restStats.map(([label, k, max], i) => (
                  <div key={k}>
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/50">
                        {label}
                      </span>
                      <span className="text-sm font-extrabold bc-emboss">
                        {player[k]}
                      </span>
                    </div>
                    <div className="bc-stat-bar-track mt-1">
                      <div
                        className={`bc-stat-bar-fill ${i % 2 ? "bc-stat-bar-fill-alt" : ""}`}
                        style={{
                          width: `${Math.min(100, (Number(player[k]) / max) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Classic stacked card (photo over prices over stats) — kept for the
// "Player Sold" overlay. Column layouts use PlayerHero + PlayerInfoPanel.
const PlayerCard = ({
  player,
  showHammer,
  currentBidder,
  currentBid,
  showPlayerCard,
  markAsUnSold,
  markAsSold,
  readOnly = false,
}) => {
  const [isSold, setIsSold] = useState(false);
  useEffect(() => {
    setIsSold(false);
  }, [player]);

  const actions = (
    <div className="flex flex-wrap gap-3 justify-center">
      {currentBid > 0 && (
        <MetalButton tone="green" onClick={markAsSold}>
          Mark as Sold
        </MetalButton>
      )}
      <Link to="/teamswithsquad">
        <MetalButton>Team Squad</MetalButton>
      </Link>
      <Link to="/break">
        <MetalButton>Break</MetalButton>
      </Link>
      <MetalButton tone="danger" onClick={markAsUnSold}>
        Mark as Unsold
      </MetalButton>
    </div>
  );

  return (
    <div
      className={`flex flex-col items-center justify-center transition-all duration-500 py-3 ${isSold ? "fixed inset-0 z-50 bg-black" : ""}`}
    >
      {isSold && (
        <Confetti width={window.innerWidth} height={window.innerHeight} />
      )}
      <PlayerHero
        player={player}
        showHammer={showHammer}
        currentBidder={currentBidder}
        currentBid={currentBid}
        showPlayerCard={showPlayerCard}
        actions={!readOnly && showPlayerCard != true ? actions : null}
      />
      <div className="w-full max-w-xl mt-2">
        <PlayerInfoPanel
          player={player}
          currentBid={currentBid}
          showPlayerCard={showPlayerCard}
        />
      </div>
    </div>
  );
};

export default PlayerCard;
