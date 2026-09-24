from __future__ import annotations

import os
import re
from typing import Any, Dict, List
import dotenv
import httpx
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Explicitly load .env from backend/.env or root directory
base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
dotenv.load_dotenv(os.path.join(base_dir, ".env"))
dotenv.load_dotenv(os.path.join(base_dir, "backend", ".env"))
dotenv.load_dotenv(r"d:\Projects\MarginCall\backend\.env")
dotenv.load_dotenv()

REGULATORY_CHUNKS = [
    {
        "framework": "RBI Master Directions",
        "clause": "Para 4.1 - Board Oversight & Cyber Governance: The Board of Directors and Risk Management Committee must maintain active oversight over cybersecurity strategy, risk tolerance, and annual cyber resilience audits.",
        "text": "RBI Master Directions Cyber Security Framework Banks NBFCs Board oversight governance risk management committee strategy resilience audit",
        "tags": ["rbi", "board", "governance", "audit"],
    },
    {
        "framework": "RBI Master Directions",
        "clause": "Para 7.2 - 24x7 SOC Monitoring & Incident Reporting: Banks must operate a continuous Security Operations Center and report material cyber incidents to RBI within 6 hours of detection.",
        "text": "RBI Master Directions SOC monitoring incident response notification 6 hours critical threat detection vulnerability",
        "tags": ["rbi", "soc", "incident", "reporting"],
    },
    {
        "framework": "RBI Master Directions",
        "clause": "Para 9.4 - VAPT & Patch Governance: Critical financial applications and transaction switches must undergo bi-annual vulnerability testing and mandatory patching of high-severity CVEs.",
        "text": "RBI Master Directions VAPT vulnerability assessment penetration testing patching core banking transaction switch CVE",
        "tags": ["rbi", "vapt", "patching", "cve"],
    },
    {
        "framework": "SEBI CSCRF",
        "clause": "Sec 3.1 - Baseline Cybersecurity Controls: Listed entities and market infrastructure intermediaries must implement mandatory encryption, network segmentation, and asset vulnerability baselines.",
        "text": "SEBI CSCRF circular market infrastructure baseline controls encryption network segmentation vulnerability asset inventory",
        "tags": ["sebi", "cscrf", "controls", "circular"],
    },
    {
        "framework": "SEBI CSCRF",
        "clause": "Sec 5.3 - CISO Accountability & Audit Reporting: Mandatory appointment of a designated CISO and submission of annual Action Taken Reports (ATR) to SEBI and the Audit Committee.",
        "text": "SEBI CSCRF CISO appointment action taken report ATR audit committee board reporting compliance",
        "tags": ["sebi", "ciso", "atr", "audit"],
    },
    {
        "framework": "SEBI CSCRF",
        "clause": "Sec 8.2 - API & Third-Party Risk Management: Rigorous security evaluations, key rotation, and request signing required for all external payment and market data APIs.",
        "text": "SEBI CSCRF API security third party risk gateway key rotation signed request validation",
        "tags": ["sebi", "api", "third-party"],
    },
    {
        "framework": "NIST CSF 2.0",
        "clause": "GV.RM-01 - Risk Management Strategy: Organizational cyber risk tolerance, risk quantification (FAIR), and capital allocation priorities are documented and communicated.",
        "text": "NIST CSF 2.0 Govern risk management strategy quantification FAIR capital allocation board priorities",
        "tags": ["nist", "governance", "fair"],
    },
    {
        "framework": "NIST CSF 2.0",
        "clause": "PR.DS-01 - Data Security & Protection: Access control, privileged identity management, and cryptographic protection are enforced for critical data repositories.",
        "text": "NIST CSF 2.0 Protect data security access control identity privileged access encryption MFA",
        "tags": ["nist", "protect", "access"],
    },
    {
        "framework": "NIST CSF 2.0",
        "clause": "RS.MA-01 - Incident Triage & Response: Documented incident response plans are executed during active intrusions to mitigate operational downtime and loss exposure.",
        "text": "NIST CSF 2.0 Respond incident triage response downtime mitigation containment operational loss",
        "tags": ["nist", "respond", "triage"],
    },
]


class VectorRAGStore:
    def __init__(self, chunks: List[Dict[str, Any]]):
        self.chunks = chunks
        self.documents = [f"{item['clause']} {item['text']}" for item in chunks]
        self.vectorizer = TfidfVectorizer(stop_words="english")
        self.tfidf_matrix = self.vectorizer.fit_transform(self.documents)

    def query(self, search_text: str, top_k: int = 3) -> List[Dict[str, Any]]:
        if not search_text.strip():
            return self.chunks[:top_k]
        query_vec = self.vectorizer.transform([search_text])
        scores = cosine_similarity(query_vec, self.tfidf_matrix).flatten()
        top_indices = np.argsort(scores)[::-1][:top_k]

        results = []
        for idx in top_indices:
            score = float(scores[idx])
            item = dict(self.chunks[idx])
            item["score"] = score
            results.append(item)
        return results


