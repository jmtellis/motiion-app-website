import type { ReactNode } from "react";

export type EmptyIllustrationName =
  | "calendar"
  | "castings"
  | "inbox"
  | "portfolio"
  | "projects"
  | "people"
  | "events"
  | "search";

const INK = "#1c1c1c";
const ACCENT = "#0b7d74";
const ACCENT_SOFT = "#bfe9e2";
const PAPER = "#ffffff";
const LINE = "#d7dcdb";
const FILL = "#eef1f0";
const FILL_DEEP = "#dfe5e3";

function Ground() {
  return <ellipse cx="100" cy="128" rx="62" ry="6" fill="#000" opacity=".07" />;
}

function Card({ x, y, w, h, r = 10, fill = PAPER, rotate = 0 }: { x: number; y: number; w: number; h: number; r?: number; fill?: string; rotate?: number }) {
  return (
    <g transform={rotate ? `rotate(${rotate} ${x + w / 2} ${y + h / 2})` : undefined}>
      <rect x={x} y={y + 2} width={w} height={h} rx={r} fill="#000" opacity=".06" />
      <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} stroke={LINE} />
    </g>
  );
}

function Lines({ x, y, widths, gap = 9 }: { x: number; y: number; widths: number[]; gap?: number }) {
  return (
    <>
      {widths.map((w, i) => (
        <rect key={i} x={x} y={y + i * gap} width={w} height="4" rx="2" fill={i === 0 ? FILL_DEEP : FILL} />
      ))}
    </>
  );
}

