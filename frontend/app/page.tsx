"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Brain, BriefcaseBusiness, Building2, Calendar, FileDown, Layers, ShieldCheck, Sliders, Store, UploadCloud } from "lucide-react";
import { BudgetPresetBar } from "@/components/BudgetSlider";
import { CopilotDrawer } from "@/components/CopilotDrawer";
import { KPICards } from "@/components/KPICards";
import { LossChart } from "@/components/LossChart";
import { PhasedRoadmap } from "@/components/PhasedRoadmap";
import { RemediationTable } from "@/components/RemediationTable";
import { RLAgentPanel } from "@/components/RLAgentPanel";
import { ScannerUploadModal } from "@/components/ScannerUploadModal";
import { WhatIfSandbox } from "@/components/WhatIfSandbox";

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

type AssetScenario = {
  asset_name: string;
  cve_id: string;
  threat_source: string;
  epss: number;
  control_strength: number;
  exposure_multiplier: number;
  base_frequency: number;
  records: number;
  downtime_hours: number;
  remediation_cost_inr: number;
  remediation_fix: string;
  asset_tier?: string;
  business_impact?: string;
  asset_type?: string;
  slef?: number;
};

type QuantifyResponse = {
  total_eal_inr: number;
  primary_eal_inr?: number;
  secondary_eal_inr?: number;
  total_var_95_inr: number;
  asset_breakdowns: Array<{ asset_name: string; cve_id: string; threat_source: string; eal_inr: number; var_95_inr: number; remediation_cost_inr: number; risk_reduction_potential_inr: number; efficiency_ratio: number }>; 
  loss_exceedance_curve: Array<{ probability: number; loss_inr: number }>;
};

type OptimizationResponse = {
  allocated_spend_inr: number;
  residual_eal_inr: number;
  primary_eal_inr?: number;
  secondary_eal_inr?: number;
  residual_var_95_inr: number;
  rosi_percentage: number;
  selected_remediations: Array<{ asset_name: string; cve_id: string; threat_source: string; remediation_fix: string; fix_cost_inr: number; delta_eal_inr: number; efficiency_ratio: number; funded: boolean }>; 
  post_remediation_lec: Array<{ probability: number; loss_inr: number }>;
};

const seedAssetsLarge: AssetScenario[] = [
  { asset_name: "Core Banking Switch", cve_id: "CVE-2024-21432", threat_source: "Internet-facing transaction layer / hostile intrusion", epss: 0.92, control_strength: 0.38, exposure_multiplier: 1.8, base_frequency: 12, records: 250000, downtime_hours: 40, remediation_cost_inr: 8500000, remediation_fix: "Deploy FIPS-validated patch, isolate service mesh, and enforce privileged access manager.", asset_tier: "Tier 1", asset_type: "Critical Infrastructure", business_impact: "Direct transaction failure and systemic settlement disruption.", slef: 0.45 },
  { asset_name: "Payment Gateway API", cve_id: "CVE-2024-32578", threat_source: "External API abuse / fraud automation", epss: 0.88, control_strength: 0.42, exposure_multiplier: 1.6, base_frequency: 12, records: 180000, downtime_hours: 28, remediation_cost_inr: 6200000, remediation_fix: "Rotate API gateway keys, deploy WAF rule set, and enforce signed request validation.", asset_tier: "Tier 1", asset_type: "External API", business_impact: "Payment authorization failure and merchant service downtime.", slef: 0.40 },
  { asset_name: "Employee Active Directory", cve_id: "CVE-2024-28986", threat_source: "Credential theft / privilege escalation", epss: 0.79, control_strength: 0.52, exposure_multiplier: 1.4, base_frequency: 10, records: 95000, downtime_hours: 36, remediation_cost_inr: 4700000, remediation_fix: "Patch directory services, remove privilege escalation pathways, and enforce MFA for all admins.", asset_tier: "Tier 2", asset_type: "Identity Provider", business_impact: "Credential abuse, lateral movement, and privilege escalation.", slef: 0.30 },
  { asset_name: "Customer Portal", cve_id: "CVE-2024-27894", threat_source: "User-facing web exploitation", epss: 0.81, control_strength: 0.46, exposure_multiplier: 1.5, base_frequency: 10, records: 340000, downtime_hours: 18, remediation_cost_inr: 3300000, remediation_fix: "Upgrade frontend and backend dependencies, enforce CSRF protections, and deploy session hardening.", asset_tier: "Tier 2", asset_type: "Consumer Web App", business_impact: "Account takeover, privacy leakage, and reputational loss.", slef: 0.35 },
  { asset_name: "CI/CD Pipeline", cve_id: "CVE-2024-20199", threat_source: "Supply chain tampering / build runner compromise", epss: 0.72, control_strength: 0.57, exposure_multiplier: 1.3, base_frequency: 8, records: 120000, downtime_hours: 22, remediation_cost_inr: 2900000, remediation_fix: "Harden runner isolation, rotate secrets, and require signed build provenance.", asset_tier: "Tier 1", asset_type: "Development Automation", business_impact: "Malicious code injection and supply-chain compromise.", slef: 0.25 },
];

