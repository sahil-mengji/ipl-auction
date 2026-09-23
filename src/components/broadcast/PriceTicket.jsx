/* eslint-disable react/prop-types */
// Parallelogram price ticket: label tab + big beveled value.
// `mirror` leans it left instead of right; `compact` renders a slimmer,
// secondary-looking ticket (e.g. under a hero name banner).
// `align` sets text alignment; `inline` puts label and value on one line.
export default function PriceTicket({ label, value, gold = false, mirror = false, compact = false, align = "center", inline = false }) {
  const alignCls = align === "left" ? "text-left" : align === "right" ? "text-right" : "text-center";
  const justifyCls = align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center";
  const labelCls = `${compact ? "text-sm" : "text-[11px]"} font-bold tracking-[0.25em] uppercase ${gold ? "" : "text-white/60"}`;
  const valueCls = `${compact ? "text-3xl" : "text-2xl"} font-extrabold whitespace-nowrap ${gold ? "bc-emboss" : "bc-gold-text"}`;
  return (
    <div className={`${mirror ? "bc-para-r" : "bc-para"} ${gold ? "bc-para-gold" : ""} ${compact ? "px-2 py-1 w-fit" : "px-6 py-2.5"} min-w-0`}>
      {inline ? (
        <div className={`flex items-baseline gap-1 ${justifyCls}`}>
          <p className={labelCls}>{label}</p>
          <p className={valueCls}>{value}</p>
        </div>
      ) : (
        <div className={alignCls}>
          <p className={labelCls}>{label}</p>
          <p className={valueCls}>{value}</p>
        </div>
      )}
    </div>
  );
}
