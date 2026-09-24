import { SlidersHorizontal } from "lucide-react";

type Props = {
  budget: number;
  onBudgetChange: (value: number) => void;
  formatMoney: (value: number) => string;
  scale?: "large" | "smb";
};

export function BudgetSlider({ budget, onBudgetChange, formatMoney, scale = "large" }: Props) {
  const isSmb = scale === "smb";
  const minVal = isSmb ? 10000 : 100000;
  const maxVal = isSmb ? 2000000 : 100000000;
  const stepVal = isSmb ? 10000 : 100000;

  return (
    <div className="mb-6 rounded-xl border border-slate-700 bg-slate-950/60 p-4">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-slate-300">Budget allocation</span>
        <span className="font-semibold text-cyan-300">{formatMoney(budget)}</span>
      </div>
      <input
        type="range"
        min={minVal}
        max={maxVal}
        step={stepVal}
        value={budget}
        onChange={(e) => onBudgetChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-cyan-500"
      />
      <div className="mt-3 flex justify-between text-[11px] text-slate-400">
        {isSmb ? (
          <>
            <span>₹10k</span><span>₹1L</span><span>₹5L</span><span>₹10L</span><span>₹20L</span>
          </>
        ) : (
          <>
            <span>₹10L</span><span>₹50L</span><span>₹1 Cr</span><span>₹5 Cr</span><span>₹10 Cr</span>
          </>
        )}
      </div>
    </div>
  );
}

export function BudgetPresetBar({ budget, onBudgetChange, formatMoney, scale = "large" }: Props) {
  const presets = scale === "smb" 
    ? [50000, 100000, 200000, 500000, 1000000]
    : [2000000, 5000000, 10000000, 20000000, 50000000];

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-slate-300">Real-time Optimization</div>
          <h2 className="text-xl font-semibold text-white">Risk reduction plan</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400"><SlidersHorizontal className="h-4 w-4" /> Budget</div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset}
            onClick={() => onBudgetChange(preset)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              budget === preset
                ? "border-cyan-400 bg-cyan-500/20 text-cyan-300 font-semibold"
                : "border-slate-700 bg-slate-800 text-slate-200 hover:border-cyan-500 hover:text-cyan-300"
            }`}
          >
            {formatMoney(preset)}
          </button>
        ))}
      </div>
      <BudgetSlider budget={budget} onBudgetChange={onBudgetChange} formatMoney={formatMoney} scale={scale} />
    </>
  );
}
