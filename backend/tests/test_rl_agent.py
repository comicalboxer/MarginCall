from app.data.seeds import SEED_ASSETS
from app.engine_rl import CyberRiskEnv, QRemediationAgent, train_rl_agent
from app.main import optimize_rl
from app.models import RLOptimizationRequest


def test_cyber_risk_env_step():
    assets = [asset.model_dump() for asset in SEED_ASSETS]
    env = CyberRiskEnv(assets, budget_inr=20000000.0)
    initial_state = env.reset()

    assert initial_state[0] == 10  # Full budget bucket
    assert len(initial_state[1]) == len(assets)

    next_state, reward, done, info = env.step(0)
    assert isinstance(reward, float)
    assert isinstance(done, bool)
    assert "delta_eal" in info


def test_train_rl_agent_convergence():
    assets = [asset.model_dump() for asset in SEED_ASSETS]
    result = train_rl_agent(assets, budget_inr=5000000.0, episodes=100)

    assert "allocated_spend_inr" in result
    assert "residual_eal_inr" in result
    assert "total_reward" in result
    assert len(result["reward_history"]) > 0
    assert result["allocated_spend_inr"] <= 5000000.0


def test_optimize_rl_route():
    assets = [asset.model_dump() for asset in SEED_ASSETS]
    request = RLOptimizationRequest(budget_inr=4000000.0, assets=assets, episodes=50)
    response = optimize_rl(request)

    assert response.allocated_spend_inr <= 4000000.0
    assert response.residual_eal_inr >= 0.0
    assert isinstance(response.reward_history, list)
    assert len(response.selected_remediations) == len(assets)
