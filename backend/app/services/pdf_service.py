from __future__ import annotations

from io import BytesIO
from typing import Any, Dict, List

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def generate_executive_board_pdf(
    quantify_data: Dict[str, Any],
    optimize_data: Dict[str, Any],
    organization_name: str = "Enterprise Banking & Digital Assets",
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0f172a"),
        alignment=0,
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#475569"),
    )
    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=17,
        textColor=colors.HexColor("#0284c7"),
        spaceBefore=12,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "BodyTextCustom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
    )
    bold_body_style = ParagraphStyle(
        "BoldBodyCustom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#0f172a"),
    )
    badge_style = ParagraphStyle(
        "BadgeText",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0284c7"),
    )

    elements = []

    # Title & Header
    elements.append(Paragraph("DefendFAIR", badge_style))
    elements.append(Paragraph("Executive Cyber Risk & Capital Allocation Report", title_style))
    elements.append(Paragraph(f"Organization: {organization_name} | Scope: FAIR CRQ & Board Remediation Plan", subtitle_style))
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=12))

    # Executive Summary Cards Table
    total_eal = float(quantify_data.get("total_eal_inr", 0.0))
    primary_eal = float(quantify_data.get("primary_eal_inr", total_eal * 0.6))
    secondary_eal = float(quantify_data.get("secondary_eal_inr", total_eal * 0.4))
    var_95 = float(quantify_data.get("total_var_95_inr", 0.0))
    allocated_spend = float(optimize_data.get("allocated_spend_inr", 0.0))
    residual_eal = float(optimize_data.get("residual_eal_inr", total_eal))
    rosi = float(optimize_data.get("rosi_percentage", 0.0))
    risk_eliminated = ((total_eal - residual_eal) / total_eal * 100.0) if total_eal > 0 else 0.0

    kpi_data = [
        [
            Paragraph("<b>Baseline Annual Risk (EAL)</b>", body_style),
            Paragraph(f"₹{total_eal:,.0f}", bold_body_style),
            Paragraph("<b>Primary Operational Loss</b>", body_style),
            Paragraph(f"₹{primary_eal:,.0f}", bold_body_style),
        ],
        [
            Paragraph("<b>Worst-Case (95% VaR)</b>", body_style),
            Paragraph(f"₹{var_95:,.0f}", bold_body_style),
            Paragraph("<b>Secondary Fine/Reg Loss</b>", body_style),
            Paragraph(f"₹{secondary_eal:,.0f}", bold_body_style),
        ],
        [
            Paragraph("<b>Allocated Spend</b>", body_style),
            Paragraph(f"₹{allocated_spend:,.0f}", bold_body_style),
            Paragraph("<b>Optimized Residual Risk</b>", body_style),
            Paragraph(f"₹{residual_eal:,.0f}", bold_body_style),
        ],
        [
            Paragraph("<b>Calculated ROSI %</b>", body_style),
            Paragraph(f"{rosi:.1f}%", bold_body_style),
            Paragraph("<b>Risk Reduction %</b>", body_style),
            Paragraph(f"{risk_eliminated:.1f}%", bold_body_style),
        ],
    ]

    kpi_table = Table(kpi_data, colWidths=[140, 130, 140, 130])
    kpi_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("PADDING", (0, 0), (-1, -1), 6),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ])
    )
    elements.append(kpi_table)
    elements.append(Spacer(1, 14))

    # Section: Open FAIR Math & Loss Decomposition
    elements.append(Paragraph("1. Open FAIR™ Loss Decomposition", heading_style))
    loss_desc = (
        f"This evaluation separates <b>Primary Loss</b> (direct operational downtime and incident recovery costs: ₹{primary_eal:,.0f}) "
        f"from <b>Secondary Loss</b> (regulatory non-compliance fines, statutory litigation, and notification costs: ₹{secondary_eal:,.0f}). "
        "Secondary loss frequency (SLEF) is evaluated using Monte Carlo iterations to ensure actuarial defensibility for board oversight."
    )
    elements.append(Paragraph(loss_desc, body_style))
    elements.append(Spacer(1, 10))

    # Section: Prioritized Action Taken Report (ATR)
    elements.append(Paragraph("2. Prioritized Remediation Plan & Regulatory Mapping (ATR)", heading_style))

    remediations: List[Dict[str, Any]] = optimize_data.get("selected_remediations", [])

    atr_headers = [
        Paragraph("<b>Asset</b>", bold_body_style),
        Paragraph("<b>CVE ID</b>", bold_body_style),
        Paragraph("<b>Fix Action</b>", bold_body_style),
        Paragraph("<b>Cost (₹)</b>", bold_body_style),
        Paragraph("<b>ΔEAL (₹)</b>", bold_body_style),
        Paragraph("<b>Status</b>", bold_body_style),
    ]

    table_rows = [atr_headers]
    for item in remediations:
        status_text = "FUNDED (Q1)" if item.get("funded") else "BACKLOG"
        table_rows.append([
            Paragraph(str(item.get("asset_name")), body_style),
            Paragraph(str(item.get("cve_id")), body_style),
            Paragraph(str(item.get("remediation_fix")), body_style),
            Paragraph(f"₹{float(item.get('fix_cost_inr', 0)):,.0f}", body_style),
            Paragraph(f"₹{float(item.get('delta_eal_inr', 0)):,.0f}", body_style),
            Paragraph(f"<b>{status_text}</b>", body_style),
        ])

    atr_table = Table(table_rows, colWidths=[90, 75, 180, 65, 65, 65])
    atr_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
            ("TOPPADDING", (0, 0), (-1, 0), 6),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("PADDING", (0, 1), (-1, -1), 5),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ])
    )
    elements.append(atr_table)
    elements.append(Spacer(1, 14))

    # Governance & Sign-off Block
    elements.append(Paragraph("3. Governance & Regulatory Alignment Statement", heading_style))
    gov_text = (
        "This report has been compiled for board presentation and regulatory audit compliance under "
        "<b>RBI Master Directions on Cyber Security</b>, <b>SEBI CSCRF</b>, and <b>NIST CSF 2.0 Governance Controls</b>. "
        "All modeled loss reductions demonstrate measurable return on security investment (ROSI)."
    )
    elements.append(Paragraph(gov_text, body_style))
    elements.append(Spacer(1, 20))

    # Signatures Table
    sig_data = [
        [
            Paragraph("<b>Chief Information Security Officer (CISO)</b><br/><br/>_______________________", body_style),
            Paragraph("<b>Risk Management Committee Chair</b><br/><br/>_______________________", body_style),
        ]
    ]
    sig_table = Table(sig_data, colWidths=[270, 270])
    sig_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("PADDING", (0, 0), (-1, -1), 4),
        ])
    )
    elements.append(sig_table)

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
