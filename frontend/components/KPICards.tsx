import { BadgeAlert, ChartNoAxesCombined, CircleDollarSign, Gauge, ShieldAlert } from "lucide-react";

type Props = {
  currentEal: number;
  primaryEal?: number;
  secondaryEal?: number;
  currentVar: number;
  residualEal: number;
  riskEliminated: number;
  rosi: number;
  formatMoney: (value: number) => string;
};

export function KPICards({ currentEal, primaryEal, secondaryEal, currentVar, residualEal, riskEliminated, rosi, formatMoney }: Props) {
  const priVal = primaryEal ?? currentEal * 0.6;
  const secVal = secondaryEal ?? currentEal * 0.4;

  return (
    <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-cyan-500/10 to-slate-900 p-5">
        <div className="mb-2 flex items-center justify-between text-sm text-slate-400">
          <span>Current Financial Exposure</span>
          <Gauge className="h-4 w-4 text-cyan-300" />
        </div>
        <div className="text-3xl font-bold text-white">{formatMoney(currentEal)}</div>
        <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
          <span className="rounded bg-cyan-500/10 px-2 py-0.5 font-medium text-cyan-300 ring-1 ring-cyan-500/20">
            Primary Op Downtime: {formatMoney(priVal)}
          </span>
          <span className="rounded bg-violet-500/10 px-2 py-0.5 font-medium text-violet-300 ring-1 ring-violet-500/20">
            Secondary Reg Fines: {formatMoney(secVal)}
          </span>
        </div>
      </div>
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
        <div className="mb-3 flex items-center justify-between text-sm text-red-200">
          <span>95% VaR (Worst-Case)</span>
          <BadgeAlert className="h-4 w-4 text-red-300" />
        </div>
        <div className="text-3xl font-bold text-red-200">{formatMoney(currentVar)}</div>
        <div className="mt-2 text-xs text-red-200/80">95th percentile loss threshold</div>
      </div>
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
        <div className="mb-3 flex items-center justify-between text-sm text-violet-200">
          <span>Optimized Residual Risk</span>
          <ChartNoAxesCombined className="h-4 w-4 text-violet-300" />
        </div>
        <div className="text-3xl font-bold text-violet-100">{formatMoney(residualEal)}</div>
        <div className="mt-2 inline-flex rounded-full bg-violet-500/10 px-2 py-1 text-xs text-violet-200">
          {riskEliminated.toFixed(1)}% risk eliminated
        </div>
      </div>
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="mb-3 flex items-center justify-between text-sm text-emerald-200">
          <span>Calculated ROSI</span>
          <CircleDollarSign className="h-4 w-4 text-emerald-300" />
        </div>
        <div className="text-3xl font-bold text-emerald-100">{rosi.toFixed(1)}%</div>
        <div className="mt-2 text-xs text-emerald-200/80">Return on security investment</div>
      </div>
    </section>
  );
}

