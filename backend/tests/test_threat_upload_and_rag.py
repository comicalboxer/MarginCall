from app.services.scanner_upload import parse_scan_file
from app.services.rag_service import build_board_reply


def test_parse_csv_scan_upload_extracts_asset_and_cve_records():
    csv_text = "asset_name,cve_id,severity\nCore Banking Switch,CVE-2024-21432,High\nCustomer Portal,CVE-2024-27894,Medium\n"

    parsed = parse_scan_file(csv_text, "scan.csv")

    assert len(parsed) == 2
    assert parsed[0]["asset_name"] == "Core Banking Switch"
    assert parsed[0]["cve_id"] == "CVE-2024-21432"


def test_rag_service_returns_relevant_regulatory_guidance_for_board_queries():
    response = build_board_reply(
        "Which controls are required to meet SEBI CSCRF circular obligations for cyber risk management?",
        {"budget_inr": 2000000},
    )

    assert response["reply"]
    assert any("SEBI" in citation["framework"] for citation in response["citations"]) or "SEBI" in response["reply"]