const seedAssetsSMB: AssetScenario[] = [
  { asset_name: "Cloud E-Commerce Store", cve_id: "CVE-2024-10821", threat_source: "Plugin vulnerability / SQL injection", epss: 0.78, control_strength: 0.45, exposure_multiplier: 1.2, base_frequency: 8, records: 15000, downtime_hours: 6, remediation_cost_inr: 150000, remediation_fix: "Upgrade plugin dependencies, enforce Cloudflare WAF, and rotate admin credentials.", asset_tier: "Tier 1", asset_type: "Web Storefront", business_impact: "Checkout outage, lost sales revenue, and customer data exposure.", slef: 0.25 },
  { asset_name: "Payroll & HR Portal", cve_id: "CVE-2024-21901", threat_source: "Authentication bypass / local privilege escalation", epss: 0.65, control_strength: 0.50, exposure_multiplier: 1.1, base_frequency: 6, records: 5000, downtime_hours: 12, remediation_cost_inr: 80000, remediation_fix: "Apply vendor security patch, restrict portal to local VPN subnet, and enforce MFA.", asset_tier: "Tier 2", asset_type: "Internal Application", business_impact: "Delayed salary disbursement and employee PII exposure.", slef: 0.20 },
  { asset_name: "Office VPN Gateway", cve_id: "CVE-2024-24919", threat_source: "Unauthenticated path traversal / password spray", epss: 0.85, control_strength: 0.40, exposure_multiplier: 1.4, base_frequency: 10, records: 2000, downtime_hours: 8, remediation_cost_inr: 60000, remediation_fix: "Update VPN firmware immediately and enforce SAML 2.0 multi-factor authentication.", asset_tier: "Tier 1", asset_type: "Network Infrastructure", business_impact: "Unauthorized network intrusion and remote work disruption.", slef: 0.30 },
  { asset_name: "Company Marketing Site", cve_id: "CVE-2024-27956", threat_source: "CMS core vulnerability / defacement bot", epss: 0.58, control_strength: 0.55, exposure_multiplier: 1.0, base_frequency: 5, records: 25000, downtime_hours: 4, remediation_cost_inr: 40000, remediation_fix: "Update CMS core files, delete unused admin accounts, and set up daily automated backups.", asset_tier: "Tier 2", asset_type: "Web Content Site", business_impact: "Website defacement, temporary brand disruption, and SEO penalty.", slef: 0.15 },
  { asset_name: "Code Repository Runner", cve_id: "CVE-2024-3094", threat_source: "Malicious dependency injection", epss: 0.62, control_strength: 0.60, exposure_multiplier: 1.1, base_frequency: 6, records: 3000, downtime_hours: 6, remediation_cost_inr: 50000, remediation_fix: "Rotate SSH deployment keys, restrict developer permissions, and enable branch protection rules.", asset_tier: "Tier 2", asset_type: "DevOps Automation", business_impact: "Software build disruption and source code exposure.", slef: 0.15 },
];

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

