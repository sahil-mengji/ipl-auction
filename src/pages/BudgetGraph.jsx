/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import GodRaysBg from "../components/GodRaysBg";
import MetalButton from "../components/broadcast/MetalButton";
import TrapHeader from "../components/broadcast/TrapHeader";
import { getAuctionSales, getTeams } from "../utils/auctionApi";

// Budget left (₹ Lakh) vs players bought — one smoothed, color-encoded line
// per team. Series are rebuilt from sales ordered by time_of_selling; a
// team's starting budget = current purse + everything it has spent.
const W = 1400;
const H = 740;
const PAD = { l: 76, r: 96, t: 26, b: 54 };

// Catmull-Rom -> cubic Bezier smoothing through every point.
const smoothPath = (pts) => {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
};

const tickFmt = (v) =>
  v >= 100 ? `${Number((v / 100).toFixed(v % 100 === 0 ? 0 : 1))}Cr` : `${v}L`;

export default function BudgetGraph({ bare = false }) {
  const [teams, setTeams] = useState([]);
  const [sales, setSales] = useState([]);
  const [hover, setHover] = useState(null);
  const [introDone, setIntroDone] = useState(false);
  const plotRef = useRef(null);

  useEffect(() => {
    let alive = true;
    Promise.all([getTeams(), getAuctionSales()])
      .then(([t, s]) => {
        if (!alive) return;
        setTeams(t ?? []);
        setSales(s ?? []);
      })
      .catch(() => {});
    const id = setInterval(() => {
      Promise.all([getTeams(), getAuctionSales()])
        .then(([t, s]) => {
          if (!alive) return;
          setTeams(t ?? []);
          setSales(s ?? []);
        })
        .catch(() => {});
    }, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Per-team series over the GLOBAL sale order: one point per sale for
  // every team ({ n: sale index, left: budget after that sale }). A team's
  // line stays flat while others buy and steps down on its own purchases.
  // A team's starting budget = current purse + everything it has spent.
  const series = useMemo(() => {
    const teamOf = (p) => p.sold_to_team_id ?? p.soldToTeamId;
    const ordered = (sales ?? [])
      .filter((p) => {
        const tid = teamOf(p);
        return tid && tid > 0;
      })
      .slice()
      .sort((a, b) => {
        const ta = new Date(a.time_of_selling ?? 0).getTime();
        const tb = new Date(b.time_of_selling ?? 0).getTime();
        return ta - tb || (a.id ?? 0) - (b.id ?? 0);
      });
    return (teams ?? []).map((team) => {
      const tid = team.id ?? team.team_id;
      const spent = ordered
        .filter((p) => teamOf(p) === tid)
        .reduce((s, p) => s + Number(p.final_price ?? 0), 0);
      const start = Number(team.purse ?? 0) + spent;
      const pts = [{ n: 0, left: start }];
      let left = start;
      ordered.forEach((p, i) => {
        if (teamOf(p) === tid) left -= Number(p.final_price ?? 0);
        pts.push({ n: i + 1, left });
      });
      return { team, pts };
    });
  }, [teams, sales]);

  const xMax = Math.max(1, ...series.map((s) => s.pts.length - 1));
  const yMaxRaw = Math.max(100, ...series.flatMap((s) => s.pts.map((p) => p.left)));
  const yMax = Math.ceil(yMaxRaw / 100) * 100;

  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const X = (n) => PAD.l + (n / xMax) * plotW;
  const Y = (v) => PAD.t + plotH - (v / yMax) * plotH;

  const yTicks = [0, 1, 2, 3, 4].map((i) => (yMax / 4) * i);
  const xTicks = Array.from({ length: xMax + 1 }, (_, i) => i);
  const xStep = Math.max(1, Math.ceil((xMax + 1) / 20));

  const onMove = (e) => {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const n = Math.round(((px - PAD.l) / plotW) * xMax);
    setHover(Math.max(0, Math.min(xMax, n)));
  };

  // Step-interpolated budget of a series after sale n (points are dense,
  // one per sale, so this is a direct lookup).
  const valueAt = (pts, n) =>
    pts[Math.max(0, Math.min(n, pts.length - 1))]?.left ?? 0;

  // End-of-line team labels, pushed apart so converging lines stay readable.
  const endLabels = useMemo(() => {
    const ends = series
      .map(({ team, pts }) => {
        const last = pts[pts.length - 1];
        return { team, x: X(last.n), y: Y(last.left) };
      })
      .sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) {
      if (ends[i].y - ends[i - 1].y < 18) {
        ends[i].y = ends[i - 1].y + 18;
      }
    }
    return ends;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, xMax, yMax, plotW, plotH]);

  return (
    <div
      data-theme="broadcast"
      className="min-h-screen bc-shell-bg text-white overflow-x-clip relative"
    >
      <GodRaysBg />
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
            <Link to="/teamswithsquad">
              <MetalButton>Team Squad</MetalButton>
            </Link>
          </>
        )}
      </div>

      <div className="relative z-10 px-6 pt-4 pb-16">
        <div className="w-full">
          <img src="title.svg" className="h-48 mx-auto relative" />
        </div>
        <div className="max-w-[1600px] mx-auto">
        <div className="bc-steel-panel px-4 py-4 flex flex-col lg:flex-row gap-6">
          {/* Left rail: title + color index */}
          <div className="flex flex-col items-start gap-4 lg:w-60 shrink-0">
            <TrapHeader gold>Budget left vs players</TrapHeader>

            {/* Legend */}
            <div className="flex flex-wrap lg:flex-col justify-start items-start gap-2">
            {series.map(({ team }) => (
              <span
                key={team.id ?? team.name}
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/15 rounded-full px-3 py-1"
              >
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, #${team.color1}, #${team.color2})`,
                  }}
                />
                {team.team_name ?? team.name}
              </span>
            ))}
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 min-w-0">
            <svg
              ref={plotRef}
              viewBox={`0 0 ${W} ${H}`}
              className="w-full h-auto cursor-crosshair"
              onMouseMove={onMove}
              onMouseLeave={() => setHover(null)}
            >
              <defs>
                {series.map(({ team }) => {
                  const id = `g${team.id ?? team.name}`;
                  return (
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={`#${team.color1}`} />
                      <stop offset="100%" stopColor={`#${team.color2}`} />
                    </linearGradient>
                  );
                })}
              </defs>

              {/* Gridlines + y labels */}
              {yTicks.map((t) => (
                <g key={t}>
                  <line
                    x1={PAD.l}
                    y1={Y(t)}
                    x2={W - PAD.r}
                    y2={Y(t)}
                    stroke="rgba(255,211,77,0.18)"
                    strokeDasharray="5 5"
                  />
                  <text
                    x={PAD.l - 10}
                    y={Y(t) + 4}
                    textAnchor="end"
                    fontSize="13"
                    fill="rgba(255,255,255,0.6)"
                  >
                    {tickFmt(t)}
                  </text>
                </g>
              ))}

              {/* X labels (thinned on long auctions) */}
              {xTicks
                .filter((n) => n % xStep === 0 || n === xMax)
                .map((n) => (
                <text
                  key={n}
                  x={X(n)}
                  y={H - PAD.b + 22}
                  textAnchor="middle"
                  fontSize="13"
                  fill="rgba(255,255,255,0.6)"
                >
                  {n}
                </text>
              ))}
              <text
                x={PAD.l + plotW / 2}
                y={H - 8}
                textAnchor="middle"
                fontSize="13"
                letterSpacing="3"
                fill="rgba(255,255,255,0.6)"
              >
                PLAYERS SOLD (AUCTION ORDER)
              </text>
              <text
                x={16}
                y={PAD.t + plotH / 2}
                textAnchor="middle"
                fontSize="13"
                letterSpacing="3"
                fill="rgba(255,255,255,0.6)"
                transform={`rotate(-90 16 ${PAD.t + plotH / 2})`}
              >
                BUDGET LEFT
              </text>

              {/* Team lines (grow in on entry, staggered) */}
              {series.map(({ team, pts }, si) => {
                const gid = `g${team.id ?? team.name}`;
                const coords = pts.map((p) => ({ x: X(p.n), y: Y(p.left) }));
                return (
                  <g key={gid}>
                    {coords.length > 1 ? (
                      <path
                        d={smoothPath(coords)}
                        fill="none"
                        stroke={`url(#${gid})`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        pathLength={1}
                        className={introDone ? "" : "bc-draw"}
                        style={
                          introDone
                            ? undefined
                            : { animationDelay: `${si * 0.15}s` }
                        }
                        onAnimationEnd={() => setIntroDone(true)}
                      />
                    ) : (
                      <circle
                        cx={coords[0].x}
                        cy={coords[0].y}
                        r="5"
                        fill={`url(#${gid})`}
                      />
                    )}
                    <g
                      className={introDone ? "" : "bc-fade-group"}
                      style={
                        introDone
                          ? undefined
                          : { animationDelay: `${1.2 + si * 0.15}s` }
                      }
                    >
                      {coords.map((c, i) => (
                        <circle
                          key={i}
                          cx={c.x}
                          cy={c.y}
                          r="4"
                          fill="#0b1830"
                          stroke={`url(#${gid})`}
                          strokeWidth="2.5"
                        />
                      ))}
                    </g>
                  </g>
                );
              })}

              {/* Hover cursor + glow dots where it crosses each line */}
              {hover != null && (
                <g>
                  <line
                    x1={X(hover)}
                    y1={PAD.t}
                    x2={X(hover)}
                    y2={PAD.t + plotH}
                    stroke="rgba(255,255,255,0.5)"
                    strokeDasharray="4 4"
                  />
                  {series.map(({ team, pts }) => (
                    <circle
                      key={team.id ?? team.name}
                      cx={X(hover)}
                      cy={Y(valueAt(pts, hover))}
                      r="7"
                      fill={`url(#g${team.id ?? team.name})`}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  ))}
                </g>
              )}

              {/* Team names at the end of each line (fade in after the draw) */}
              <g
                className={introDone ? "" : "bc-fade-group"}
                style={introDone ? undefined : { animationDelay: "1.6s" }}
              >
              {endLabels.map(({ team, x, y }) => (
                <text
                  key={team.id ?? team.name}
                  x={Math.min(x + 10, W - 8)}
                  y={y + 4}
                  fontSize="14"
                  fontWeight="800"
                  fill="#ffffff"
                  stroke="rgba(0,0,0,0.7)"
                  strokeWidth="3"
                  paintOrder="stroke"
                >
                  {team.team_name ?? team.name}
                </text>
              ))}
              </g>
            </svg>

            {/* Hover readout */}
            {hover != null && (
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 mt-2 text-sm">
                <span className="font-extrabold bc-gold-text">
                  {hover === 0 ? "Start:" : `After sale ${hover}:`}
                </span>
                {series.map(({ team, pts }) => (
                  <span key={team.id ?? team.name} className="text-white/80">
                    {team.team_name ?? team.name}{" "}
                    <b className="text-white">
                      ₹{tickFmt(valueAt(pts, hover))}
                    </b>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
