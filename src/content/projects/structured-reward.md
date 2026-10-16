---
name: "Structured Reward Feedback in RL"
line: "Does an RL agent learn better if it sees each part of its reward? A careful benchmark that answered: not because of the parts."
year: 2026
fields: [rl]
tags: [pytorch, sac, gymnasium, ablations]
links:
  code: "https://github.com/HugoAlbertBonet/disentangle-reward"
pinned: 4
---

## The question

An RL agent usually receives one number as its reward. If it also receives the individual reward components and the known formula that combines them (but not how its actions affect each one), does it learn the system's cause and effect better?

## What I built

A staged benchmark with Soft Actor-Critic on a deterministic two-actuator environment. It compares a standard one-head critic with a multi-head "structured" critic, one head per reward component, against strict controls: a multi-head critic of the same size trained only on the scalar reward, a control that randomly shuffles the component labels, formula-aware critics, and a head-decorrelation penalty. I ran it on three reward formulas with 10 paired seeds, 20,000 steps each, approximate 95% confidence intervals, and scored it against finite-horizon oracle gradients and local Pareto metrics.

## Results

- The structured critic cut final distance by 21% (0.553 to 0.437) and regret by 37% (0.054 to 0.034) against standard SAC, winning 9 of 10 seeds.
- But the same-size critic trained only on the scalar reward matched it, and so did the shuffled-labels control. The gain comes from the extra capacity of a multi-head critic, not from the information in the components. The same held for the other reward formulas.
- It's a documented negative result, and the controls are what made it visible.
- Along the way I caught a reproducibility bug: Gymnasium's action-space random generator wasn't seeded, which made paired comparisons invalid until fixed.
