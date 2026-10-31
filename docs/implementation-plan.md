# Cart Item Validation: Implementation Plan

The gap IDs (G-x) and question IDs (Q-x) are defined in [requirements-and-solution-design.md](requirements-and-solution-design.md).

## 1. Done

| # | Task | Result |
| --- | --- | --- |
| 1 | Planned with CDA (Blueprint v6, then v7) | Design agreed |
| 2 | Scaffolded the app with the Adobe Commerce SDK (three extension points) | App structure in place |
| 3 | Built the webhook actions and helpers | Add, save and merge validation |
| 4 | Built the settings: App Management form and the custom Admin page | Two screens, same values |
| 5 | Restructured folders: `actions/lib/`, `actions/webhook/`, root `test/`, lowercase `docs/` | Old copies removed; build passes |
| 6 | Wrote unit tests | 18/18 pass |
| 7 | Deployed to the Stage workspace | Actions and Admin UI live |
| 8 | Created the GitHub repository and the feature branch | Code pushed |
| 9 | Fixed gaps G-1, G-2, G-5, G-6, G-10, G-11 | Agreed message, documented payload keys, fail-open on bad payload, webhook timeout/fallback, new tests |

## 2. To do (in order)

| # | Task | Gap | Done when |
| --- | --- | --- | --- |
| 1 | Confirm with the client: Q-1 (message wording) and Q-2 (cart total) | G-3 | Answers written down |
| 2 | Push this per-line version to an archive branch | - | Branch on GitHub |
| 3 | Create a new branch and build the cart-total rule | G-3 | New tests pass |
| 4 | Fix the App Management association and install the app | G-8 | Three webhooks active |
| 5 | Run the sandbox tests | G-4, G-7 | Results in [verified-contracts.md](verified-contracts.md) |
| 6 | Open the pull request to `main` | G-9 | PR has code, README, setup and test evidence |
| 7 | Address review comments | - | All blocking comments closed |
| 8 | Demo and handoff | - | Demo done |

## 3. Rollback

- **Code:** revert the commit, rebuild and redeploy.
- **Live:** set **Enabled = No** in the App Management settings (see the [runbook](cart-item-validation-runbook.md)).
