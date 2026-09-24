from __future__ import annotations

from typing import Dict, List, Tuple

import numpy as np


def beta_pert(a: float, m: float, b: float, rng: np.random.Generator) -> float:
    if b <= a or m <= a or b <= m:
        # Fallback to simple mean if parameters are non-monotonic
        return float(m)
    alpha = 1 + 4 * ((m - a) / (b - a))
    beta_param = 1 + 4 * ((b - m) / (b - a))
    return float(rng.beta(alpha, beta_param) * (b - a) + a)


def simulate_scenario(asset: Dict, iterations: int = 10000) -> Dict[str, float | np.ndarray | int]:
    seed = int(abs(hash(f"{asset.get('asset_name', 'asset')}-{asset.get('cve_id', 'cve')}") % 2147483647))
    rng = np.random.default_rng(seed)

    base_lambda = float(asset.get("base_frequency", 12.0)) * float(asset.get("epss", 0.0)) * float(asset.get("exposure_multiplier", 1.0))
    tef = rng.poisson(lam=base_lambda, size=iterations)

    exploit_prob = float(asset.get("epss", 0.0)) * (1.0 - float(asset.get("control_strength", 0.0)))
    exploit_mask = rng.binomial(1, exploit_prob, size=iterations).astype(bool)

    records = float(asset.get("records", 1000))
    downtime_hours = float(asset.get("downtime_hours", 12))
    slef = float(asset.get("slef", 0.35))

    # Scale per-record and per-hour unit loss based on enterprise magnitude
    # For SMB assets (records < 30,000 or fix cost < ₹5 Lakhs), use calibrated SMB unit economics
    is_smb = records < 30000 or float(asset.get("remediation_cost_inr", 1000000)) < 500000

    cost_per_record_pri = 45.0 if is_smb else 250.0
    cost_per_record_sec = 30.0 if is_smb else 200.0

    cost_per_hour_pri = 12000.0 if is_smb else 120000.0
    cost_per_hour_sec = 8000.0 if is_smb else 80000.0

    # Primary Loss (Operational Recovery & Direct Incident Response)
    a_pri = 0.4 * (records * (cost_per_record_pri * 0.5) + downtime_hours * (cost_per_hour_pri * 0.35))
    m_pri = 0.8 * (records * cost_per_record_pri + downtime_hours * cost_per_hour_pri)
    b_pri = 2.0 * (records * (cost_per_record_pri * 2.4) + downtime_hours * (cost_per_hour_pri * 2.8))

    # Secondary Loss (Statutory Penalties, Litigation, Reputation, Notification)
    a_sec = 0.3 * (records * (cost_per_record_sec * 0.4) + downtime_hours * (cost_per_hour_sec * 0.35))
    m_sec = 1.0 * (records * cost_per_record_sec + downtime_hours * cost_per_hour_sec)
    b_sec = 3.5 * (records * (cost_per_record_sec * 3.5) + downtime_hours * (cost_per_hour_sec * 5.0))

    primary_annual_losses = np.zeros(iterations, dtype=float)
    secondary_annual_losses = np.zeros(iterations, dtype=float)

    for idx in range(iterations):
        event_count = int(tef[idx])
        if event_count <= 0 or not exploit_mask[idx]:
            continue

        pri_sum = 0.0
        sec_sum = 0.0
        for _ in range(event_count):
            pri_sum += beta_pert(a_pri, m_pri, b_pri, rng)
            # Secondary loss is conditioned on SLEF occurrence
            if rng.random() < slef:
                sec_sum += beta_pert(a_sec, m_sec, b_sec, rng)

        primary_annual_losses[idx] = pri_sum
        secondary_annual_losses[idx] = sec_sum

    annual_losses = primary_annual_losses + secondary_annual_losses

    eal = float(np.mean(annual_losses))
    primary_eal = float(np.mean(primary_annual_losses))
    secondary_eal = float(np.mean(secondary_annual_losses))
    var_95 = float(np.percentile(annual_losses, 95))

    return {
        "lambda": base_lambda,
        "exploit_prob": exploit_prob,
        "primary_annual_losses": primary_annual_losses,
        "secondary_annual_losses": secondary_annual_losses,
        "annual_losses": annual_losses,
        "eal": eal,
        "primary_eal": primary_eal,
        "secondary_eal": secondary_eal,
        "var_95": var_95,
        "tef": tef,
        "exploit_mask": exploit_mask,
    }


def loss_exceedance_curve(loss_values: np.ndarray, points: int = 100) -> List[Dict[str, float]]:
    ordered = np.sort(np.asarray(loss_values, dtype=float))
    if ordered.size == 0:
        return [{"probability": round(float(idx) / max(points - 1, 1), 6), "loss_inr": 0.0} for idx in range(points)]

    max_loss = float(np.percentile(ordered, 99.9)) if ordered.size > 0 else 0.0
    if max_loss <= 0:
        return [{"probability": round(float(idx) / max(points - 1, 1), 6), "loss_inr": 0.0} for idx in range(points)]

    thresholds = np.linspace(0.0, max_loss, points)
    curve = []
    for threshold in thresholds:
        exceedance = float(np.mean(ordered >= threshold))
        curve.append({"probability": round(exceedance, 6), "loss_inr": round(float(threshold), 2)})
    return curve