function formatCurrencyShort(value: number, currency: "inr" | "usd") {
  if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
    return currency === "usd" ? "$0" : "₹0";
  }
  if (currency === "usd") {
    const usd = value / 83.5;
    if (usd >= 1000000) return `$${(usd / 1000000).toFixed(2)}M`;
    if (usd >= 1000) return `$${(usd / 1000).toFixed(2)}K`;
    return `$${usd.toFixed(0)}`;
  }
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
  return `₹${formatInr(value)}`;
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
    } catch (err) {
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, 600));
    }
  }
  return fetch(url, options);
}

export default function Home() {
  const [budget, setBudget] = useState<number>(2000000);
  const [iterations, setIterations] = useState<number>(10000);
  const [currency, setCurrency] = useState<"inr" | "usd">("inr");
  const [scale, setScale] = useState<"large" | "smb">("large");
  const [activeTab, setActiveTab] = useState<"optimizer" | "whatif" | "roadmap" | "rl">("optimizer");
  const [activeAssets, setActiveAssets] = useState<AssetScenario[]>(seedAssetsLarge);
  const [quantify, setQuantify] = useState<QuantifyResponse | null>(null);
  const [optimize, setOptimize] = useState<OptimizationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(true);
  const [copilotResponse, setCopilotResponse] = useState<{ reply: string; citations: Array<{ framework: string; clause: string; status: string }> } | null>(null);

  const handleScaleChange = async (newScale: "large" | "smb") => {
    setScale(newScale);
    const newBudget = newScale === "smb" ? 200000 : 2000000;
    setBudget(newBudget);
    const targetLocalSeeds = newScale === "smb" ? seedAssetsSMB : seedAssetsLarge;
    setActiveAssets(targetLocalSeeds);
    setLoading(true);
    try {
      const resp = await fetchWithRetry(`${apiBase}/api/v1/assets/seed?scale=${newScale}`, { method: "GET" });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) {
          setActiveAssets(data);
        }
      }
    } catch (err) {
      console.error("Scale asset fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const runQuantify = async () => {
      setLoading(true);
      try {
        const resp = await fetchWithRetry(`${apiBase}/api/v1/quantify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assets: activeAssets, iterations }),
        });
        const data = await resp.json();
        setQuantify(data);

        const optimizeResp = await fetchWithRetry(`${apiBase}/api/v1/optimize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ budget_inr: budget, assets: activeAssets }),
        });
        const optimizeData = await optimizeResp.json();
        setOptimize(optimizeData);
      } catch (error) {
        console.error("Quantify/Optimize fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    runQuantify();
  }, [budget, iterations, activeAssets]);

  useEffect(() => {
    const runCopilot = async () => {
      try {
        const resp = await fetchWithRetry(`${apiBase}/api/v1/copilot/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: "Summarize our cyber risk exposure for the upcoming Board Meeting.", context_state: { budget_inr: budget, current_eal_inr: quantify?.total_eal_inr ?? 0, residual_eal_inr: optimize?.residual_eal_inr ?? 0, selected_remediations: optimize?.selected_remediations ?? [] } }),
        });
        const data = await resp.json();
        setCopilotResponse(data);
      } catch (err) {
        console.error("Copilot fetch error:", err);
      }
    };
    if (quantify || optimize) {
      runCopilot();
    }
  }, [budget, iterations, quantify, optimize]);

  const chartData = useMemo(() => {
    const current = quantify?.loss_exceedance_curve ?? [];
    const residual = optimize?.post_remediation_lec ?? [];
    const maxLength = Math.max(current.length, residual.length);
    return Array.from({ length: maxLength }, (_, idx) => {
      const a = current[idx] ?? { probability: 0, loss_inr: 0 };
      const b = residual[idx] ?? { probability: 0, loss_inr: 0 };
      return { x: a.loss_inr, current: a.probability, residual: b.probability };
    });
  }, [quantify, optimize]);

  const currentEal = quantify?.total_eal_inr ?? 0;
  const primaryEal = quantify?.primary_eal_inr ?? currentEal * 0.6;
  const secondaryEal = quantify?.secondary_eal_inr ?? currentEal * 0.4;
  const currentVar = quantify?.total_var_95_inr ?? 0;
  const residualEal = optimize?.residual_eal_inr ?? currentEal;
  const riskEliminated = currentEal > 0 ? ((currentEal - residualEal) / currentEal) * 100 : 0;

  const formatMoney = (value: number) => {
    if (currency === "usd") {
      const usd = value / 83.5;
      if (usd >= 1000000) return `$${(usd / 1000000).toFixed(2)}M`;
      if (usd >= 1000) return `$${(usd / 1000).toFixed(2)}K`;
      return `$${usd.toFixed(0)}`;
    }
    return formatCurrencyShort(value, "inr");
  };

  const handleCopilotPrompt = async (prompt: string) => {
    try {
      const resp = await fetchWithRetry(`${apiBase}/api/v1/copilot/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: prompt, context_state: { budget_inr: budget, current_eal_inr: quantify?.total_eal_inr ?? 0, residual_eal_inr: optimize?.residual_eal_inr ?? 0, selected_remediations: optimize?.selected_remediations ?? [] } }),
      });
      const data = await resp.json();
      setCopilotResponse(data);
    } catch (err) {
      console.error("Copilot prompt error:", err);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const resp = await fetchWithRetry(`${apiBase}/api/v1/export-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget_inr: budget, assets: activeAssets }),
      });
      if (!resp.ok) throw new Error("PDF export failed");
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "DefendFAIR_Executive_Board_Report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-cyan-500/10 p-2 text-cyan-400 ring-1 ring-cyan-500/20"><ShieldCheck className="h-6 w-6" /></div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">DefendFAIR</div>
                <h1 className="text-2xl font-bold text-white">CRQ & Capital Allocator</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
              {/* Enterprise Scale Toggle */}
              <div className="flex rounded-full border border-slate-700 bg-slate-950 p-0.5 text-xs">
                <button
                  onClick={() => handleScaleChange("large")}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-all ${
                    scale === "large" ? "bg-cyan-500 text-slate-950 font-semibold shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" /> Large Enterprise
                </button>
                <button
                  onClick={() => handleScaleChange("smb")}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-all ${
                    scale === "smb" ? "bg-cyan-500 text-slate-950 font-semibold shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Store className="h-3.5 w-3.5" /> SMB / Mid-Market
                </button>
              </div>

              <button
                onClick={() => setUploadModalOpen(true)}
                className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-sm font-medium text-cyan-300 hover:bg-cyan-500/20"
              >
                <UploadCloud className="h-4 w-4" /> Upload Scan
              </button>
              <button
                onClick={handleExportPdf}
                disabled={exportingPdf}
                className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 hover:border-cyan-500 hover:bg-slate-700"
              >
                <FileDown className="h-4 w-4" /> {exportingPdf ? "Generating PDF..." : "Export Board PDF"}
              </button>
              <button onClick={() => setCurrency("inr")} className={`rounded-full border px-3 py-1.5 text-sm ${currency === "inr" ? "border-slate-700 bg-slate-800 text-slate-200" : "border-slate-700 bg-slate-900 text-slate-400"}`}>₹ Lakhs / Crores</button>
              <button onClick={() => setCurrency("usd")} className={`rounded-full border px-3 py-1.5 text-sm ${currency === "usd" ? "border-slate-700 bg-slate-800 text-slate-200" : "border-slate-700 bg-slate-900 text-slate-400"}`}>$ USD</button>
              <button onClick={() => setCopilotOpen((v) => !v)} className="flex items-center gap-2 rounded-full bg-cyan-500 px-3 py-1.5 text-sm font-medium text-slate-950"><Bot className="h-4 w-4" /> Board Copilot</button>
            </div>
          </div>
        </header>

        <KPICards currentEal={currentEal} primaryEal={primaryEal} secondaryEal={secondaryEal} currentVar={currentVar} residualEal={residualEal} riskEliminated={riskEliminated} rosi={optimize?.rosi_percentage ?? 0} formatMoney={formatMoney} />

        {/* Tab Navigation */}
        <div className="mb-6 flex border-b border-slate-800 text-sm font-medium text-slate-400">
          <button
            onClick={() => setActiveTab("optimizer")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
              activeTab === "optimizer" ? "border-cyan-400 text-white font-semibold" : "border-transparent hover:text-slate-200"
            }`}
          >
            <Layers className="h-4 w-4 text-cyan-400" /> Live Capital Optimizer
          </button>
          <button
            onClick={() => setActiveTab("whatif")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
              activeTab === "whatif" ? "border-amber-400 text-white font-semibold" : "border-transparent hover:text-slate-200"
            }`}
          >
            <Sliders className="h-4 w-4 text-amber-400" /> What-If Scenario Sandbox
          </button>
          <button
            onClick={() => setActiveTab("roadmap")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
              activeTab === "roadmap" ? "border-emerald-400 text-white font-semibold" : "border-transparent hover:text-slate-200"
            }`}
          >
            <Calendar className="h-4 w-4 text-emerald-400" /> Q1–Q4 Phased Roadmap
          </button>
          <button
            onClick={() => setActiveTab("rl")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition-colors ${
              activeTab === "rl" ? "border-purple-400 text-white font-semibold" : "border-transparent hover:text-slate-200"
            }`}
          >
            <Brain className="h-4 w-4 text-purple-400" /> RL Policy Agent
          </button>
        </div>

        {activeTab === "optimizer" && (
          <>
            <section className="mb-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <BudgetPresetBar budget={budget} onBudgetChange={setBudget} formatMoney={formatMoney} scale={scale} />
                <LossChart chartData={chartData} />
              </div>

              <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Simulation config</h3>
                  <BriefcaseBusiness className="h-5 w-5 text-cyan-300" />
                </div>
                <div className="space-y-4">
                  <label className="block text-sm text-slate-300">
                    Iterations
                    <input type="range" min={1000} max={50000} step={1000} value={iterations} onChange={(e) => setIterations(Number(e.target.value))} className="mt-2 h-2 w-full accent-cyan-500" />
                    <div className="mt-2 text-right text-cyan-300 font-medium">{iterations.toLocaleString()}</div>
                  </label>
                  <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-300">
                    <div className="mb-2 flex justify-between"><span>Allocated spend</span><span className="font-medium text-white">{formatMoney(optimize?.allocated_spend_inr ?? 0)}</span></div>
                    <div className="mb-2 flex justify-between"><span>Residual EAL</span><span className="font-medium text-white">{formatMoney(optimize?.residual_eal_inr ?? currentEal)}</span></div>
                    <div className="mb-2 flex justify-between"><span>Residual VaR</span><span className="font-medium text-white">{formatMoney(optimize?.residual_var_95_inr ?? currentVar)}</span></div>
                    <div className="flex justify-between"><span>ROSI</span><span className="font-medium text-emerald-300">{(optimize?.rosi_percentage ?? 0).toFixed(1)}%</span></div>
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
                    <div className="mb-2 text-sm text-slate-300">Top priorities</div>
                    {(optimize?.selected_remediations ?? []).slice(0, 3).map((item) => (
                      <div key={item.cve_id} className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-400">
                        <span>{item.asset_name}</span>
                        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-300">{item.funded ? "Funded" : "Backlog"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </section>

            <RemediationTable items={optimize?.selected_remediations ?? []} formatMoney={formatMoney} />
          </>
        )}

        {activeTab === "whatif" && (
          <WhatIfSandbox
            baselineAssets={activeAssets}
            baselineEal={currentEal}
            baselineVar={currentVar}
            formatMoney={formatMoney}
          />
        )}

        {activeTab === "roadmap" && (
          <PhasedRoadmap
            apiBase={apiBase}
            seedAssets={activeAssets}
            formatMoney={formatMoney}
          />
        )}

        {activeTab === "rl" && (
          <RLAgentPanel
            apiBase={apiBase}
            seedAssets={activeAssets}
            budget={budget}
            formatMoney={formatMoney}
          />
        )}

        <CopilotDrawer open={copilotOpen} onClose={() => setCopilotOpen(false)} copilotResponse={copilotResponse} onPresetClick={handleCopilotPrompt} />

        <ScannerUploadModal
          open={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          apiBase={apiBase}
          onScanUploaded={(enrichedRecords) => {
            setActiveAssets(enrichedRecords);
          }}
        />
      </div>
      {loading && <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-[1px]" />}
    </main>
  );
}
