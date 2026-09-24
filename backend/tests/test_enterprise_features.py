from app.engine import optimize_multi_period_roadmap, quantify_assets
from app.data.seeds import SEED_ASSETS
from app.services.pdf_service import generate_executive_board_pdf
from app.services.rag_service import build_board_reply


def test_primary_and_secondary_loss_decomposition():
    assets = [asset.model_dump() for asset in SEED_ASSETS]
    total_eal, primary_eal, secondary_eal, total_var, breakdown, lec = quantify_assets(assets, iterations=1000)

    assert total_eal > 0
    assert primary_eal > 0
    assert secondary_eal > 0
    assert abs(total_eal - (primary_eal + secondary_eal)) < 1.0
    assert len(breakdown) == len(SEED_ASSETS)
    assert breakdown[0]["primary_eal_inr"] > 0
    assert breakdown[0]["secondary_eal_inr"] > 0


def test_multi_period_roadmap_optimization():
    assets = [asset.model_dump() for asset in SEED_ASSETS]
    roadmap = optimize_multi_period_roadmap(assets, quarterly_budgets=[3000000.0, 3000000.0, 3000000.0, 3000000.0], max_fixes_per_quarter=2)

    assert "quarters" in roadmap
    assert len(roadmap["quarters"]) == 4
    assert roadmap["quarters"][0]["quarter"] == "Q1"
    assert roadmap["total_spend_inr"] >= 0


def test_pdf_export_service():
    quantify_dict = {"total_eal_inr": 10000000.0, "primary_eal_inr": 6000000.0, "secondary_eal_inr": 4000000.0, "total_var_95_inr": 25000000.0}
    optimize_dict = {
        "allocated_spend_inr": 5000000.0,
        "residual_eal_inr": 4000000.0,
        "rosi_percentage": 120.0,
        "selected_remediations": [
            {
                "asset_name": "Core Banking Switch",
                "cve_id": "CVE-2024-21432",
                "remediation_fix": "Patch switch",
                "fix_cost_inr": 2000000.0,
                "delta_eal_inr": 3000000.0,
                "funded": True,
            }
        ],
    }

    pdf_bytes = generate_executive_board_pdf(quantify_dict, optimize_dict)
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes.startswith(b"%PDF")


def test_vector_rag_service_semantic_retrieval():
    response = build_board_reply("How does our spend satisfy SEBI CSCRF audit reporting requirements?", {"budget_inr": 5000000})
    assert response["reply"]
    assert len(response["citations"]) > 0
    assert any("SEBI" in c["framework"] for c in response["citations"])
