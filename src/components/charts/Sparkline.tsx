import { CHART, knownRuns, smoothPath } from "./chart-kit";

type Props = {
  values: (number | null)[];
  color?: string;
  width?: number;
  height?: number;
  /** Fixed top so rows in one table share a scale; the row's own top when left out. */
  max?: number;
  /** Decoration beside a number that says the same, unless a summary is given. */
  ariaLabel?: string;
};

// Check-in sparkline (leaderboards and tables): the trend only, no axes. One known point shows as a dot.
export function Sparkline({ values, color = CHART.you, width = 70, height = 24, max, ariaLabel }: Props) {
  const known = values.filter((v): v is number => v !== null);
  const top = max ?? Math.max(1, ...known);
  const n = values.length;
  const x = (i: number) => (n > 1 ? 3 + (i * (width - 6)) / (n - 1) : width / 2);
  const y = (v: number) => height - 3 - (v / top) * (height - 6);
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="shrink-0"
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {knownRuns(values).map((run, k) =>
        run.length > 1 ? (
          <path key={k} d={smoothPath(run.map(([i, v]) => [x(i), y(v)] as const))} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
        ) : (
          <circle key={k} cx={x(run[0][0])} cy={y(run[0][1])} r="2.5" fill={color} />
        ),
      )}
    </svg>
  );
}
