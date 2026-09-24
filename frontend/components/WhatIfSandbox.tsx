"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Sliders, TrendingUp } from "lucide-react";

type AssetScenario = {
  asset_name: string;
  cve_id: string;
  threat_source: string;
  epss?: number;
  control_strength?: number;
  exposure_multiplier?: number;
  base_frequency?: number;
  records?: number;
  downtime_hours?: number;
  remediation_cost_inr?: number;
  remediation_fix?: string;
  slef?: number;
};

type Props = {
  baselineAssets: AssetScenario[];
  baselineEal: number;
  baselineVar: number;
  formatMoney: (val: number) => string;
};

export function WhatIfSandbox({ baselineAssets, baselineEal, baselineVar, formatMoney }: Props) {
  const [threatMultiplier, setThreatMultiplier] = useState<number>(1.5);
  const [downtimeMultiplier, setDowntimeMultiplier] = useState<number>(1.2);
  const [slefVal, setSlefVal] = useState<number>(0.5);
  const [controlShift, setControlShift] = useState<number>(0.0);

  const safeBaselineEal = Number(baselineEal) > 0 ? Number(baselineEal) : 1000000;
  const safeBaselineVar = Number(baselineVar) > 0 ? Number(baselineVar) : safeBaselineEal * 2.2;

  const simulatedWhatIf = useMemo(() => {
    let rawWhatIfEal = 0;
    const assets = Array.isArray(baselineAssets) && baselineAssets.length > 0 ? baselineAssets : [];

    assets.forEach((asset) => {
      const baseFreq = Number(asset.base_frequency ?? 12.0) || 12.0;
      const epssVal = Number(asset.epss ?? 0.5) || 0.5;
      const expMult = Number(asset.exposure_multiplier ?? 1.0) || 1.0;
      const ctrlStr = Number(asset.control_strength ?? 0.5) || 0.5;
      const recs = Number(asset.records ?? 10000) || 10000;
      const downtimeHrs = Number(asset.downtime_hours ?? 12) || 12;

      const effFrequency = baseFreq * epssVal * expMult * threatMultiplier;
      const effControl = Math.min(0.95, Math.max(0.05, ctrlStr + controlShift));
      const exploitProb = epssVal * (1 - effControl);

      const isSmb = recs < 30000 || Number(asset.remediation_cost_inr ?? 1000000) < 500000;
      const recCostPri = isSmb ? 45 : 250;
      const recCostSec = isSmb ? 30 : 200;
      const downCostPri = isSmb ? 12000 : 120000;
      const downCostSec = isSmb ? 8000 : 80000;

      const primaryLoss = recs * recCostPri + downtimeHrs * downtimeMultiplier * downCostPri;
      const secondaryLoss = (recs * recCostSec + downtimeHrs * downtimeMultiplier * downCostSec) * slefVal;

      const singleLoss = primaryLoss + secondaryLoss;
      const assetEal = effFrequency * exploitProb * singleLoss * 0.15;
      if (!isNaN(assetEal) && isFinite(assetEal)) {
        rawWhatIfEal += assetEal;
      }
    });

    const whatIfEal = rawWhatIfEal > 0 ? rawWhatIfEal : safeBaselineEal * threatMultiplier;
    const whatIfVar = whatIfEal * 2.4;

    const chartData = Array.from({ length: 40 }, (_, idx) => {
      const step = idx / 39;
      const lossVal = (safeBaselineVar * 1.5) * step;

      const probBaseline = Math.max(0, Math.exp(-lossVal / Math.max(1, safeBaselineEal * 0.8)));
      const probWhatIf = Math.max(0, Math.exp(-lossVal / Math.max(1, whatIfEal * 0.8)));

      return {
        x: lossVal,
        baseline: isNaN(probBaseline) ? 0 : Number(probBaseline.toFixed(3)),
        whatIf: isNaN(probWhatIf) ? 0 : Number(probWhatIf.toFixed(3)),
      };
    });

    return { whatIfEal, whatIfVar, chartData };
  }, [baselineAssets, threatMultiplier, downtimeMultiplier, slefVal, controlShift, safeBaselineEal, safeBaselineVar]);

  const ealDeltaPercent = safeBaselineEal > 0 && !isNaN(simulatedWhatIf.whatIfEal)
    ? ((simulatedWhatIf.whatIfEal - safeBaselineEal) / safeBaselineEal) * 100
    : 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
            <Sliders className="h-4 w-4" /> Stress Testing & Sensitivity Analysis
          </div>
          <h2 className="text-xl font-bold text-white">What-If Scenario Sandbox</h2>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300">
          Compare Baseline vs. Custom Threat Multipliers
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
          <div className="mb-1 flex justify-between text-xs text-slate-300">
            <span>Threat Capability</span>
            <span className="font-semibold text-amber-400">{threatMultiplier.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={3.0}
            step={0.1}
            value={threatMultiplier}
            onChange={(e) => setThreatMultiplier(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-amber-400"
          />
          <div className="mt-1 text-[10px] text-slate-400">Simulate nation-state attack frequency</div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
          <div className="mb-1 flex justify-between text-xs text-slate-300">
            <span>Downtime Cost Multiplier</span>
            <span className="font-semibold text-cyan-400">{downtimeMultiplier.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={3.0}
            step={0.1}
            value={downtimeMultiplier}
            onChange={(e) => setDowntimeMultiplier(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-cyan-400"
          />
          <div className="mt-1 text-[10px] text-slate-400">Simulate extended operational outage</div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
          <div className="mb-1 flex justify-between text-xs text-slate-300">
            <span>Secondary Fine Frequency (SLEF)</span>
            <span className="font-semibold text-violet-400">{(slefVal * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1.0}
            step={0.05}
            value={slefVal}
            onChange={(e) => setSlefVal(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-violet-400"
          />
          <div className="mt-1 text-[10px] text-slate-400">Regulatory audit penalty probability</div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
          <div className="mb-1 flex justify-between text-xs text-slate-300">
            <span>Control Degradation Shift</span>
            <span className="font-semibold text-emerald-400">{(controlShift * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={-0.3}
            max={0.3}
            step={0.05}
            value={controlShift}
            onChange={(e) => setControlShift(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-emerald-400"
          />
          <div className="mt-1 text-[10px] text-slate-400">Control strength improvement / decay</div>
        </div>
      </div>

      {/* Delta Metrics */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-xs text-slate-400">Baseline Annual Risk</div>
          <div className="text-2xl font-bold text-white">{formatMoney(safeBaselineEal)}</div>
          <div className="mt-1 text-xs text-slate-400">Standard posture</div>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="text-xs text-amber-300">What-If Modeled Risk</div>
          <div className="text-2xl font-bold text-amber-200">{formatMoney(simulatedWhatIf.whatIfEal)}</div>
          <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-amber-400">
            <TrendingUp className="h-3.5 w-3.5" />
            {ealDeltaPercent >= 0 ? `+${ealDeltaPercent.toFixed(1)}%` : `${ealDeltaPercent.toFixed(1)}%`} change vs baseline
          </div>
        </div>

        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="text-xs text-red-300">What-If 95% VaR (Worst-Case)</div>
          <div className="text-2xl font-bold text-red-200">{formatMoney(simulatedWhatIf.whatIfVar)}</div>
          <div className="mt-1 flex items-center gap-1 text-xs text-red-300">
            <AlertTriangle className="h-3.5 w-3.5" /> Extreme stress scenario
          </div>
        </div>
      </div>

      {/* Curve Chart Comparison */}
      <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
        <div className="mb-3 text-xs font-medium text-slate-300">
          Loss Exceedance Curve Overlay: Baseline (Cyan) vs. What-If Stress Scenario (Amber)
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <AreaChart data={simulatedWhatIf.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="baselineCurve" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="whatIfCurve" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="x" tickFormatter={(v) => formatMoney(Number(v) || 0)} tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis domain={[0, 1]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Tooltip
                formatter={(v: any) => {
                  const num = Number(v);
                  return isNaN(num) ? "0.0%" : `${(num * 100).toFixed(1)}%`;
                }}
                labelFormatter={(l: any) => `Loss: ${formatMoney(Number(l) || 0)}`}
              />
              <Area type="monotone" dataKey="baseline" stroke="#22d3ee" fill="url(#baselineCurve)" strokeWidth={2} name="Baseline" />
              <Area type="monotone" dataKey="whatIf" stroke="#f59e0b" fill="url(#whatIfCurve)" strokeWidth={2} name="What-If Scenario" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
