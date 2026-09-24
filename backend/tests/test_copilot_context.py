from app.main import copilot_chat
from app.models import CopilotRequest


def test_copilot_uses_context_state_for_a_live_board_summary():
    request = CopilotRequest(
        query="Explain how allocating ₹20 Lakhs improves our RBI regulatory compliance.",
        context_state={
            "budget_inr": 2000000,
            "current_eal_inr": 9000000,
            "residual_eal_inr": 5200000,
            "selected_remediations": [
                {
                    "asset_name": "Core Banking Switch",
                    "delta_eal_inr": 1800000,
                    "funded": True,
                }
            ],
        },
    )

    response = copilot_chat(request)

    assert "RBI" in response.reply
    assert "Core Banking Switch" in response.reply
    assert "₹" in response.reply
    assert "20" in response.reply or "2.0" in response.reply
    assert any(item.framework == "RBI Master Directions" for item in response.citations)
