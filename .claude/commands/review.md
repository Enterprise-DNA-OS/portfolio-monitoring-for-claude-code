---
description: Review for the portfolio monitoring desk
---

# review

Read CLAUDE.md. Run node scripts/portfolio.mjs review with OBSERVATION_ID --decision=approved|changes --actor=NAME --evidence=TEXT. Use --json to inspect full records. Resolve missing input from the user's request and the existing records; never guess a figure, source, actor or evidence. Use a unique ID when names clash.

Confirm the exact observation and recorded evidence; use a reviewer label different from its editor.

Present the reporting period, currency, review state and source where relevant. Missing data stays missing. Local output is a draft for review and must never be sent or published by this recipe.
