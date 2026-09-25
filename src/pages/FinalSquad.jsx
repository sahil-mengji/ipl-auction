/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTeamsWithSquads } from "../utils/teamswithplayers";
import { formatPriceInLakhs } from "./Page1/PlayerCard";
import GodRaysBg from "../components/GodRaysBg";
import MetalButton from "../components/broadcast/MetalButton";
import TrapHeader from "../components/broadcast/TrapHeader";
import PriceTicket from "../components/broadcast/PriceTicket";
import { teamTextColor } from "../components/CurrentBidWidget";

const ROLE_ICONS = {
  "Batsman": "https://cdn-icons-png.flaticon.com/512/1454/1454437.png",
  "Bowler": "https://cdn-icons-png.flaticon.com/512/5140/5140352.png",
  "Wicket Keeper": "https://cdn-icons-png.flaticon.com/512/13132/13132322.png",
  "All Rounder": "https://cdn-icons-png.flaticon.com/512/9097/9097536.png",
};
const OVERSEAS_ICON = "https://cdn-icons-png.flaticon.com/512/723/723955.png";

const ROLE_SHORT = {
  "Batsman": "BAT",
  "Bowler": "BOWL",
  "Wicket Keeper": "WK",
  "All Rounder": "AR",
};

const SquadRow = ({ player }) => (
  <div
    className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-full pl-1.5 pr-3 py-1 hover:brightness-125 transition"
    title={`${player.name}${player.role ? ` — ${player.role}` : ""}${player.isOverseas ? " (overseas)" : ""}`}
  >
    <span className="h-8 w-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-sm font-extrabold shrink-0">
      {(player.name ?? "?").slice(0, 1)}
    </span>
    <span className="flex-1 min-w-0 text-sm text-white font-bold truncate">
      {player.name}
    </span>
    {player.isOverseas && (
      <img src={OVERSEAS_ICON} alt="overseas" className="w-3.5 shrink-0 brightness-0 invert" />
    )}
    {ROLE_SHORT[player.role] && (
      <span className="text-[10px] font-extrabold tracking-wider text-white/60 shrink-0">
        {ROLE_SHORT[player.role]}
      </span>
    )}
    {ROLE_ICONS[player.role] && (
      <img
        src={ROLE_ICONS[player.role]}
        alt={player.role}
        className="w-4 shrink-0 brightness-0 invert opacity-80"
      />
    )}
    {Number(player.price ?? 0) > 0 && (
      <span className="text-xs font-extrabold bc-gold-text whitespace-nowrap shrink-0">
        ₹{formatPriceInLakhs(player.price)}
      </span>
    )}
  </div>
);

const TeamsWithCompactDesign = ({ bare = false }) => {
  const [teamswithsquad, setTeamsWithSquad] = useState([]);
  const getAllTeamswithplayers = async () => {
    fetchTeamsWithSquads().then((teams) => {
      setTeamsWithSquad(teams);
    });
  };

  useEffect(() => {
    getAllTeamswithplayers();
  }, []);

  return (
    <div
      data-theme="broadcast"
      className="min-h-screen bc-shell-bg text-white overflow-x-clip relative"
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
            <Link to="/break">
              <MetalButton>Break</MetalButton>
            </Link>
          </>
        )}
      </div>

      <div className="relative z-10 px-6 pt-4 pb-16">
        <div className="w-full">
          <img src="title.svg" className="h-48 mx-auto relative" />
        </div>
        <div className="flex justify-center mt-2 mb-8">
          <TrapHeader gold>Teams Squad</TrapHeader>
        </div>

        <div className="bc-mask-x overflow-hidden">
          <div
            className="bc-scroll-x flex gap-8 w-max py-2"
            style={{
              animationDuration: `${Math.max(20, teamswithsquad.length * 4)}s`,
            }}
          >
          {[...teamswithsquad, ...teamswithsquad].map((team, index) => {
            const onTeam = teamTextColor(team.color1);
            const squad = team.squad ?? [];
            const overseas = squad.filter((p) => p.isOverseas).length;
            const roles = squad.reduce((acc, p) => {
              const k = ROLE_SHORT[p.role] ?? "—";
              acc[k] = (acc[k] ?? 0) + 1;
              return acc;
            }, {});
            return (
              <div
                key={index}
                className="bc-steel-panel rounded-xl px-5 py-5 w-[340px] shrink-0 transition-transform duration-300 hover:-translate-y-1"
              >
                {/* Team header: mirrored trapezium (leans with the rows) in the team's own colors */}
                <div
                  className="bc-trap-r flex items-center justify-between gap-2 px-6 py-2"
                  style={{
                    backgroundImage: `linear-gradient(180deg, #${team.color1}, #${team.color2})`,
                    textAlign: "left",
                  }}
                >
                  <span
                    className="block font-extrabold uppercase bc-emboss text-left -skew-x-[8deg]"
                    style={{ color: onTeam }}
                  >
                    <span className="block text-xl leading-tight">{team.name}</span>
                    <span className="block text-[11px] tracking-[0.2em] opacity-80">
                      {squad.length} player{squad.length === 1 ? "" : "s"}
                      {overseas > 0 && ` · ✈ ${overseas} overseas`}
                    </span>
                  </span>
                  {team.teamLogo && (
                    <img
                      src={team.teamLogo}
                      alt={team.name}
                      className="h-14 w-14 rounded-full border-2 -skew-x-[8deg] shrink-0 object-cover object-center"
                      style={{
                        borderColor: onTeam,
                        boxShadow: `0 0 14px #${team.color1}`,
                      }}
                    />
                  )}
                </div>

                <div className="flex justify-center my-4">
                  <PriceTicket
                    gold
                    compact
                    inline
                    label="Purse left"
                    value={`₹${formatPriceInLakhs(team.purse)}`}
                  />
                </div>

                {/* Role breakdown */}
                {squad.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-center mb-3">
                    {Object.entries(roles).map(([role, count]) => (
                      <span
                        key={role}
                        className="text-[11px] font-extrabold tracking-wider bg-white/5 border border-white/15 rounded-full px-2.5 py-0.5"
                      >
                        {role} <span className="bc-gold-text">{count}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Squad Section: static player rows */}
                {squad.length === 0 ? (
                  <p className="text-center text-white/50 text-sm py-6 border border-dashed border-white/15 rounded-lg">
                    Awaiting first purchase…
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {squad.map((player, idx) => (
                      <SquadRow key={idx} player={player} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamsWithCompactDesign;