def quantify_assets(assets: List[Dict], iterations: int = 10000) -> Tuple[float, float, float, float, List[Dict], List[Dict]]:
    portfolio_losses = np.zeros(iterations, dtype=float)
    primary_losses = np.zeros(iterations, dtype=float)
    secondary_losses = np.zeros(iterations, dtype=float)
    breakdown = []

    for asset in assets:
        sim = simulate_scenario(asset, iterations=iterations)
        portfolio_losses += sim["annual_losses"]
        primary_losses += sim["primary_annual_losses"]
        secondary_losses += sim["secondary_annual_losses"]

        breakdown.append(
            {
                "asset_name": asset["asset_name"],
                "cve_id": asset["cve_id"],
                "threat_source": asset["threat_source"],
                "eal_inr": float(sim["eal"]),
                "primary_eal_inr": float(sim["primary_eal"]),
                "secondary_eal_inr": float(sim["secondary_eal"]),
                "var_95_inr": float(sim["var_95"]),
                "remediation_cost_inr": float(asset.get("remediation_cost_inr", 0.0)),
                "risk_reduction_potential_inr": float(sim["eal"] * 0.6),
                "efficiency_ratio": float(sim["eal"] / max(float(asset.get("remediation_cost_inr", 1.0)), 1.0)),
            }
        )

    total_eal = float(np.mean(portfolio_losses))
    primary_eal = float(np.mean(primary_losses))
    secondary_eal = float(np.mean(secondary_losses))
    total_var_95 = float(np.percentile(portfolio_losses, 95))
    lec = loss_exceedance_curve(portfolio_losses)

    return total_eal, primary_eal, secondary_eal, total_var_95, breakdown, lec


def optimize_budget(assets: List[Dict], budget_inr: float) -> Tuple[float, float, float, float, float, float, List[Dict], List[Dict]]:
    from pulp import LpMaximize, LpProblem, LpVariable, lpSum, PULP_CBC_CMD

    sim_results = []
    for asset in assets:
        sim = simulate_scenario(asset, iterations=10000)
        reduction_factor = min(0.9, 0.35 + float(asset.get("epss", 0.0)) * 0.4 + (1.0 - float(asset.get("control_strength", 0.0))) * 0.25)
        delta_eal = float(sim["eal"] * reduction_factor)
        delta_primary = float(sim["primary_eal"] * reduction_factor)
        delta_secondary = float(sim["secondary_eal"] * reduction_factor)

        sim_results.append({
            "asset": asset,
            "delta_eal": delta_eal,
            "delta_primary": delta_primary,
            "delta_secondary": delta_secondary,
            "cost": float(asset.get("remediation_cost_inr", 0.0)),
        })

    prob = LpProblem("defendfair_budget", LpMaximize)
    decision = {idx: LpVariable(f"x_{idx}", cat="Binary") for idx in range(len(sim_results))}
    prob += lpSum(sim_results[idx]["delta_eal"] * decision[idx] for idx in range(len(sim_results)))
    prob += lpSum(sim_results[idx]["cost"] * decision[idx] for idx in range(len(sim_results))) <= budget_inr
    prob.solve(PULP_CBC_CMD(msg=False))

    selected = []
    total_spend = 0.0
    total_reduction = 0.0
    funded_map = {}
    for idx, item in enumerate(sim_results):
        funded = bool(decision[idx].value() > 0.5)
        funded_map[item["asset"]["asset_name"]] = funded
        if funded:
            total_spend += item["cost"]
            total_reduction += item["delta_eal"]

        selected.append({
            "asset_name": item["asset"]["asset_name"],
            "cve_id": item["asset"]["cve_id"],
            "threat_source": item["asset"]["threat_source"],
            "remediation_fix": item["asset"]["remediation_fix"],
            "fix_cost_inr": float(item["cost"]),
            "delta_eal_inr": float(item["delta_eal"]),
            "primary_eal_inr": float(item["delta_primary"]),
            "secondary_eal_inr": float(item["delta_secondary"]),
            "efficiency_ratio": float(item["delta_eal"] / max(item["cost"], 1.0)),
            "funded": funded,
            "scheduled_quarter": "Q1" if funded else "Unscheduled",
        })

    residual_losses = np.zeros(10000, dtype=float)
    residual_primary_losses = np.zeros(10000, dtype=float)
    residual_secondary_losses = np.zeros(10000, dtype=float)

    for asset in assets:
        asset_sim = simulate_scenario(asset, iterations=10000)
        funded = funded_map.get(asset["asset_name"], False)
        if funded:
            reduction_factor = min(0.9, 0.35 + float(asset.get("epss", 0.0)) * 0.4 + (1.0 - float(asset.get("control_strength", 0.0))) * 0.25)
            residual_losses += asset_sim["annual_losses"] * (1.0 - reduction_factor)
            residual_primary_losses += asset_sim["primary_annual_losses"] * (1.0 - reduction_factor)
            residual_secondary_losses += asset_sim["secondary_annual_losses"] * (1.0 - reduction_factor)
        else:
            residual_losses += asset_sim["annual_losses"]
            residual_primary_losses += asset_sim["primary_annual_losses"]
            residual_secondary_losses += asset_sim["secondary_annual_losses"]

    residual_eal = float(np.mean(residual_losses))
    residual_primary_eal = float(np.mean(residual_primary_losses))
    residual_secondary_eal = float(np.mean(residual_secondary_losses))
    residual_var_95 = float(np.percentile(residual_losses, 95))
    rosi = ((total_reduction - total_spend) / total_spend * 100.0) if total_spend > 0 else 0.0
    post_lec = loss_exceedance_curve(residual_losses)

    return total_spend, residual_eal, residual_primary_eal, residual_secondary_eal, residual_var_95, rosi, selected, post_lec


