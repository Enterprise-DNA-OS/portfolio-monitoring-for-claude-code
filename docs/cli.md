# Command guide

Use node scripts/portfolio.mjs COMMAND. Append --json for machine output. Options use --key=value; quote values containing spaces. Unknown options and ambiguity exit 1. No command sends, publishes or transfers money.

| Command | Arguments and purpose |
|---|---|
| /help | Show this guide |
| /funds | List funds |
| /add-fund | --name=NAME --actor=NAME |
| /companies | [--fund=NAME] |
| /add-company | --name=NAME --sector=TEXT --country=NZ --currency=NZD --owner=NAME --review-due=DATE --actor=NAME [--source-id=ID] |
| /link-company | COMPANY --fund=NAME --actor=NAME |
| /show | COMPANY |
| /metrics | List metric definitions |
| /add-metric | --name=NAME --unit=money / count / percent / ratio --direction=higher / lower / neutral --actor=NAME |
| /require | COMPANY --metric=NAME --actor=NAME [--target=NUMBER] |
| /open-cycle | --fund=NAME --period=DATE --due=DATE --actor=NAME |
| /collection-week | [--fund=NAME] [--period=DATE] |
| /metrics-due | Missing or unapproved requirements [--fund=NAME] [--period=DATE] |
| /observations | [--company=NAME] [--period=DATE] |
| /record | COMPANY --metric=NAME --period=DATE --value=NUMBER --source=TEXT --actor=NAME --note=TEXT [--currency=NZD] |
| /review | OBSERVATION_ID --decision=approved / changes --actor=NAME --evidence=TEXT |
| /variance | [--company=NAME] |
| /watchlist | Latest approved cash runway by company; no forecasts |
| /attention | Overdue collections, actions and evidence |
| /actions | List open follow-up actions |
| /add-action | COMPANY --title=TEXT --owner=NAME --due=DATE --actor=NAME |
| /close-action | ACTION_ID --evidence=TEXT --actor=NAME |
| /log | COMPANY --note=TEXT --source=TEXT --actor=NAME |
| /updates | [--company=NAME] |
| /privacy | COMPANY --personal=yes / no --review-due=DATE --actor=NAME [--purpose=TEXT --retention=DATE --accuracy=TEXT] |
| /compliance | Operational evidence checks, not certification |
| /insights | Ten questions across collections and evidence |
| /import | fundwave FILE.csv --map=FILE.json --actor=NAME --source=TEXT [--dry-run] |
| /imports | List import receipts |
| /export | --out=FILE.json |
| /history | COMPANY |
| /draft-update | COMPANY; writes a local review brief |
| /weekly-review | Draft the week from collection, attention and compliance |
| /pack | --fund=NAME --period=DATE --actor=NAME; checked local snapshot |
| /packs | List saved snapshots |

Dates are YYYY-MM-DD. Money and ratios use decimal notation, no commas. A company name is an exact case-insensitive match or a unique ID prefix. Review takes an observation ID. Follow docs/replace-fundwave-portfolio.md for mapped imports. Drafts are internal files. Review them before any separate sharing action.
