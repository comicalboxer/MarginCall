from __future__ import annotations

from typing import Any, Dict, List, Tuple
import numpy as np

from app.engine import quantify_assets, simulate_scenario, loss_exceedance_curve


class CyberRiskEnv:
    def __init__(self, assets: List[Dict[str, Any]], budget_inr: float):
        self.assets = assets
        self.budget_inr = budget_inr
        self.num_assets = len(assets)
        self.reset()

    def reset(self) -> Tuple[int, Tuple[bool, ...]]:
        self.remaining_budget = self.budget_inr
        self.remediated = [False] * self.num_assets
        return self._get_state()

    def _get_state(self) -> Tuple[int, Tuple[bool, ...]]:
        # Discretize budget into 10 buckets for tabular Q-learning state representation
        budget_ratio = max(0.0, min(1.0, self.remaining_budget / max(1.0, self.budget_inr)))
        budget_bucket = int(budget_ratio * 10)
        return (budget_bucket, tuple(self.remediated))

    def step(self, action: int) -> Tuple[Tuple[int, Tuple[bool, ...]], float, bool, Dict[str, Any]]:
        if action < 0 or action >= self.num_assets:
            return self._get_state(), -10.0, True, {"info": "invalid_action"}

        asset = self.assets[action]
        cost = float(asset.get("remediation_cost_inr", 0.0))

        # Check if already remediated or insufficient budget
        if self.remediated[action]:
            return self._get_state(), -5.0, False, {"info": "already_remediated"}

        if cost > self.remaining_budget:
            # Cannot afford this asset with remaining budget
            return self._get_state(), -2.0, False, {"info": "insufficient_budget"}

        # Execute remediation action
        self.remediated[action] = True
        self.remaining_budget -= cost

        sim = simulate_scenario(asset, iterations=5000)
        reduction_factor = min(0.9, 0.35 + float(asset.get("epss", 0.0)) * 0.4 + (1.0 - float(asset.get("control_strength", 0.0))) * 0.25)
        delta_eal = float(sim["eal"] * reduction_factor)
        efficiency = delta_eal / max(cost, 1.0)

        tier = str(asset.get("asset_tier", "Tier 2"))
        tier_weight = 2.5 if tier == "Tier 1" else 1.0

        # Reward formulation: ROSI efficiency + Tier priority weighting
        reward = (efficiency * 5.0) + (tier_weight * 3.0) + (delta_eal / 1000000.0)

        # Check termination: no remaining affordable actions or all assets remediated
        affordable = [
            idx for idx in range(self.num_assets)
            if not self.remediated[idx] and float(self.assets[idx].get("remediation_cost_inr", 0.0)) <= self.remaining_budget
        ]
        done = len(affordable) == 0 or all(self.remediated)

        return self._get_state(), float(reward), done, {"delta_eal": delta_eal, "cost": cost}


class QRemediationAgent:
    def __init__(self, num_actions: int, alpha: float = 0.1, gamma: float = 0.95, epsilon_start: float = 1.0):
        self.num_actions = num_actions
        self.alpha = alpha
        self.gamma = gamma
        self.epsilon = epsilon_start
        self.q_table: Dict[Tuple[int, Tuple[bool, ...]], np.ndarray] = {}

    def get_q_values(self, state: Tuple[int, Tuple[bool, ...]]) -> np.ndarray:
        if state not in self.q_table:
            self.q_table[state] = np.zeros(self.num_actions, dtype=float)
        return self.q_table[state]

    def choose_action(self, state: Tuple[int, Tuple[bool, ...]], rng: np.random.Generator) -> int:
        if rng.random() < self.epsilon:
            return int(rng.integers(0, self.num_actions))
        q_vals = self.get_q_values(state)
        return int(np.argmax(q_vals))

    def update(self, state: Tuple[int, Tuple[bool, ...]], action: int, reward: float, next_state: Tuple[int, Tuple[bool, ...]], done: bool):
        current_q = self.get_q_values(state)[action]
        next_max_q = 0.0 if done else float(np.max(self.get_q_values(next_state)))
        target = reward + self.gamma * next_max_q
        self.q_table[state][action] += self.alpha * (target - current_q)


