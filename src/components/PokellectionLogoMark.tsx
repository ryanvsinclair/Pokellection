/** Fanned generic TCG card silhouettes + Pokellection wordmark (no Pokéball). */

interface Props {
  variant?: "light" | "dark";
  className?: string;
}

const POKE_RED = "#E3350D";

export function PokellectionLogoMark({ variant = "light", className }: Props) {
  const isLight = variant === "light";
  const llectionFill = isLight ? "#0f172a" : "#f8fafc";

  const fire = isLight
    ? { frame: "#991b1b", body: "#dc2626", art: "#fca5a5", bar: "#b91c1c" }
    : { frame: "#fca5a5", body: "#ef4444", art: "#fecaca", bar: "#dc2626" };
  const fairy = isLight
    ? { frame: "#9d174d", body: "#ec4899", art: "#fbcfe8", bar: "#db2777" }
    : { frame: "#f9a8d4", body: "#f472b6", art: "#fce7f3", bar: "#ec4899" };

  const w = 44;
  const h = 60;
  const art = 36;
  const barH = 11;
  const pad = 5;
  const cx = w / 2;
  const cy = h / 2;

  return (
    <svg
      viewBox="0 0 310 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-hidden
      overflow="visible"
    >
      <title>Pokellection</title>
      {/* Back card — fire red */}
      <g transform={`translate(14 11) rotate(-12 ${cx} ${cy})`}>
        <rect
          x="0"
          y="0"
          width={w}
          height={h}
          rx="4"
          fill={fire.body}
          stroke={fire.frame}
          strokeWidth="1.75"
        />
        <rect
          x={pad}
          y={pad}
          width={art}
          height={art}
          rx="2.5"
          fill={fire.art}
          stroke={fire.frame}
          strokeWidth="1"
        />
        <rect
          x={pad}
          y={h - pad - barH}
          width={art}
          height={barH}
          rx="2"
          fill={fire.bar}
          stroke={fire.frame}
          strokeWidth="1"
        />
      </g>
      {/* Front card — fairy pink */}
      <g transform={`translate(34 9) rotate(8 ${cx} ${cy})`}>
        <rect
          x="0"
          y="0"
          width={w}
          height={h}
          rx="4"
          fill={fairy.body}
          stroke={fairy.frame}
          strokeWidth="1.75"
        />
        <rect
          x={pad}
          y={pad}
          width={art}
          height={art}
          rx="2.5"
          fill={fairy.art}
          stroke={fairy.frame}
          strokeWidth="1"
        />
        <rect
          x={pad}
          y={h - pad - barH}
          width={art}
          height={barH}
          rx="2"
          fill={fairy.bar}
          stroke={fairy.frame}
          strokeWidth="1"
        />
      </g>
      <text
        x="86"
        y="48"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="36"
        fontWeight="700"
        letterSpacing="-0.02em"
      >
        <tspan fill={POKE_RED}>Poke</tspan>
        <tspan fill={llectionFill}>llection</tspan>
      </text>
    </svg>
  );
}