# Global vector store instance
vector_store = VectorRAGStore(REGULATORY_CHUNKS)


def build_board_reply(query: str, context: Dict[str, Any]) -> Dict[str, Any]:
    retrieved_chunks = vector_store.query(query, top_k=3)

    citations: List[Dict[str, str]] = []
    for chunk in retrieved_chunks:
        citations.append({
            "framework": chunk["framework"],
            "clause": chunk["clause"],
            "status": "Compliant",
        })

    budget_inr = float(context.get("budget_inr", 0.0) or 0.0)
    current_eal = float(context.get("current_eal_inr", 0.0) or 0.0)
    residual_eal = float(context.get("residual_eal_inr", 0.0) or 0.0)
    selected_remediations = context.get("selected_remediations") or []
    funded_names = [item.get("asset_name") or item.get("name") for item in selected_remediations if item.get("funded", True)]

    groq_api_key = os.getenv("GROQ_API_KEY") or "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"

    if groq_api_key:
        try:
            rag_context_text = "\n".join([f"- [{c['framework']}] {c['clause']}" for c in retrieved_chunks])
            system_prompt = (
                "You are an expert Chief Information Security Officer (CISO) and Board Risk Advisor. "
                "Provide a clear, concise, 2-3 sentence executive response to the Board of Directors. "
                "Support your answer using the provided financial risk metrics and relevant regulatory framework clauses (RBI Master Directions, SEBI CSCRF, NIST CSF 2.0)."
            )
            user_content = (
                f"Board Query: \"{query}\"\n\n"
                f"DefendFAIR Risk Portfolio State:\n"
                f"- Allocated Cyber Budget: ₹{budget_inr:,.0f}\n"
                f"- Current Annualized Expected Loss (EAL): ₹{current_eal:,.0f}\n"
                f"- Residual EAL Post-Remediation: ₹{residual_eal:,.0f}\n"
                f"- Top Funded Critical Remediations: {', '.join(funded_names[:3]) if funded_names else 'None'}\n\n"
                f"Retrieved Regulatory Context (Vector RAG):\n"
                f"{rag_context_text}\n"
            )

            # Call Groq API via httpx using openai/gpt-oss-120b
            with httpx.Client(timeout=10.0) as client:
                response = client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {groq_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "openai/gpt-oss-120b",
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_content},
                        ],
                        "temperature": 0.3,
                        "max_tokens": 400,
                    },
                )
                if response.status_code == 200:
                    raw_content = response.json()["choices"][0]["message"]["content"]
                    clean_content = raw_content.replace("<think>", "").replace("</think>", "").strip()
                    if clean_content:
                        return {"reply": clean_content, "citations": citations, "llm_powered": True}
        except Exception:
            pass

    # Local fallback synthesized response
    lower_query = (query or "").lower()
    budget_lakhs = budget_inr / 100000.0 if budget_inr else 0.0
    primary_asset = funded_names[0] if funded_names else None
    top_chunk = retrieved_chunks[0] if retrieved_chunks else None

    if "sebi" in lower_query or "cscrf" in lower_query or "circular" in lower_query or "atr" in lower_query:
        reply = (
            f"SEBI CSCRF requires documented board oversight, baseline control verification, and Action Taken Reports (ATR). "
            f"Allocating ₹{budget_inr:,.0f} (₹{budget_lakhs:.1f} Lakhs) satisfies SEBI compliance requirements by prioritizing high-exposure assets and documenting residual risk reduction."
        )
    elif "rbi" in lower_query or "regulatory" in lower_query or "bank" in lower_query:
        if primary_asset:
            reply = (
                f"Under RBI Master Directions for Cybersecurity, a ₹{budget_inr:,.0f} capital allocation (₹{budget_lakhs:.1f} Lakhs) directly strengthens resilience for critical banking infrastructure. "
                f"The top funded remediation is '{primary_asset}', fulfilling Board oversight obligations and VAPT compliance guidelines."
            )
        else:
            reply = (
                "RBI cyber resilience guidelines require continuous SOC monitoring, bi-annual VAPT, and demonstrable EAL risk reduction. "
                "The current remediation plan supports these requirements by funding high-priority asset vulnerabilities."
            )
    elif "nist" in lower_query or "governance" in lower_query or "fair" in lower_query:
        reply = (
            "NIST CSF 2.0 (Govern & Protect) stresses aligning risk quantification (FAIR) to capital budgeting. "
            "The active allocation strategy maximizes Return on Security Investment (ROSI) while maintaining compliance across core security controls."
        )
    else:
        clause_desc = top_chunk["clause"] if top_chunk else "NIST CSF 2.0 Governance Controls"
        reply = (
            f"Based on semantic retrieval against our regulatory corpus ({top_chunk['framework'] if top_chunk else 'NIST'}), "
            f"a spend of ₹{budget_inr:,.0f} (₹{budget_lakhs:.1f} Lakhs) aligns with {clause_desc}."
        )

    return {"reply": reply, "citations": citations, "llm_powered": False}
