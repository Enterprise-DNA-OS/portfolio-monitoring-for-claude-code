# Portfolio evidence checks

This is an internal review aid for portfolio monitoring. It does not determine legal compliance, investment suitability, valuations, statutory disclosures, tax, AML status or fund accounting. Sources checked 22 October 2026.

| Check | Basis | Implemented behaviour |
|---|---|---|
| Personal-data accuracy | [NZ Privacy Act principle 8](https://www.privacy.org.nz/privacy-principles/8/) requires reasonable accuracy checks before use or disclosure | Personal company records need accuracy evidence and a current company review before a pack. Evidence is operator-supplied, not independent verification. |
| Purpose and retention | [NZ Privacy Act principle 9](https://www.privacy.org.nz/privacy-principles/9/) limits retention to lawful purposes | Require a purpose and an operator-chosen retention review date. Expired or missing decisions appear in compliance and block a pack for that company. No fixed retention term is invented. |
| Complete reporting cycle | House rule | Every active company in a fund needs requirements for the selected period, including all currently subscribed metrics. Every requirement needs an approved current figure. |
| Independent review | House rule | Reviewer and editor labels must differ after case and whitespace normalisation. Labels are not authenticated people. |
| Revision integrity | House rule | Observations and decisions are append-only. Correcting a value creates a new unreviewed revision. Superseded observations cannot receive a new review. |
| Currency and units | House rule | Money uses the company's declared currency and exact decimal storage. Counts are nonnegative integers. No mixed-currency totals, investment returns or implied exchange rates. |
| Data lineage | House rule | Each figure has a source reference, operator and explanation. A reporting pack retains a snapshot and content digest. |
| No outward action | House rule | Briefs, checklists and packs are local files. No email, sharing portal, filing or payment command exists. |

The NZ principles apply where the Privacy Act applies. An Australian business must map its applicable obligations before live use. This base makes no claim to implement every Australian Privacy Principle. A privacy review date is an operational decision date, not a statutory deletion deadline. Classify personal records manually and review source exports, immutable history, local documents and backups under the agreed retention process.

A database owner remains trusted and can bypass triggers and row-level security. The base has no identity service, multi-user access model or per-fund security boundary. Use separate databases for separate businesses. A clean check is evidence of these data checks only, never a legal certificate or permission to send a report.
