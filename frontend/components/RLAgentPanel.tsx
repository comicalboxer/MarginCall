"use client";

import { useCallback, useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertCircle, Brain, Cpu, Play, Sparkles, Zap } from "lucide-react";

type Props = {
  apiBase: string;
  seedAssets: any[];
  budget: number;
  formatMoney: (val: number) => string;
};

export function RLAgentPanel({ apiBase, seedAssets, budget, formatMoney }: Props) {
  const [episodes, setEpisodes] = useState<number>(400);
  const [alpha, setAlpha] = useState<number>(0.1);
  const [gamma, setGamma] = useState<number>(0.95);
  const [rlData, setRlData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const trainAgent = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${apiBase}/api/v1/optimize-rl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budget_inr: budget,
          assets: seedAssets,
          episodes,
          alpha,
          gamma,
          epsilon: 1.0,
        }),
      });
      const data = await resp.json();
      setRlData(data);
    } catch (err) {
      console.error("RL Agent training error:", err);
    } finally {
      setLoading(false);
    }
  }, [apiBase, budget, seedAssets, episodes, alpha, gamma]);

  useEffect(() => {
    trainAgent();
  }, [trainAgent]);

  const minFixCost = Math.min(...(seedAssets || []).map((a: any) => Number(a.remediation_cost_inr || 0)));
  const isBudgetTooLow = budget < minFixCost;

  const chartData = (rlData?.reward_history ?? []).map((val: number, idx: number) => ({
    episode: (idx + 1) * Math.max(1, Math.floor(episodes / 20)),
    reward: Number(val.toFixed(2)),
  }));

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-purple-400">
            <Brain className="h-4 w-4" /> Policy Optimization & Markov Decision Process
          </div>
          <h2 className="text-xl font-bold text-white">Reinforcement Learning (Q-Learning) Agent</h2>
        </div>

        <button
          onClick={trainAgent}
          disabled={loading}
          className="flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-500/20 hover:from-purple-400 hover:to-indigo-500"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          {loading ? "Training RL Policy..." : "Re-Train RL Agent Policy"}
        </button>
      </div>

      {isBudgetTooLow && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <span className="font-semibold text-amber-300">Insufficient Budget for Available Security Controls: </span>
            The current allocated budget ({formatMoney(budget)}) is below the lowest remediation fix cost ({formatMoney(minFixCost)}).
            <span className="block mt-0.5 text-slate-300">Increase the capital budget slider above (e.g. to ₹50 Lakhs or ₹1 Crore) to enable the RL Agent to allocate funds.</span>
          </div>
        </div>
      )}

      {/* Hyperparameter Controls */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
          <div className="mb-1 flex justify-between text-xs text-slate-300">
            <span>Training Episodes</span>
            <span className="font-semibold text-purple-400">{episodes}</span>
          </div>
          <input
            type="range"
            min={100}
            max={1000}
            step={50}
            value={episodes}
            onChange={(e) => setEpisodes(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-purple-400"
          />
          <div className="mt-1 text-[10px] text-slate-400">Number of portfolio environment rollouts</div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
          <div className="mb-1 flex justify-between text-xs text-slate-300">
            <span>Learning Rate (α)</span>
            <span className="font-semibold text-indigo-400">{alpha.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.01}
            max={0.5}
            step={0.01}
            value={alpha}
            onChange={(e) => setAlpha(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-indigo-400"
          />
          <div className="mt-1 text-[10px] text-slate-400">Q-value Bellman update step weight</div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
          <div className="mb-1 flex justify-between text-xs text-slate-300">
            <span>Discount Factor (γ)</span>
            <span className="font-semibold text-cyan-400">{gamma.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={0.99}
            step={0.01}
            value={gamma}
            onChange={(e) => setGamma(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer accent-cyan-400"
          />
          <div className="mt-1 text-[10px] text-slate-400">Future reward temporal discount</div>
        </div>
      </div>

      {/* RL Results Metrics */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
          <div className="text-xs text-purple-300">Mean Policy Reward</div>
          <div className="text-2xl font-bold text-purple-200">{(rlData?.total_reward ?? 0).toFixed(2)}</div>
          <div className="mt-1 text-xs text-purple-300/80">Converged Q-value sum</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-xs text-slate-400">Allocated Spend</div>
          <div className="text-2xl font-bold text-white">{formatMoney(rlData?.allocated_spend_inr ?? 0)}</div>
          <div className="mt-1 text-xs text-slate-400">Under {formatMoney(budget)} budget</div>
        </div>

        <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4">
          <div className="text-xs text-violet-300">RL Residual EAL</div>
          <div className="text-2xl font-bold text-violet-100">{formatMoney(rlData?.residual_eal_inr ?? 0)}</div>
          <div className="mt-1 text-xs text-violet-300/80">Modeled residual risk</div>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="text-xs text-emerald-300">Learned Policy ROSI</div>
          <div className="text-2xl font-bold text-emerald-100">{(rlData?.rosi_percentage ?? 0).toFixed(1)}%</div>
          <div className="mt-1 text-xs text-emerald-300/80">Return on security investment</div>
        </div>
      </div>

      {/* Reward Convergence Chart */}
      <div className="mb-6 rounded-xl border border-slate-700 bg-slate-950/60 p-4">
        <div className="mb-3 flex items-center justify-between text-xs font-medium text-slate-300">
          <span>Q-Learning Episode Reward Convergence Curve</span>
          <span className="flex items-center gap-1 text-purple-400"><Cpu className="h-3.5 w-3.5" /> Policy Learning Trajectory</span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rewardGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
              <XAxis dataKey="episode" label={{ value: "Episode", fill: "#94a3b8", fontSize: 10, position: "insideBottom", offset: -2 }} tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Tooltip formatter={(v) => [`${v}`, "Reward"]} labelFormatter={(l) => `Episode ${l}`} />
              <Area type="monotone" dataKey="reward" stroke="#a855f7" fill="url(#rewardGrad)" strokeWidth={2} name="Reward" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Selected Remediation Actions under RL Policy */}
      <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
        <div className="mb-3 text-sm font-semibold text-white">Remediation Policy Selected by RL Agent</div>
        <div className="space-y-2">
          {(rlData?.selected_remediations ?? []).map((item: any) => (
            <div key={item.cve_id} className={`flex items-center justify-between rounded-lg border p-3 text-xs ${item.funded ? "border-emerald-500/30 bg-emerald-500/5" : "border-slate-800 bg-slate-900/40"}`}>
              <div>
                <span className="font-semibold text-white">{item.asset_name}</span>
                <span className="ml-2 font-mono text-cyan-400">({item.cve_id})</span>
                <p className="mt-0.5 text-slate-400 text-[11px]">{item.remediation_fix}</p>
              </div>
              <div className="text-right">
                <div className="font-semibold text-slate-200">{formatMoney(item.fix_cost_inr)}</div>
                <span className={`inline-block rounded px-2 py-0.5 mt-1 text-[10px] font-bold ${item.funded ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-500"}`}>
                  {item.funded ? "RL Funded" : "Unscheduled"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
