---
description: Add company for the portfolio monitoring desk
---

# add-company

Read CLAUDE.md. Run node scripts/portfolio.mjs add-company with --name=NAME --sector=TEXT --country=NZ --currency=NZD --owner=NAME --review-due=DATE --actor=NAME [--source-id=ID]. Use --json to inspect full records. Resolve missing input from the user's request and the existing records; never guess a figure, source, actor or evidence. Use a unique ID when names clash.



Present the reporting period, currency, review state and source where relevant. Missing data stays missing. Local output is a draft for review and must never be sent or published by this recipe.
