---
description: Import for the portfolio monitoring desk
---

# import

Read CLAUDE.md. Run node scripts/portfolio.mjs import with fundwave FILE.csv --map=FILE.json --actor=NAME --source=TEXT [--dry-run]. Use --json to inspect full records. Resolve missing input from the user's request and the existing records; never guess a figure, source, actor or evidence. Use a unique ID when names clash.

Read docs/replace-fundwave-portfolio.md. Run the same mapped import with --dry-run first, inspect counts and conflicts, then apply the authorised import.

Present the reporting period, currency, review state and source where relevant. Missing data stays missing. Local output is a draft for review and must never be sent or published by this recipe.
