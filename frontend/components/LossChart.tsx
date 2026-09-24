import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight } from "lucide-react";

type Props = {
  chartData: Array<{ x: number; current: number; residual: number }>;
};

export function LossChart({ chartData }: Props) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
      <div className="mb-3 flex items-center justify-between text-sm text-slate-300"><span>Loss Exceedance Curve</span><span className="inline-flex items-center gap-1 text-cyan-300"><ArrowRight className="h-3 w-3" /> current vs residual</span></div>
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="currentRisk" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.7} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.08} />
              </linearGradient>
              <linearGradient id="residualRisk" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.7} />
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.08} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis dataKey="x" tickFormatter={(value) => `₹${Number(value / 1000000).toFixed(1)}M`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 1]} tickFormatter={(value) => `${value}`} />
            <Tooltip formatter={(value) => `${Number(value).toFixed(2)}`} labelFormatter={(label) => `Loss: ₹${Number(label).toLocaleString('en-IN')}`} />
            <Area type="monotone" dataKey="current" stroke="#22d3ee" fill="url(#currentRisk)" strokeWidth={2} name="Current Risk Profile" />
            <Area type="monotone" dataKey="residual" stroke="#a78bfa" fill="url(#residualRisk)" strokeWidth={2} name="Residual Risk with Selected Budget" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
