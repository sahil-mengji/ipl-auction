import { Link } from "react-router-dom";
import GodRaysBg from "../components/GodRaysBg";
import MetalButton from "../components/broadcast/MetalButton";
import TrapHeader from "../components/broadcast/TrapHeader";

// Normal navigation hub: jump between every screen.
const LINKS = [
  ["Live screen (broadcast)", "/", "The projected audience view — driven from Control"],
  ["Live bidding (classic)", "/live", "Keypress bidding desk"],
  ["Control board", "/control", "Auctioneer: bids, sales, live-view control"],
  ["Team squads", "/teamswithsquad", "Every squad, purse left, bought prices"],
  ["Break", "/break", "Countdown + purchased-players rail"],
  ["Budget chart", "/budget", "Budget-left vs sales graph"],
  ["Player order", "/order", "Queue, statuses, fund release"],
];

export default function Hub() {
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
      <div className="relative z-10 px-6 pt-4 pb-16 flex flex-col items-center">
        <div className="w-full">
          <img src="title.svg" className="h-48 mx-auto relative" />
        </div>
        <div className="flex justify-center mt-2 mb-8">
          <TrapHeader gold>Where to?</TrapHeader>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl w-full">
          {LINKS.map(([label, to, hint]) => (
            <Link key={to} to={to}>
              <div className="bc-steel-panel rounded-xl px-6 py-5 hover:brightness-125">
                <p className="text-xl font-extrabold">{label}</p>
                <p className="text-sm text-white/60 mt-1">{hint}</p>
                <div className="mt-3">
                  <MetalButton>Open</MetalButton>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
