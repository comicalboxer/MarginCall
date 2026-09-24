from __future__ import annotations

from typing import Any, Dict, List, Literal

from pydantic import BaseModel, ConfigDict, Field


class AssetScenario(BaseModel):
    model_config = ConfigDict(extra="ignore")

    asset_name: str
    cve_id: str
    threat_source: str
    epss: float = Field(..., ge=0.0, le=1.0)
    severity: str = "High"
    control_strength: float = Field(..., ge=0.0, le=1.0)
    exposure_multiplier: float = 1.0
    base_frequency: float = 12.0
    records: int = 5000
    downtime_hours: int = 12
    remediation_cost_inr: float = 200000.0
    remediation_fix: str = "Patch and harden"
    asset_tier: str = "Tier 1"
    strategic_value: float = 1.0
    asset_type: str = "Application"
    business_impact: str = "Operational disruption and data compromise"
    slef: float = Field(default=0.35, ge=0.0, le=1.0)
    primary_loss_mean_inr: float = 0.0
    secondary_loss_mean_inr: float = 0.0


class QuantifyRequest(BaseModel):
    assets: List[AssetScenario]
    iterations: int = Field(default=10000, ge=1000, le=50000)


class AssetBreakdown(BaseModel):
    asset_name: str
    cve_id: str
    threat_source: str
    eal_inr: float
    primary_eal_inr: float = 0.0
    secondary_eal_inr: float = 0.0
    var_95_inr: float
    remediation_cost_inr: float
    risk_reduction_potential_inr: float
    efficiency_ratio: float


class QuantifyResponse(BaseModel):
    total_eal_inr: float
    primary_eal_inr: float = 0.0
    secondary_eal_inr: float = 0.0
    total_var_95_inr: float
    asset_breakdowns: List[AssetBreakdown]
    loss_exceedance_curve: List[Dict[str, float]]


class OptimizationRequest(BaseModel):
    budget_inr: float = Field(..., gt=0)
    assets: List[AssetScenario]


class SelectedRemediation(BaseModel):
    asset_name: str
    cve_id: str
    threat_source: str
    remediation_fix: str
    fix_cost_inr: float
    delta_eal_inr: float
    primary_eal_inr: float = 0.0
    secondary_eal_inr: float = 0.0
    efficiency_ratio: float
    funded: bool
    scheduled_quarter: str = "Q1"


class OptimizationResponse(BaseModel):
    allocated_spend_inr: float
    residual_eal_inr: float
    primary_eal_inr: float = 0.0
    secondary_eal_inr: float = 0.0
    residual_var_95_inr: float
    rosi_percentage: float
    selected_remediations: List[SelectedRemediation]
    post_remediation_lec: List[Dict[str, float]]


class RLOptimizationRequest(BaseModel):
    budget_inr: float = Field(..., gt=0)
    assets: List[AssetScenario]
    episodes: int = Field(default=300, ge=50, le=2000)
    alpha: float = Field(default=0.1, ge=0.01, le=0.9)
    gamma: float = Field(default=0.95, ge=0.1, le=0.99)
    epsilon: float = Field(default=1.0, ge=0.1, le=1.0)


class RLOptimizationResponse(BaseModel):
    allocated_spend_inr: float
    residual_eal_inr: float
    residual_var_95_inr: float
    rosi_percentage: float
    total_reward: float
    reward_history: List[float]
    selected_remediations: List[SelectedRemediation]


class RoadmapRequest(BaseModel):
    quarterly_budgets: List[float] = Field(default_factory=lambda: [2000000.0, 2000000.0, 2000000.0, 2000000.0])
    max_fixes_per_quarter: int = Field(default=2, ge=1, le=10)
    assets: List[AssetScenario]


class QuarterPlan(BaseModel):
    quarter: str
    spend_inr: float
    eal_reduction_inr: float
    remaining_eal_inr: float
    remediations: List[SelectedRemediation]


class RoadmapResponse(BaseModel):
    quarters: List[QuarterPlan]
    total_spend_inr: float
    total_eal_reduction_inr: float


class CopilotRequest(BaseModel):
    query: str
    context_state: Dict[str, Any] = Field(default_factory=dict)


class Citation(BaseModel):
    framework: Literal["RBI Master Directions", "SEBI CSCRF", "NIST CSF 2.0"]
    clause: str
    status: Literal["Compliant", "Non-Compliant"]


class CopilotResponse(BaseModel):
    reply: str
    citations: List[Citation]


class SeedAsset(BaseModel):
    asset_name: str
    asset_type: str
    description: str
    cve_id: str
    threat_source: str
    epss: float
    exposure_multiplier: float
    base_frequency: float = 12.0
    records: int
    downtime_hours: int
    control_strength: float
    remediation_cost_inr: float
    remediation_fix: str
    business_impact: str
    asset_tier: str = "Tier 1"
    slef: float = 0.35
    primary_loss_mean_inr: float = 0.0
    secondary_loss_mean_inr: float = 0.0

