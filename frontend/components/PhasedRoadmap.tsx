"use client";

import { useEffect, useState } from "react";
import { Calendar, CheckCircle2, Layers, ShieldAlert, Sparkles } from "lucide-react";

type Remediation = {
  asset_name: string;
  cve_id: string;
  threat_source: string;
  remediation_fix: string;
  fix_cost_inr: number;
  delta_eal_inr: number;
  scheduled_quarter?: string;
};

type QuarterPlan = {
  quarter: string;
  spend_inr: number;
  eal_reduction_inr: number;
  remaining_eal_inr: number;
  remediations: Remediation[];
};

type Props = {
  apiBase: string;
  seedAssets: any[];
  formatMoney: (val: number) => string;
};

export function PhasedRoadmap({ apiBase, seedAssets, formatMoney }: Props) {
  const [maxFixes, setMaxFixes] = useState<number>(2);
  const [quarterlyBudget, setQuarterlyBudget] = useState<number>(3000000);
  const [roadmap, setRoadmap] = useState<{ quarters: QuarterPlan[]; total_spend_inr: number; total_eal_reduction_inr: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchRoadmap = async () => {
      setLoading(true);
      try {
        const resp = await fetch(`${apiBase}/api/v1/optimize-roadmap`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quarterly_budgets: [quarterlyBudget, quarterlyBudget, quarterlyBudget, quarterlyBudget],
            max_fixes_per_quarter: maxFixes,
            assets: seedAssets,
          }),
        });
        const data = await resp.json();
        setRoadmap(data);
      } catch (err) {
        console.error("Roadmap fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmap();
  }, [apiBase, seedAssets, quarterlyBudget, maxFixes]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-400">
            <Calendar className="h-4 w-4" /> Multi-Period Capital Allocation Engine
          </div>
          <h2 className="text-xl font-bold text-white">Q1–Q4 Phased Remediation Roadmap</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300">
            <span>Quarterly Budget:</span>
            <button
              onClick={() => setQuarterlyBudget(2000000)}
              className={`px-2 py-0.5 rounded ${quarterlyBudget === 2000000 ? "bg-cyan-500/20 text-cyan-300 font-bold" : "text-slate-400"}`}
            >
              ₹20L
            </button>
            <button
              onClick={() => setQuarterlyBudget(3500000)}
              className={`px-2 py-0.5 rounded ${quarterlyBudget === 3500000 ? "bg-cyan-500/20 text-cyan-300 font-bold" : "text-slate-400"}`}
            >
              ₹35L
            </button>
            <button
              onClick={() => setQuarterlyBudget(5000000)}
              className={`px-2 py-0.5 rounded ${quarterlyBudget === 5000000 ? "bg-cyan-500/20 text-cyan-300 font-bold" : "text-slate-400"}`}
            >
              ₹50L
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300">
            <span>Eng Capacity Limit:</span>
            <select
              value={maxFixes}
              onChange={(e) => setMaxFixes(Number(e.target.value))}
              className="bg-slate-900 text-cyan-300 rounded border border-slate-700 px-1 py-0.5 text-xs focus:outline-none"
            >
              <option value={1}>1 fix / qtr</option>
              <option value={2}>2 fixes / qtr</option>
              <option value={3}>3 fixes / qtr</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">Computing multi-quarter PuLP integer solution...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {(roadmap?.quarters ?? []).map((q) => {
            const budgetPct = (q.spend_inr / quarterlyBudget) * 100;
            return (
              <div key={q.quarter} className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4 shadow-md">
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-md bg-cyan-500/10 px-2.5 py-1 text-xs font-bold text-cyan-400 ring-1 ring-cyan-500/20">
                      {q.quarter} Sprint
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      Remaining EAL: <span className="font-semibold text-slate-200">{formatMoney(q.remaining_eal_inr)}</span>
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="mb-1 flex justify-between text-[11px] text-slate-400">
                      <span>Quarter Spend</span>
                      <span className="font-medium text-slate-200">
                        {formatMoney(q.spend_inr)} / {formatMoney(quarterlyBudget)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                        style={{ width: `${Math.min(100, budgetPct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {q.remediations.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-800 p-3 text-center text-xs text-slate-500">
                        No major architectural fixes scheduled in this quarter.
                      </div>
                    ) : (
                      q.remediations.map((item) => (
                        <div key={`${q.quarter}-${item.cve_id}`} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                          <div className="mb-1 flex items-center justify-between text-xs font-medium text-white">
                            <span>{item.asset_name}</span>
                            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300">
                              -{formatMoney(item.delta_eal_inr)} EAL
                            </span>
                          </div>
                          <div className="text-[11px] text-cyan-300 font-mono mb-1">{item.cve_id}</div>
                          <div className="text-[11px] text-slate-400 line-clamp-2">{item.remediation_fix}</div>
                          <div className="mt-2 text-[10px] text-slate-400 flex justify-between border-t border-slate-800/80 pt-1.5">
                            <span>Fix Cost: {formatMoney(item.fix_cost_inr)}</span>
                            <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Scheduled</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-lg bg-slate-900/40 p-2 text-center text-[11px] text-slate-400">
                  Risk Reduction: <span className="font-semibold text-emerald-300">{formatMoney(q.eal_reduction_inr)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
