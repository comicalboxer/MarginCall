from __future__ import annotations

import json
from typing import Any, Dict, List

import httpx


FIRST_EPSS_URL = "https://api.first.org/data/v1/epss?cve={cve}"
CISA_KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"


def fetch_epss_for_cve(cve_id: str) -> float:
    try:
        response = httpx.get(FIRST_EPSS_URL.format(cve=cve_id), timeout=10.0)
        if response.status_code != 200:
            return 0.0
        payload = response.json()
        data = payload.get("data", [])
        if not data:
            return 0.0
        metrics = data[0].get("epss", {})
        score = metrics.get("percentile") or metrics.get("score")
        if isinstance(score, (int, float)):
            return float(score)
        return 0.0
    except Exception:
        return 0.0


def fetch_cisa_kev() -> List[Dict[str, Any]]:
    try:
        response = httpx.get(CISA_KEV_URL, timeout=10.0)
        if response.status_code != 200:
            return []
        payload = response.json()
        return payload.get("vulnerabilities", [])
    except Exception:
        return []


def enrich_asset_with_live_threat_data(asset: Dict[str, Any]) -> Dict[str, Any]:
    cve_id = asset.get("cve_id")
    epss = fetch_epss_for_cve(cve_id) if cve_id else 0.0
    kev = fetch_cisa_kev()
    kev_match = next((item for item in kev if item.get("cveID") == cve_id), None)
    enriched = dict(asset)
    if epss > 0:
        enriched["epss"] = min(1.0, max(0.0, epss))
    if kev_match:
        enriched["threat_source"] = f"{enriched.get('threat_source', 'Threat actor')} + KEV exploited in the wild"
        enriched["business_impact"] = enriched.get("business_impact", "Known exploited vulnerability impacting core operations.")
    return enriched
