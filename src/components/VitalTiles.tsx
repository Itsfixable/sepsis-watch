import { celsiusToFahrenheit, VITALS } from "@/lib/vitals";
import type { VitalKey, Vitals } from "@/lib/types";
import { Icon, type IconName } from "./Icon";

export type TileValue = { value: number | null; note?: string };
const icons: Record<VitalKey, IconName> = { heartRate: "activity", respRate: "breathing", tempC: "temperature", spo2: "oxygen" };

export function VitalTiles({ values, history = [], sourceLabel }: { values: Record<VitalKey, TileValue>; history?: Vitals[]; sourceLabel?: string }) {
  return (
    <section aria-label="Vital signs" className="vitals-grid">
      {VITALS.map((info) => {
        const { value, note } = values[info.key];
        return (
          <article key={info.key} className="vital-tile">
            <div className="vital-heading"><h3>{info.label}</h3><Icon name={icons[info.key]} size={19} /></div>
            <div className="vital-value-row"><p className="vital-value">{value === null ? "—" : value.toFixed(info.decimals)}<span>{info.unit}</span></p><Sparkline values={history.slice(-24).map((r) => r[info.key])} /></div>
            <p className="vital-note">{value === null ? note || "Awaiting reading" : info.key === "tempC" ? `${celsiusToFahrenheit(value).toFixed(1)} °F${note ? ` · ${note}` : ""}` : note || "Latest available reading"}</p>
            <div className="vital-context"><span>Typical <strong>{info.typical}</strong></span><span>{sourceLabel ?? info.sensor}</span></div>
          </article>
        );
      })}
    </section>
  );
}

// Preserve gaps so a missed sensor reading is never drawn as measured data.
function Sparkline({ values }: { values: (number | null)[] }) {
  const measured = values.filter((v): v is number => v !== null);
  if (measured.length < 2) return null;
  const min = Math.min(...measured);
  const span = Math.max(...measured) - min || 1;
  const path = values.map((value, index) => {
    if (value === null) return "";
    const command = index > 0 && values[index - 1] !== null ? "L" : "M";
    return `${command}${(index / (values.length - 1)) * 80 + 2},${30 - ((value - min) / span) * 24}`;
  }).join(" ");
  return <svg className="vital-sparkline" width="84" height="36" viewBox="0 0 84 36" aria-hidden="true"><path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}
