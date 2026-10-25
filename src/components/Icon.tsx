import type { ReactNode } from "react";

export type IconName = "activity" | "monitor" | "replay" | "arrow" | "refresh" | "clock" | "signal" | "info" | "temperature" | "breathing" | "oxygen" | "check" | "alert" | "bed" | "table" | "chevron";

const paths: Record<IconName, ReactNode> = {
  activity: <path d="M2 12h4l3-7 5 14 3-7h5" />,
  monitor: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4M6 11h3l2-4 3 7 2-3h2" /></>,
  replay: <><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" /><path d="m10 8 6 4-6 4z" /></>,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  refresh: <path d="M20 7a8 8 0 0 0-14-2L3 8m0-5v5h5m-4 9a8 8 0 0 0 14 2l3-3m0 5v-5h-5" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  signal: <path d="M5 19v-3m5 3v-7m5 7V8m5 11V4" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-10v.01" /></>,
  temperature: <><path d="M9 14.5V5a3 3 0 0 1 6 0v9.5a5 5 0 1 1-6 0Z" /><path d="M12 8v10m6-11h3m-3 4h2" /></>,
  breathing: <path d="M12 3v7m0-3L9 9m3-2 3 2M8 6C5 8 3 12 3 17c0 3 4 3 6 1V10m7-4c3 2 5 6 5 11 0 3-4 3-6 1V10" />,
  oxygen: <><path d="M12 3c-2 4-7 8-7 12a7 7 0 0 0 14 0c0-4-5-8-7-12Z" /><path d="M9 15a3 3 0 0 0 3 3" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  alert: <><path d="m12 3 10 18H2L12 3Z" /><path d="M12 9v5m0 3v.01" /></>,
  bed: <><path d="M3 6v14m18-7v7M3 17h18M3 10h5a3 3 0 0 1 3 3v4m0-6h7a3 3 0 0 1 3 3" /><path d="M6 7h1" /></>,
  table: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11m-6-6h18" /></>,
  chevron: <path d="m9 5 7 7-7 7" />,
};

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>{paths[name]}</svg>;
}