def optimize_multi_period_roadmap(
    assets: List[Dict],
    quarterly_budgets: List[float],
    max_fixes_per_quarter: int = 2
) -> Dict:
    from pulp import LpMaximize, LpProblem, LpVariable, lpSum, PULP_CBC_CMD

    sim_results = []
    for asset in assets:
        sim = simulate_scenario(asset, iterations=10000)
        reduction_factor = min(0.9, 0.35 + float(asset.get("epss", 0.0)) * 0.4 + (1.0 - float(asset.get("control_strength", 0.0))) * 0.25)
        delta_eal = float(sim["eal"] * reduction_factor)
        sim_results.append({
            "asset": asset,
            "delta_eal": delta_eal,
            "cost": float(asset.get("remediation_cost_inr", 0.0)),
        })

    num_assets = len(sim_results)
    quarters = ["Q1", "Q2", "Q3", "Q4"]
    num_quarters = len(quarters)

    prob = LpProblem("defendfair_multi_period", LpMaximize)

    # Decision variables: x[i, t] = 1 if asset i fix is scheduled in quarter t
    x = {}
    for i in range(num_assets):
        for t in range(num_quarters):
            x[i, t] = LpVariable(f"x_{i}_{t}", cat="Binary")

    # Objective: Maximize total cumulative EAL reduction across remaining lifecycle
    # Earlier quarter remediations yield higher multi-period value (weight 4-t)
    prob += lpSum(sim_results[i]["delta_eal"] * (4 - t) * x[i, t] for i in range(num_assets) for t in range(num_quarters))

    # Constraint 1: Each asset fix can be scheduled at most once
    for i in range(num_assets):
        prob += lpSum(x[i, t] for t in range(num_quarters)) <= 1

    # Constraint 2: Spend per quarter <= quarterly budget
    for t in range(num_quarters):
        budget_t = quarterly_budgets[t] if t < len(quarterly_budgets) else quarterly_budgets[-1]
        prob += lpSum(sim_results[i]["cost"] * x[i, t] for i in range(num_assets)) <= budget_t

    # Constraint 3: Headcount/engineering capacity: Max fixes per quarter
    for t in range(num_quarters):
        prob += lpSum(x[i, t] for i in range(num_assets)) <= max_fixes_per_quarter

    prob.solve(PULP_CBC_CMD(msg=False))

    initial_eal, _, _, _, _, _ = quantify_assets(assets, iterations=10000)
    current_eal = initial_eal
    total_spend = 0.0
    total_reduction = 0.0

    quarter_plans = []
    for t, q_name in enumerate(quarters):
        q_spend = 0.0
        q_reduction = 0.0
        q_remediations = []

        for i, item in enumerate(sim_results):
            if bool(x[i, t].value() > 0.5):
                q_spend += item["cost"]
                q_reduction += item["delta_eal"]
                q_remediations.append({
                    "asset_name": item["asset"]["asset_name"],
                    "cve_id": item["asset"]["cve_id"],
                    "threat_source": item["asset"]["threat_source"],
                    "remediation_fix": item["asset"]["remediation_fix"],
                    "fix_cost_inr": float(item["cost"]),
                    "delta_eal_inr": float(item["delta_eal"]),
                    "primary_eal_inr": float(item["delta_eal"] * 0.6),
                    "secondary_eal_inr": float(item["delta_eal"] * 0.4),
                    "efficiency_ratio": float(item["delta_eal"] / max(item["cost"], 1.0)),
                    "funded": True,
                    "scheduled_quarter": q_name,
                })

        current_eal = max(0.0, current_eal - q_reduction)
        total_spend += q_spend
        total_reduction += q_reduction

        quarter_plans.append({
            "quarter": q_name,
            "spend_inr": float(q_spend),
            "eal_reduction_inr": float(q_reduction),
            "remaining_eal_inr": float(current_eal),
            "remediations": q_remediations,
        })

    return {
        "quarters": quarter_plans,
        "total_spend_inr": float(total_spend),
        "total_eal_reduction_inr": float(total_reduction),
    }

