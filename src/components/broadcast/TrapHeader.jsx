/* eslint-disable react/prop-types */
// Trapezium section header — sports-broadcast style.
// `big` renders a hero-scale banner (e.g. player name over the base price).
// `mirror` flips the trapezium to lean left instead of right.
// `align` sets the text alignment ("center" default).
// `skewText` shears the text to match the banner's slant.
export default function TrapHeader({ children, gold = false, big = false, mirror = false, align = "center", skewText = false, className = "" }) {
  const alignCls = align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";
  return (
    <div className={`${mirror ? "bc-trap-r" : "bc-trap"} ${gold ? "bc-trap-gold" : ""} ${big ? "pl-10 pr-56 py-2.5" : "px-8 py-2"} ${className}`}>
      <span className={`block font-extrabold uppercase bc-emboss ${alignCls} ${skewText ? "skew-x-[8deg]" : ""} ${big ? "text-8xl leading-[0.95] tracking-[0.06em]" : "text-sm tracking-[0.2em]"}`}>
        {children}
      </span>
    </div>
  );
}
