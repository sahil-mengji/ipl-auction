"use client";
/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import Timer from "../components/Timer";
import SoldPlayersRail from "../components/SoldPlayersRail";
import { useDisplay } from "../utils/useLiveAuction";
import { emitSocket } from "../utils/socket";
import GodRaysBg from "../components/GodRaysBg";
import MetalButton from "../components/broadcast/MetalButton";
import TrapHeader from "../components/broadcast/TrapHeader";
import PriceTicket from "../components/broadcast/PriceTicket";
import { teamTextColor } from "../components/CurrentBidWidget";
import { fetchTeamsWithSquads } from "../utils/teamswithplayers";
import { formatPriceInLakhs } from "./Page1/PlayerCard";
import { Link } from "react-router-dom";

// How long one team stays in the left/right spotlight before rotating.
const ROTATE_MS = 5000;

// Compact team card for the break-page side spotlights: header in team
// colors, purse left, and the first few players.
function TeamSpotlight({ team }) {
  if (!team) {
    return (
      <div className="bc-steel-panel rounded-xl px-4 py-8 w-80 shrink-0 text-center text-white/50 text-sm">
        Loading teams…
      </div>
    );
  }
  const onTeam = teamTextColor(team.color1);
  const squad = team.squad ?? [];
  const shown = squad.slice(0, 5);
  return (
    <div
      key={team.team_id ?? team.name}
      className="bc-spotlight-enter bc-steel-panel rounded-xl px-4 py-4 w-80 shrink-0"
    >
      <div
        className="bc-trap-r flex items-center justify-between gap-2 px-5 py-2"
        style={{
          backgroundImage: `linear-gradient(180deg, #${team.color1}, #${team.color2})`,
          textAlign: "left",
        }}
      >
        <span
          className="block font-extrabold uppercase bc-emboss text-left -skew-x-[8deg]"
          style={{ color: onTeam }}
        >
          <span className="block text-lg leading-tight">{team.name}</span>
          <span className="block text-[10px] tracking-[0.2em] opacity-80">
            {squad.length} player{squad.length === 1 ? "" : "s"}
          </span>
        </span>
        {team.teamLogo && (
          <img
            src={team.teamLogo}
            alt={team.name}
            className="h-12 w-12 rounded-full border-2 -skew-x-[8deg] shrink-0 object-cover object-center"
            style={{ borderColor: onTeam }}
          />
        )}
      </div>

      <div className="flex justify-center my-3">
        <PriceTicket
          gold
          compact
          inline
          label="Purse left"
          value={`₹${formatPriceInLakhs(team.purse)}`}
        />
      </div>

      {shown.length === 0 ? (
        <p className="text-center text-white/50 text-xs py-4 border border-dashed border-white/15 rounded-lg">
          Awaiting first purchase…
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {shown.map((player, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-full pl-1.5 pr-3 py-1"
            >
              <span className="h-7 w-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs font-extrabold shrink-0">
                {(player.name ?? "?").slice(0, 1)}
              </span>
              <span className="flex-1 min-w-0 text-xs text-white font-bold truncate">
                {player.name}
              </span>
              {Number(player.price ?? 0) > 0 && (
                <span className="text-[11px] font-extrabold bc-gold-text whitespace-nowrap shrink-0">
                  ₹{formatPriceInLakhs(player.price)}
                </span>
              )}
            </div>
          ))}
          {squad.length > shown.length && (
            <p className="text-center text-white/50 text-[11px] pt-1">
              +{squad.length - shown.length} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const TimerPage = ({ bare = false }) => {
  // useEffect(() => {
  //   // Enable autoplay after user interaction
  //   const audio = document.getElementById("background-audio");
  //   if (audio) {
  //     audio.play();
  //   }
  // }, []);

  const [localEnd, setLocalEnd] = useState(() => Date.now() + 1000 * 60 * 5);
  const display = useDisplay();
  // Control room can drive this clock remotely: when set, everyone
  // watching follows the shared end-time; local buttons adjust it too.
  const remoteEnd = display.breakEndsAt ?? null;
  const auctionEndTime = remoteEnd ?? localEnd;
  const setAuctionEndTime = (next) => {
    const value = typeof next === "function" ? next(auctionEndTime) : next;
    if (remoteEnd != null) emitSocket("display:set", { breakEndsAt: value });
    else setLocalEnd(value);
  };
  const [teams, setTeams] = useState([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetchTeamsWithSquads().then(setTeams).catch(() => {});
    const id = setInterval(() => setTick((t) => t + 1), ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  // Left and right spotlights stay on different teams: right runs half a
  // league ahead of left.
  const leftTeam = teams.length > 0 ? teams[tick % teams.length] : null;
  const rightTeam =
    teams.length > 0
      ? teams[(tick + Math.floor(teams.length / 2)) % teams.length]
      : null;

  return (
    <div
      data-theme="broadcast"
      className="relative w-screen min-h-screen bc-shell-bg text-white overflow-x-clip"
    >
      <GodRaysBg />
      {/* Backdrop pattern: above the bg, below all content, centered on the title */}
      <img
        src="pattern.svg"
        alt=""
        aria-hidden="true"
        className="bc-spin-slow absolute left-1/2 top-20 z-[1] w-[50vw] opacity-30 pointer-events-none"
      />
      <img
        src="https://ecell.nitk.ac.in/navLogo.png"
        alt=""
        className="w-40 absolute z-40 top-5 left-4"
      />
      <div className="absolute z-40 bottom-4 left-4 flex gap-2">
        {!bare && (
          <>
            <Link to="/">
              <MetalButton>Home</MetalButton>
            </Link>
            <Link to="/teamswithsquad">
              <MetalButton>Team Squad</MetalButton>
            </Link>
            <Link to="/budget">
              <MetalButton>Budget Graph</MetalButton>
            </Link>
            <Link to="/order">
              <MetalButton>Player Order</MetalButton>
            </Link>
            <Link to="/hub">
              <MetalButton>Hub</MetalButton>
            </Link>
          </>
        )}
      </div>

      {/* Background Music */}
      {/* <audio id="background-audio" loop>
        <source
          src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
          type="audio/mp3"
        />
        Your browser does not support the audio element.
      </audio> */}

      <div className="relative z-10 flex flex-col items-center px-4 pt-4 pb-16">
        <div className="w-full">
          <img src="title.svg" className="h-48 mx-auto relative" />
        </div>
        <div className="flex justify-center mt-2 mb-8">
          <TrapHeader gold>Break</TrapHeader>
        </div>
        {remoteEnd != null && (
          <p className="text-center text-xs tracking-[0.25em] uppercase text-yellow-300/80 -mt-6 mb-6">
            ● Controlled from control room
          </p>
        )}

      {/* Team spotlights pinned to the screen edges */}
      <div className="hidden xl:block fixed left-4 top-1/2 -translate-y-1/2 z-20">
        <TeamSpotlight team={leftTeam} />
      </div>
      <div className="hidden xl:block fixed right-4 top-1/2 -translate-y-1/2 z-20">
        <TeamSpotlight team={rightTeam} />
      </div>

          {/* Timer Section: countdown only, no background panel.
              Driven from Control → Live tab; this screen just watches. */}
          <div className="w-full max-w-2xl">
            <Timer auctionEndTime={auctionEndTime} setAuctionEndTime={setAuctionEndTime} />
          </div>

        {/* Purchased Players Section: vertical up/down rail */}
        <div className="w-full max-w-4xl mt-8">
          <div className="flex justify-center mb-4">
            <TrapHeader gold>Purchased Players</TrapHeader>
          </div>
          <SoldPlayersRail />
        </div>
      </div>
    </div>
  );
};

export default TimerPage;