def train_rl_agent(
    assets: List[Dict[str, Any]],
    budget_inr: float,
    episodes: int = 400,
    alpha: float = 0.1,
    gamma: float = 0.95,
    epsilon_start: float = 1.0,
) -> Dict[str, Any]:
    rng = np.random.default_rng(42)
    env = CyberRiskEnv(assets, budget_inr)
    agent = QRemediationAgent(num_actions=len(assets), alpha=alpha, gamma=gamma, epsilon_start=epsilon_start)

    reward_history = []
    min_epsilon = 0.05
    decay_rate = (min_epsilon / max(1.0, epsilon_start)) ** (1.0 / max(1, episodes))

    for ep in range(episodes):
        state = env.reset()
        episode_reward = 0.0
        done = False
        steps = 0

        while not done and steps < len(assets) * 2:
            action = agent.choose_action(state, rng)
            next_state, reward, done, _ = env.step(action)
            agent.update(state, action, reward, next_state, done)
            state = next_state
            episode_reward += reward
            steps += 1

        agent.epsilon = max(min_epsilon, agent.epsilon * decay_rate)
        reward_history.append(float(episode_reward))

    # Evaluate final deterministic greedy policy (epsilon = 0.0)
    agent.epsilon = 0.0
    state = env.reset()
    done = False
    total_spend = 0.0
    total_reduction = 0.0
    selected = []
    funded_map = {}

    while not done:
        action = agent.choose_action(state, rng)
        asset = assets[action]
        cost = float(asset.get("remediation_cost_inr", 0.0))

        if not env.remediated[action] and cost <= env.remaining_budget:
            next_state, _, done, info = env.step(action)
            delta_eal = info.get("delta_eal", 0.0)
            total_spend += cost
            total_reduction += delta_eal
            funded_map[asset["asset_name"]] = True

            selected.append({
                "asset_name": asset["asset_name"],
                "cve_id": asset["cve_id"],
                "threat_source": asset["threat_source"],
                "remediation_fix": asset["remediation_fix"],
                "fix_cost_inr": float(cost),
                "delta_eal_inr": float(delta_eal),
                "efficiency_ratio": float(delta_eal / max(cost, 1.0)),
                "funded": True,
                "scheduled_quarter": "Q1",
            })
            state = next_state
        else:
            # Force explore other unvisited affordable assets if greedy action fails
            affordable = [
                idx for idx in range(len(assets))
                if not env.remediated[idx] and float(assets[idx].get("remediation_cost_inr", 0.0)) <= env.remaining_budget
            ]
            if not affordable:
                break
            action = affordable[0]
            next_state, _, done, info = env.step(action)
            delta_eal = info.get("delta_eal", 0.0)
            asset_sub = assets[action]
            cost_sub = float(asset_sub.get("remediation_cost_inr", 0.0))
            total_spend += cost_sub
            total_reduction += delta_eal
            funded_map[asset_sub["asset_name"]] = True

            selected.append({
                "asset_name": asset_sub["asset_name"],
                "cve_id": asset_sub["cve_id"],
                "threat_source": asset_sub["threat_source"],
                "remediation_fix": asset_sub["remediation_fix"],
                "fix_cost_inr": float(cost_sub),
                "delta_eal_inr": float(delta_eal),
                "efficiency_ratio": float(delta_eal / max(cost_sub, 1.0)),
                "funded": True,
                "scheduled_quarter": "Q1",
            })
            state = next_state

    # Include non-funded assets
    for asset in assets:
        if asset["asset_name"] not in funded_map:
            selected.append({
                "asset_name": asset["asset_name"],
                "cve_id": asset["cve_id"],
                "threat_source": asset["threat_source"],
                "remediation_fix": asset["remediation_fix"],
                "fix_cost_inr": float(asset.get("remediation_cost_inr", 0.0)),
                "delta_eal_inr": 0.0,
                "efficiency_ratio": 0.0,
                "funded": False,
                "scheduled_quarter": "Unscheduled",
            })

    # Compute residual risk after RL policy execution
    residual_losses = np.zeros(5000, dtype=float)
    for asset in assets:
        sim = simulate_scenario(asset, iterations=5000)
        funded = funded_map.get(asset["asset_name"], False)
        if funded:
            reduction_factor = min(0.9, 0.35 + float(asset.get("epss", 0.0)) * 0.4 + (1.0 - float(asset.get("control_strength", 0.0))) * 0.25)
            residual_losses += sim["annual_losses"] * (1.0 - reduction_factor)
        else:
            residual_losses += sim["annual_losses"]

    residual_eal = float(np.mean(residual_losses))
    residual_var_95 = float(np.percentile(residual_losses, 95))
    rosi = ((total_reduction - total_spend) / total_spend * 100.0) if total_spend > 0 else 0.0

    # Smooth reward history into 20 data points for UI plotting
    chunk_size = max(1, len(reward_history) // 20)
    smoothed_rewards = [
        float(np.mean(reward_history[i : i + chunk_size]))
        for i in range(0, len(reward_history), chunk_size)
    ][:20]

    return {
        "allocated_spend_inr": float(total_spend),
        "residual_eal_inr": float(residual_eal),
        "residual_var_95_inr": float(residual_var_95),
        "rosi_percentage": float(rosi),
        "total_reward": float(np.mean(reward_history[-20:])),
        "reward_history": smoothed_rewards,
        "selected_remediations": selected,
    }
