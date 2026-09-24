from __future__ import annotations

from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

from app.data.seeds import SEED_ASSETS
from app.engine import optimize_budget, optimize_multi_period_roadmap, quantify_assets
from app.engine_rl import train_rl_agent
from app.models import (
    CopilotRequest,
    CopilotResponse,
    OptimizationRequest,
    OptimizationResponse,
    QuantifyRequest,
    QuantifyResponse,
    RLOptimizationRequest,
    RLOptimizationResponse,
    RoadmapRequest,
    RoadmapResponse,
    SelectedRemediation,
)
from app.services.pdf_service import generate_executive_board_pdf
from app.services.rag_service import build_board_reply
from app.services.scanner_upload import parse_scan_file
from app.services.threat_intel import enrich_asset_with_live_threat_data

app = FastAPI(title="DefendFAIR API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


from app.data.seeds import SEED_ASSETS_LARGE, SEED_ASSETS_SMB


@app.get("/api/v1/assets/seed")
def get_seed_assets(scale: str = "large") -> List[Dict[str, Any]]:
    target_seeds = SEED_ASSETS_SMB if scale.lower() == "smb" else SEED_ASSETS_LARGE
    return [
        {
            "asset_name": asset.asset_name,
            "asset_type": asset.asset_type,
            "description": asset.description,
            "cve_id": asset.cve_id,
            "threat_source": asset.threat_source,
            "epss": asset.epss,
            "exposure_multiplier": asset.exposure_multiplier,
            "records": asset.records,
            "downtime_hours": asset.downtime_hours,
            "control_strength": asset.control_strength,
            "remediation_cost_inr": asset.remediation_cost_inr,
            "remediation_fix": asset.remediation_fix,
            "business_impact": asset.business_impact,
            "asset_tier": getattr(asset, "asset_tier", "Tier 1"),
            "slef": asset.slef,
        }
        for asset in target_seeds
    ]


@app.post("/api/v1/quantify", response_model=QuantifyResponse)
def quantify(request: QuantifyRequest) -> QuantifyResponse:
    if not request.assets:
        raise HTTPException(status_code=400, detail="At least one asset scenario is required.")

    total_eal, primary_eal, secondary_eal, total_var, breakdown, lec = quantify_assets([
        asset.model_dump() for asset in request.assets
    ], iterations=request.iterations)

    return QuantifyResponse(
        total_eal_inr=float(total_eal),
        primary_eal_inr=float(primary_eal),
        secondary_eal_inr=float(secondary_eal),
        total_var_95_inr=float(total_var),
        asset_breakdowns=[
            {
                "asset_name": entry["asset_name"],
                "cve_id": entry["cve_id"],
                "threat_source": entry["threat_source"],
                "eal_inr": float(entry["eal_inr"]),
                "primary_eal_inr": float(entry["primary_eal_inr"]),
                "secondary_eal_inr": float(entry["secondary_eal_inr"]),
                "var_95_inr": float(entry["var_95_inr"]),
                "remediation_cost_inr": float(entry["remediation_cost_inr"]),
                "risk_reduction_potential_inr": float(entry["risk_reduction_potential_inr"]),
                "efficiency_ratio": float(entry["efficiency_ratio"]),
            }
            for entry in breakdown
        ],
        loss_exceedance_curve=lec,
    )


@app.post("/api/v1/optimize", response_model=OptimizationResponse)
def optimize(request: OptimizationRequest) -> OptimizationResponse:
    if not request.assets:
        raise HTTPException(status_code=400, detail="At least one asset scenario is required.")

    allocated_spend, residual_eal, residual_primary, residual_secondary, residual_var, rosi, selected, post_lec = optimize_budget(
        [asset.model_dump() for asset in request.assets], request.budget_inr
    )

    return OptimizationResponse(
        allocated_spend_inr=float(allocated_spend),
        residual_eal_inr=float(residual_eal),
        primary_eal_inr=float(residual_primary),
        secondary_eal_inr=float(residual_secondary),
        residual_var_95_inr=float(residual_var),
        rosi_percentage=float(rosi),
        selected_remediations=[
            SelectedRemediation(
                asset_name=item["asset_name"],
                cve_id=item["cve_id"],
                threat_source=item["threat_source"],
                remediation_fix=item["remediation_fix"],
                fix_cost_inr=float(item["fix_cost_inr"]),
                delta_eal_inr=float(item["delta_eal_inr"]),
                primary_eal_inr=float(item.get("primary_eal_inr", 0.0)),
                secondary_eal_inr=float(item.get("secondary_eal_inr", 0.0)),
                efficiency_ratio=float(item["efficiency_ratio"]),
                funded=bool(item["funded"]),
                scheduled_quarter=str(item.get("scheduled_quarter", "Q1")),
            )
            for item in selected
        ],
        post_remediation_lec=post_lec,
    )


@app.post("/api/v1/optimize-roadmap", response_model=RoadmapResponse)
def optimize_roadmap(request: RoadmapRequest) -> RoadmapResponse:
    if not request.assets:
        raise HTTPException(status_code=400, detail="At least one asset scenario is required.")

    result = optimize_multi_period_roadmap(
        [asset.model_dump() for asset in request.assets],
        request.quarterly_budgets,
        request.max_fixes_per_quarter,
    )

    return RoadmapResponse(**result)


@app.post("/api/v1/optimize-rl", response_model=RLOptimizationResponse)
def optimize_rl(request: RLOptimizationRequest) -> RLOptimizationResponse:
    if not request.assets:
        raise HTTPException(status_code=400, detail="At least one asset scenario is required.")

    result = train_rl_agent(
        [asset.model_dump() for asset in request.assets],
        request.budget_inr,
        episodes=request.episodes,
        alpha=request.alpha,
        gamma=request.gamma,
        epsilon_start=request.epsilon,
    )

    return RLOptimizationResponse(
        allocated_spend_inr=float(result["allocated_spend_inr"]),
        residual_eal_inr=float(result["residual_eal_inr"]),
        residual_var_95_inr=float(result["residual_var_95_inr"]),
        rosi_percentage=float(result["rosi_percentage"]),
        total_reward=float(result["total_reward"]),
        reward_history=result["reward_history"],
        selected_remediations=[
            SelectedRemediation(
                asset_name=item["asset_name"],
                cve_id=item["cve_id"],
                threat_source=item["threat_source"],
                remediation_fix=item["remediation_fix"],
                fix_cost_inr=float(item["fix_cost_inr"]),
                delta_eal_inr=float(item["delta_eal_inr"]),
                primary_eal_inr=float(item.get("primary_eal_inr", 0.0)),
                secondary_eal_inr=float(item.get("secondary_eal_inr", 0.0)),
                efficiency_ratio=float(item["efficiency_ratio"]),
                funded=bool(item["funded"]),
                scheduled_quarter=str(item.get("scheduled_quarter", "Q1")),
            )
            for item in result["selected_remediations"]
        ],
    )



@app.post("/api/v1/export-pdf")
def export_pdf(payload: Dict[str, Any]) -> Response:
    assets = payload.get("assets") or [asset.model_dump() for asset in SEED_ASSETS]
    budget_inr = float(payload.get("budget_inr", 2000000.0))

    total_eal, primary_eal, secondary_eal, total_var, breakdown, _ = quantify_assets(assets, iterations=10000)
    allocated_spend, residual_eal, residual_primary, residual_secondary, residual_var, rosi, selected, _ = optimize_budget(assets, budget_inr)

    quantify_dict = {
        "total_eal_inr": total_eal,
        "primary_eal_inr": primary_eal,
        "secondary_eal_inr": secondary_eal,
        "total_var_95_inr": total_var,
    }
    optimize_dict = {
        "allocated_spend_inr": allocated_spend,
        "residual_eal_inr": residual_eal,
        "rosi_percentage": rosi,
        "selected_remediations": selected,
    }

    pdf_bytes = generate_executive_board_pdf(quantify_dict, optimize_dict)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=DefendFAIR_Executive_Board_Report.pdf"},
    )


@app.post("/api/v1/copilot/chat", response_model=CopilotResponse)
def copilot_chat(request: CopilotRequest) -> CopilotResponse:
    response = build_board_reply(request.query, request.context_state or {})
    return CopilotResponse(reply=response["reply"], citations=response["citations"])


@app.post("/api/v1/upload-scan")
def upload_scan(payload: Dict[str, Any]) -> Dict[str, Any]:
    file_text = str(payload.get("file_text") or "")
    filename = str(payload.get("filename") or "scan.csv")
    parsed = parse_scan_file(file_text, filename)
    enriched = [enrich_asset_with_live_threat_data(item) for item in parsed]
    return {"records": enriched, "count": len(enriched)}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

