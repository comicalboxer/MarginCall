type Remediation = {
  asset_name: string;
  cve_id: string;
  threat_source: string;
  remediation_fix: string;
  fix_cost_inr: number;
  delta_eal_inr: number;
  efficiency_ratio: number;
  funded: boolean;
};

type Props = {
  items: Remediation[];
  formatMoney: (value: number) => string;
};

export function RemediationTable({ items, formatMoney }: Props) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-300">Prescribed remediation action table</div>
          <h3 className="text-xl font-semibold text-white">Funding priorities</h3>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-300">
            <tr className="border-b border-slate-700">
              <th className="pb-3 pr-4 font-medium">Select</th>
              <th className="pb-3 pr-4 font-medium">Asset</th>
              <th className="pb-3 pr-4 font-medium">CVE ID</th>
              <th className="pb-3 pr-4 font-medium">Threat Source</th>
              <th className="pb-3 pr-4 font-medium">Fix</th>
              <th className="pb-3 pr-4 font-medium">Fix Cost</th>
              <th className="pb-3 pr-4 font-medium">ΔEAL</th>
              <th className="pb-3 pr-4 font-medium">Efficiency</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.asset_name}-${item.cve_id}`} className={`border-b border-slate-800 ${item.funded ? "bg-emerald-500/5" : "bg-slate-950/40"}`}>
                <td className="py-3 pr-4"><input type="checkbox" checked={item.funded} readOnly className="h-4 w-4 accent-cyan-500" /></td>
                <td className="py-3 pr-4 font-medium text-white">{item.asset_name}</td>
                <td className="py-3 pr-4 text-cyan-300">{item.cve_id}</td>
                <td className="py-3 pr-4 text-slate-300">{item.threat_source}</td>
                <td className="py-3 pr-4 text-slate-300">{item.remediation_fix}</td>
                <td className="py-3 pr-4 text-slate-100">{formatMoney(item.fix_cost_inr)}</td>
                <td className="py-3 pr-4 text-emerald-300">{formatMoney(item.delta_eal_inr)}</td>
                <td className="py-3 pr-4 text-violet-300">{item.efficiency_ratio.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
