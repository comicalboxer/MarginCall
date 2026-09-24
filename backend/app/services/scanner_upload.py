from __future__ import annotations

import csv
import io
from typing import Any, Dict, List


def parse_scan_file(file_text: str, filename: str) -> List[Dict[str, Any]]:
    records: List[Dict[str, Any]] = []
    cleaned = file_text.strip()
    if not cleaned:
        return records

    if filename.lower().endswith(".json"):
        payload = __import__("json").loads(file_text)
        if isinstance(payload, list):
            for item in payload:
                records.append({
                    "asset_name": str(item.get("asset_name") or item.get("asset") or "Imported Asset"),
                    "cve_id": str(item.get("cve_id") or item.get("cve") or "CVE-UNKNOWN"),
                    "severity": str(item.get("severity") or item.get("risk") or "Medium"),
                    "threat_source": str(item.get("threat_source") or "Uploaded scanner finding"),
                    "epss": float(item.get("epss", 0.5) or 0.5),
                    "control_strength": float(item.get("control_strength", 0.4) or 0.4),
                    "exposure_multiplier": float(item.get("exposure_multiplier", 1.0) or 1.0),
                    "records": int(item.get("records", 50000) or 50000),
                    "downtime_hours": int(item.get("downtime_hours", 12) or 12),
                    "remediation_cost_inr": float(item.get("remediation_cost_inr", 1000000) or 1000000),
                    "remediation_fix": str(item.get("remediation_fix") or "Apply vendor patch and verify remediation."),
                })
        return records

    reader = csv.DictReader(io.StringIO(cleaned))
    for row in reader:
        asset_name = str(row.get("asset_name") or row.get("asset") or row.get("host") or "Imported Asset")
        cve_id = str(row.get("cve_id") or row.get("cve") or row.get("vulnerability") or "CVE-UNKNOWN")
        if not cve_id or cve_id == "CVE-UNKNOWN":
            continue
        records.append({
            "asset_name": asset_name,
            "cve_id": cve_id,
            "severity": str(row.get("severity") or row.get("risk") or "Medium"),
            "threat_source": str(row.get("threat_source") or "Uploaded scanner finding"),
            "epss": float(row.get("epss", 0.5) or 0.5),
            "control_strength": float(row.get("control_strength", 0.4) or 0.4),
            "exposure_multiplier": float(row.get("exposure_multiplier", 1.0) or 1.0),
            "records": int(row.get("records", 50000) or 50000),
            "downtime_hours": int(row.get("downtime_hours", 12) or 12),
            "remediation_cost_inr": float(row.get("remediation_cost_inr", 1000000) or 1000000),
            "remediation_fix": str(row.get("remediation_fix") or "Apply vendor patch and verify remediation."),
        })

    return records