function Sparkle({ x, y, s = 1, color = ACCENT }: { x: number; y: number; s?: number; color?: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0-7C.8-2 2-.8 7 0 2 .8.8 2 0 7-.8 2-2 .8-7 0-2-.8-.8-2 0-7Z" fill={color} />;
}

const ART: Record<EmptyIllustrationName, ReactNode> = {
  calendar: (
    <>
      <Ground />
      <Card x={46} y={26} w={108} h={96} r={14} />
      <path d="M46 40a14 14 0 0 1 14-14h80a14 14 0 0 1 14 14v8H46z" fill={ACCENT} />
      <rect x="70" y="18" width="6" height="16" rx="3" fill={INK} />
      <rect x="124" y="18" width="6" height="16" rx="3" fill={INK} />
      {[0, 1, 2, 3].map((col) =>
        [0, 1, 2].map((row) => {
          const cx = 66 + col * 23;
          const cy = 66 + row * 18;
          const on = col === 2 && row === 1;
          return on ? (
            <rect key={`${col}-${row}`} x={cx - 9} y={cy - 6} width="18" height="12" rx="6" fill={INK} />
          ) : (
            <circle key={`${col}-${row}`} cx={cx} cy={cy} r="3.5" fill={FILL_DEEP} />
          );
        }),
      )}
      <circle cx="152" cy="104" r="13" fill={PAPER} stroke={LINE} />
      <path d="M152 98v12M146 104h12" stroke={ACCENT} strokeWidth="2.6" strokeLinecap="round" />
    </>
  ),
  castings: (
    <>
      <Ground />
      <Card x={58} y={22} w={96} h={70} r={14} fill={FILL} rotate={7} />
      <Card x={44} y={36} w={104} h={80} r={14} />
      <rect x="56" y="48" width="22" height="22" rx="7" fill={ACCENT_SOFT} />
      <path d="M62 60l6-5v10z" fill={ACCENT} />
      <Lines x={84} y={51} widths={[48, 32]} />
      <Lines x={56} y={80} widths={[78, 62]} />
      <rect x="104" y="98" width="34" height="11" rx="5.5" fill={INK} />
      <Sparkle x={160} y={30} />
      <Sparkle x={38} y={30} s={0.6} color={INK} />
    </>
  ),
  inbox: (
    <>
      <Ground />
      <path d="M40 40a14 14 0 0 1 14-14h66a14 14 0 0 1 14 14v26a14 14 0 0 1-14 14H66l-14 11v-11.6A14 14 0 0 1 40 66z" fill={PAPER} stroke={LINE} />
      <Lines x={54} y={42} widths={[56, 40]} gap={11} />
      <path d="M72 76a14 14 0 0 1 14-14h60a14 14 0 0 1 14 14v18a14 14 0 0 1-14 14h-2v10l-12-10H86a14 14 0 0 1-14-14z" fill={ACCENT} />
      <circle cx="100" cy="85" r="3.4" fill={PAPER} />
      <circle cx="113" cy="85" r="3.4" fill={PAPER} opacity=".8" />
      <circle cx="126" cy="85" r="3.4" fill={PAPER} opacity=".6" />
      <Sparkle x={162} y={36} s={0.8} color={INK} />
    </>
  ),
  portfolio: (
    <>
      <Ground />
      <Card x={70} y={20} w={78} h={100} r={14} fill={FILL} rotate={8} />
      <Card x={52} y={24} w={80} h={100} r={14} />
      <rect x="60" y="32" width="64" height="56" rx="9" fill={ACCENT_SOFT} />
      <circle cx="92" cy="52" r="10" fill={ACCENT} />
      <path d="M72 88c3-12 11-18 20-18s17 6 20 18z" fill={ACCENT} />
      <Lines x={62} y={98} widths={[44, 30]} />
      <circle cx="140" cy="34" r="12" fill={INK} />
      <path d="m140 27 2.1 4.4 4.8.6-3.5 3.3.9 4.8-4.3-2.3-4.3 2.3.9-4.8-3.5-3.3 4.8-.6z" fill={PAPER} />
    </>
  ),
  projects: (
    <>
      <Ground />
      <Card x={62} y={24} w={76} h={70} r={8} />
      <Lines x={72} y={36} widths={[44, 52, 30]} />
      <path d="M40 54a10 10 0 0 1 10-10h28l10 10h62a10 10 0 0 1 10 10v44a12 12 0 0 1-12 12H52a12 12 0 0 1-12-12z" fill={ACCENT} />
      <path d="M40 66h120" stroke="#fff" strokeOpacity=".25" />
      <rect x="128" y="96" width="22" height="10" rx="5" fill={PAPER} opacity=".9" />
      <Sparkle x={158} y={30} s={0.8} color={INK} />
    </>
  ),
  people: (
    <>
      <Ground />
      <Card x={36} y={40} w={128} h={78} r={16} />
      <circle cx="78" cy="66" r="15" fill={FILL_DEEP} stroke={PAPER} strokeWidth="3" />
      <circle cx="100" cy="62" r="18" fill={ACCENT} stroke={PAPER} strokeWidth="3" />
      <circle cx="122" cy="66" r="15" fill={INK} stroke={PAPER} strokeWidth="3" />
      <circle cx="100" cy="56" r="6" fill={PAPER} opacity=".9" />
      <path d="M89 74c2-6 6-9 11-9s9 3 11 9" stroke={PAPER} strokeWidth="3" strokeLinecap="round" fill="none" opacity=".9" />
      <Lines x={66} y={92} widths={[68, 44]} />
      <Sparkle x={162} y={34} />
    </>
  ),
  events: (
    <>
      <Ground />
      <g transform="rotate(-6 100 74)">
        <path d="M42 46a10 10 0 0 1 10-10h96a10 10 0 0 1 10 10v8a10 10 0 0 0 0 20v8a10 10 0 0 1-10 10H52a10 10 0 0 1-10-10v-8a10 10 0 0 0 0-20z" fill={PAPER} stroke={LINE} />
        <path d="M118 40v48" stroke={LINE} strokeDasharray="4 4" />
        <rect x="54" y="48" width="52" height="7" rx="3.5" fill={INK} />
        <Lines x={54} y={62} widths={[40, 28]} />
        <circle cx="138" cy="64" r="9" fill={ACCENT} />
      </g>
      <Sparkle x={156} y={102} />
      <Sparkle x={44} y={104} s={0.6} color={INK} />
    </>
  ),
  search: (
    <>
      <Ground />
      <Card x={40} y={34} w={96} h={80} r={14} />
      <Lines x={52} y={48} widths={[56, 40, 64, 30]} gap={12} />
      <circle cx="128" cy="70" r="22" fill={PAPER} fillOpacity=".7" stroke={INK} strokeWidth="6" />
      <path d="m144 86 16 16" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <path d="M118 62a12 12 0 0 1 10-5" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" fill="none" />
    </>
  ),
};

/** Spot illustrations for empty states: one flat style, a single accent. */
export function EmptyIllustration({ name, className = "" }: { name: EmptyIllustrationName; className?: string }) {
  return (
    <svg className={`ui-empty-illustration ${className}`.trim()} viewBox="0 0 200 140" width="200" height="140" aria-hidden focusable="false">
      {ART[name]}
    </svg>
  );
}
