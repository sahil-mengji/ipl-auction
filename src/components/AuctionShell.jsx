/* eslint-disable react/prop-types */
import GodRaysBg from "./GodRaysBg";

// Shared classic-auction template: video backdrop, heading,
// and the 3-column layout (left / center / right).
// Used by `/` (classic), `/live` (audience) and `/control` (dashboard)
// so all screens share one look.
export default function AuctionShell({
  title = "IPL MOCK AUCTION",
  left,
  center,
  right,
  topRight,
}) {
  return (
    <div className="min-h-screen bg-[#193153] text-white overflow-x-clip ">
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
      {topRight && (
        <div className="absolute z-40 top-4 right-4 flex gap-2">{topRight}</div>
      )}
      <div className="relative z-10 ">
        <h1
          className="text-center text-5xl  relative z-10 heading-font"
          // style={{ textShadow: "4px 4px 0px #4f829c" }}
        >
          {/* {title} */}
          <div className="w-full top-0 absolute">
            <img src="title.svg" className="h-48 mx-auto relative" />
          </div>
        </h1>
        <div className="relative flex justify-center items-center px-0 overflow-visible">
          <div className="flex-1 overflow-visible ">{left}</div>
          <div className="relative flex-1 mt-20">{center}</div>
          <div className="flex-1  overflow-visible ">{right}</div>
        </div>
      </div>
    </div>
  );
}
