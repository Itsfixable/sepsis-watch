"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/DataTable";
import { Icon } from "@/components/Icon";
import { hourTicks, RiskChart } from "@/components/RiskChart";
import { StatusLight } from "@/components/StatusLight";
import { VitalTiles, type TileValue } from "@/components/VitalTiles";
import type { ReadingsResponse, StoredReading, VitalKey } from "@/lib/types";
import { lastKnown, VITALS } from "@/lib/vitals";

const POLL_MS = 10_000;
const SILENT_AFTER_MINUTES = 90;
const HOUR_MS = 60 * 60 * 1000;
const WINDOWS = [12, 24, 48] as const;

async function fetchReadings(): Promise<StoredReading[]> {
  const res = await fetch("/api/readings", { cache: "no-store" });
  if (!res.ok) throw new Error(`Server answered ${res.status}`);
  const body = (await res.json()) as ReadingsResponse;
  return body.readings;
}

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const tickFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export function LiveMonitor() {
  const [chartHours, setChartHours] = useState<number>(48);
  const { data: readings = [], error, isPending, isFetching, dataUpdatedAt, refetch } = useQuery({
    queryKey: ["readings"],
    queryFn: fetchReadings,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: true,
  });
  const latest = readings.at(-1);
  const lastIndex = readings.length - 1;
  const tiles = Object.fromEntries(
    VITALS.map(({ key }) => {
      const found = lastKnown(readings, key, lastIndex);
      const tile: TileValue = {
        value: found?.value ?? null,
        note: found && found.index !== lastIndex ? `as of ${timeFmt.format(new Date(readings[found.index].timestamp))}` : undefined,
      };
      return [key, tile];
    }),
  ) as Record<VitalKey, TileValue>;

  const lastMs = latest ? Date.parse(latest.timestamp) : 0;
  const recent = readings.filter((r) => Date.parse(r.timestamp) > lastMs - chartHours * HOUR_MS);
  const points = recent.map((r) => ({ x: Date.parse(r.timestamp), risk: r.risk }));
  const firstMs = points[0]?.x ?? lastMs;
  const xDomain: [number, number] = firstMs === lastMs ? [lastMs - HOUR_MS, lastMs + HOUR_MS] : [firstMs, lastMs];
  const minutesSinceLast = latest ? Math.max(0, Math.round((dataUpdatedAt - Date.parse(latest.receivedAt)) / 60000)) : null;
  const silent = minutesSinceLast !== null && minutesSinceLast >= SILENT_AFTER_MINUTES;
  const connectionLabel = error ? "Connection lost" : isPending ? "Connecting" : silent ? "Readings delayed" : latest ? "Receiving data" : "Waiting for data";
  const dotClass = error ? "dot-critical" : silent ? "dot-warning" : latest && !isPending ? "dot-good" : "";

  return (
    <div className="page-shell">
      <div className="breadcrumb"><span>Workspace</span><Icon name="chevron" size={11} /><span>Monitor</span></div>
      <div className="page-heading">
        <div><h1>Patient monitor</h1><p className="page-description">Vital signs and early-warning risk, in one view.</p></div>
        <div className="page-actions">
          <span className="connection" role="status"><span className={`status-dot ${dotClass}`} />{connectionLabel}</span>
          <button className="button" type="button" onClick={() => refetch()} disabled={isFetching}><Icon name="refresh" size={14} />{isFetching ? "Refreshing…" : "Refresh"}</button>
        </div>
      </div>

      {error && <Banner tone="critical">Unable to reach the server. {latest ? "Showing the last readings received. " : ""}Reconnecting automatically every 10 seconds.</Banner>}
      {silent && !error && <Banner tone="warning">No new reading for {minutesSinceLast} minutes. Check the bedside unit&apos;s power and Wi-Fi connection.</Banner>}

      <div className="patient-strip">
        <span className="bed-icon"><Icon name="bed" size={20} /></span>
        <div className="patient-title"><strong>Bed 01</strong><span>Bedside unit</span></div>
        <span className="patient-strip-meta"><Icon name="clock" size={13} />{latest ? `Last reading ${dateTimeFmt.format(new Date(latest.timestamp))}` : "No readings received"}</span>
      </div>
      <VitalTiles values={tiles} history={readings} />

      <div className="monitor-grid">
        <section aria-labelledby="trend-title" className="trend-panel">
          <div className="panel-heading">
            <div><h2 id="trend-title">Risk over time</h2><p className="panel-subtitle">Hourly sepsis risk score</p></div>
            <div className="segmented-control" role="group" aria-label="Chart time window">{WINDOWS.map((hours) => <button key={hours} type="button" aria-pressed={chartHours === hours} onClick={() => setChartHours(hours)}>{hours}h</button>)}</div>
          </div>
          <div className="chart-legend"><span /><span>Risk score</span><span className="chart-legend-note">0.00 low · 1.00 high</span></div>
          {points.length > 0 ? (
            <RiskChart points={points} xDomain={xDomain} xTicks={hourTicks(xDomain[0], xDomain[1], HOUR_MS)} formatTick={(x) => tickFmt.format(new Date(x))} formatX={(x) => dateTimeFmt.format(new Date(x))} showEndDot ariaLabel={`Sepsis risk score over the last ${chartHours} hours, with ${points.length} readings. Latest score ${latest?.risk.toFixed(2)}.`} />
          ) : <EmptyChart loading={isPending} hasError={Boolean(error)} />}
          <div className="chart-footer"><span><Icon name="clock" size={12} />Last {chartHours} hours · {recent.length} {recent.length === 1 ? "reading" : "readings"}</span><span>{dataUpdatedAt > 0 ? `Last checked ${timeFmt.format(new Date(dataUpdatedAt))}` : "Checking for readings"}</span></div>
        </section>
        <StatusLight risk={latest?.risk ?? null} caption={latest ? timeFmt.format(new Date(latest.timestamp)) : undefined} />
      </div>

      {readings.length > 0 && <DataTable caption="Hourly readings from the bedside unit" rows={readings.map((r) => ({ ...r, key: r.timestamp, time: dateTimeFmt.format(new Date(r.timestamp)) }))} />}

      <section className="replay-promo" aria-label="Explore timelines">
        <div className="promo-icon"><Icon name="replay" size={20} /></div>
        <div><h2>See the full patient story</h2><p>Review a timeline to follow observations and changes in risk.</p></div>
        <Link href="/replay" className="text-link">Explore timelines<Icon name="arrow" size={16} /></Link>
      </section>
    </div>
  );
}

function Banner({ tone, children }: { tone: "warning" | "critical"; children: React.ReactNode }) {
  return <div role="status" className="banner" data-tone={tone}><Icon name="alert" size={16} /><p>{children}</p></div>;
}

function EmptyChart({ loading, hasError }: { loading: boolean; hasError: boolean }) {
  return (
    <div className="empty-chart" aria-busy={loading}>
      {loading ? <><span className="sr-only">Loading readings</span><div className="chart-skeleton" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <span key={i} />)}</div></> : (
        <div className="empty-chart-content"><Icon name={hasError ? "signal" : "monitor"} size={29} /><h3>{hasError ? "Waiting for connection" : "Ready for the first reading"}</h3><p>{hasError ? "The trend will return when the server reconnects." : "Readings will appear here automatically when your bedside unit starts sending data."}</p><Link href="/replay" className="text-link">Explore timelines<Icon name="arrow" size={13} /></Link></div>
      )}
    </div>
  );
}
