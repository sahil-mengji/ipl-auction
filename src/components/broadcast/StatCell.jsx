/* eslint-disable react/prop-types */
// Beveled inset stat cell.
export default function StatCell({ label, value }) {
  return (
    <div className="bc-stat-cell rounded-md px-2 py-2 text-center">
      <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/50">{label}</p>
      <p className="text-lg font-extrabold text-white bc-emboss leading-tight">{value}</p>
    </div>
  );
}
