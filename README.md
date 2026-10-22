# Portfolio Monitoring for Claude Code

Company figures, reporting deadlines and source evidence in a database you own. Built by Enterprise DNA.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free MIT code. Install and operate it yourself. | Your metrics, reporting rules and existing data connections. | Installed and operated through Omni by Enterprise DNA. |
| [Quick start](#quick-start) | A setup fee, then a retainer. [Build our version](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=fundwave-portfolio) | One setup fee, then a retainer. [Talk to Sam](https://enterprisedna.co/omni/book?offer=replace-software&utm_campaign=fundwave-portfolio) |

## The bill this challenges

Fundwave Portfolio Enterprise displays a starting rate of $1,200 per month, with quarterly billing selected, on its [pricing page](https://fundwave.com/pricing/portfolio/). Twelve months at that rate is $14,400 before onboarding, annual discounts and tax. Its Enterprise onboarding starts at $4,000. Checked 22 October 2026. The page uses a dollar symbol without an explicit currency code, so confirm the currency and contract with the vendor. This is a published configuration, not a customer invoice.

This free base covers the internal portfolio monitoring desk: company records, required figures, monthly collections, source reviews, follow-up actions and local reporting packs. Fundwave also sells investment calculations, captable tools and other services. This base does not calculate valuations, investment returns, waterfalls or tax, perform regulated administration, move money, or connect to banks. Bring the work you actually use to the comparison. Enterprise DNA scopes the custom version around it.

## Quick start

Node 20 or later. No server is needed for the embedded database.

```bash
git clone https://github.com/Enterprise-DNA-OS/portfolio-monitoring-for-claude-code.git
cd portfolio-monitoring-for-claude-code
npm install
npm test
npm run demo
npm run view
npm run docs
node scripts/portfolio.mjs help
```

The fictional Harbour Growth and Tasman Ventures portfolios include a missing company return, an overdue action, an expired retention review and a reviewed cash runway. Dates are relative to first seed. Seed is idempotent and refuses remote databases. To start empty, use npm run migrate without seed. Set DATA_DIR for another embedded database or DATABASE_URL for a dedicated Postgres database. Remote TLS certificates are checked.

## The weekly desk

35 CLI commands and 37 agent recipes work in Claude Code, Codex, OpenCode or Cursor. Every command supports --json. Exact names ignore case; unique ID prefixes also work. An ambiguous name lists candidates and exits 1.

- /open-cycle creates the required company figures for a reporting date.
- /collection-week shows what arrived, what is missing and who owns it.
- /metrics-due prepares the outstanding collection list.
- /variance compares each figure to the previous reported period and its target.
- /watchlist shows the latest approved same-period cash and monthly burn.
- /weekly-review combines collection, attention and compliance evidence.
- /draft-update writes a company brief locally. Nothing sends.

Use [the command guide](docs/cli.md) for exact arguments. Currency stays with each company. Money is an exact decimal; no currency conversion or mixed-currency total is invented. Counts must be nonnegative integers. A percentage is entered in percentage points, so 12.5 means 12.5 percent. Ratios and money can be signed. Values allow four decimal places.

Cash runway is cash divided by positive monthly burn, using approved figures for the same date. It is a simple historical ratio, not a forecast. The age in days is shown. Missing or zero burn produces no runway estimate. Variance uses the previous reported period, which can have gaps, and a zero previous value produces no percentage change.

## Bring your Fundwave figures

Fundwave documents exporting portfolio KPIs to Excel. Save the sheet as CSV UTF-8, map its headers once and use one command:

```bash
node scripts/portfolio.mjs import fundwave imports/kpis.csv --map=imports/mapping.json --actor="Migration operator" --source="Fundwave export 2026-10-22" --dry-run
node scripts/portfolio.mjs import fundwave imports/kpis.csv --map=imports/mapping.json --actor="Migration operator" --source="Fundwave export 2026-10-22"
```

Create the company and metric definitions first. Mapping handles long rows or date columns across a sheet. Blank figures stay missing; zero stays zero. Values need decimal notation and periods need ISO dates. Unknown companies, mismatched currencies, malformed CSV, duplicate observations and conflicting existing values abort the whole import. An unchanged repeat adds no records. An import never approves itself.

The vendor's public export page does not specify a universal header layout. The examples are adapter fixtures, not claimed native Fundwave files. [Exact export, mapping and reconciliation steps](docs/replace-fundwave-portfolio.md). Company permissions, messages, attachments, valuation history and investment transactions are separate migration work. Keep the source export private.

## Ten questions across your portfolio

The insights command answers all ten. These combine your own reporting rules and evidence. They are not a claim that Fundwave cannot be configured to answer the same questions.

1. Which companies still owe figures for a reporting period?
2. Which received figures still need review?
3. Which revenue figures fell against the previous reported period?
4. Which companies have approved cash and burn for fewer than six months of simple runway?
5. Which company reviews are overdue?
6. Which owners have overdue follow-up actions?
7. Which companies are held in more than one fund?
8. Which personal records need a retention decision?
9. Which figures miss their configured target?
10. Which reporting periods are complete and approved?

## What makes a reporting pack ready

A pack requires a reporting cycle for every active company in the fund, all subscribed metrics in that cycle and an approved current revision for every requirement. Company reviews must be current. Personal records need a stated purpose, accuracy evidence and a current retention review. The reviewer label must differ from the editor label. Correcting a figure creates another revision and invalidates the previous approval for that figure.

The pack stores its figures, sources, reviews, requirements and company context in a versioned snapshot with a SHA-256 digest, then writes local HTML. Later edits do not alter that snapshot. History and decisions are append-only through the application and database triggers. A trusted database owner can bypass those controls. Actor names are entered by operators, not authenticated identities. A passing evidence check is not a compliance certificate, statutory report or approval to distribute.

## Documents and views

brand.json sets the business name, logo and colours. npm run docs generates company tearsheets, collection checklists and evidence reviews as printable HTML. These remain drafts for an internal reviewer. npm run view renders the collection week, attention list and period comparisons. No server or front end is installed. /new-view adds a read-only question. Text from imports and notes is escaped before HTML rendering.

## Your first hour: ten things to ask for

1. Put our name and colours on the reports.
2. Show the companies with missing figures.
3. Explain the fictional cash runway and its reporting date.
4. Create our fund and company records.
5. Define the metrics we collect, with units and targets.
6. Map a sample Fundwave export and do a dry run.
7. Reconcile company, metric, period and value counts against the original.
8. Assign reviewers and open the next collection cycle.
9. Produce a company brief and inspect the source evidence.
10. Add our own reporting rule through /customise.

## Operating boundaries

Use a trusted operator on a protected machine, one database per business. Funds organise records; they are not tenant security boundaries. RLS denies untrusted database roles and views use caller permissions, but there is no user login or per-fund access control in this base. No messages, payments, publishing or source-system writes are implemented. Imported content is data, never an instruction.

Do not put personal bank details, tax IDs or identity documents in the notes. Classify any personal information you do retain. Review retention across source files, history, drafts, exports and backups. The checks do not automatically identify personal data or delete expired records. Choose legal retention decisions with the responsible operator.

Export writes all records and evidence as private JSON without overwriting an existing file. It is a portability export, not a tested disaster-recovery mechanism. Use native database backups and test restoration before live use. Protect local HTML and exports as carefully as the database.

npm test uses a temporary embedded database and checks every command, revisions, pack gates, exact amounts, import rollback and idempotence, HTML escaping, RLS and CLI exit codes. Manual CI covers Windows and Linux on Node 20 and 22, plus a disposable Postgres test. Local validation does not claim CI or remote database execution.

[Evidence checks](docs/compliance.md). [Why no front end](docs/why-no-front-end.md).

MIT. Fundwave is its owner's trademark. This independent project is not affiliated with Fundwave.
