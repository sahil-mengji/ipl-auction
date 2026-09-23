/* eslint-disable react/prop-types */
// Chunky 3D broadcast button. tone: "" | "green" | "gold" | "danger"
export default function MetalButton({ tone = "", className = "", children, ...rest }) {
  const toneClass = tone ? `bc-btn-${tone}` : "";
  return (
    <button className={`bc-btn ${toneClass} px-5 py-2.5 rounded-md ${className}`} {...rest}>
      <span className="block text-sm font-extrabold tracking-wider uppercase">{children}</span>
    </button>
  );
}
