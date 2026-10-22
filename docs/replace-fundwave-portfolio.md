# Switch your portfolio monitoring records

The supported path is Fundwave's portfolio KPI Excel export, saved as CSV UTF-8, with an explicit mapping. This import covers metric observations for companies already registered in this database. It does not claim to import a complete Fundwave instance.

## Export and keep the original

Fundwave's [portfolio release notes](https://fundwave.com/portfolio-management-software/newsletter/) describe the metrics overview and exporting portfolio KPIs to Excel under “All Metrics, Together!” (March 2019). The current [portfolio feature page](https://www.fundwave.com/features/portfolio-management-software/) describes metric definitions and collecting figures, files and text. Both pages were opened on 22 October 2026. The export article is historical documentation; confirm the available export in your account.

Export the required companies, metrics and periods from the metrics overview. Keep the original workbook as evidence. Save the relevant worksheet as CSV UTF-8. Remove title and total rows, preserve one header row, and convert dates to YYYY-MM-DD and values to decimal notation without thousands separators or currency symbols. Save formula results as values. Do not include bank or identity fields.

## Prepare the receiving records

Run add-fund, add-company and link-company for the reporting universe. Create the metrics with add-metric, selecting money, count, percent or ratio. Company currency is explicit; money imports must name that same currency. Use require to select each company's required figures, then open-cycle for the reporting period and due date. Import itself can retain history before a reporting cycle exists.

Company and metric names match exactly without case. If two companies share a name, place the receiving company's unique ID in the mapped company column. Partial IDs must be unambiguous. Source IDs are retained in profiles but are not inferred as matching keys.

## Map the actual headers

The public documentation does not establish one fixed native header layout. Map your actual sheet. These examples are adapter examples, not vendor exports.

Long layout mapping:

```json
{"company":"Company","metric":"Metric","period":"Period","value":"Value","currency":"Currency"}
```

Wide layout mapping, for a sheet with a separate column for each reporting date:

```json
{"company":"Company","metric":"Metric","currency":"Currency","columns":[{"header":"September 2026","period":"2026-09-30"},{"header":"August 2026","period":"2026-08-31"}]}
```

The company and metric columns are always required. A money row needs a currency column. Each value must be a number in base units, not thousands or millions: convert the workbook values before importing if its display uses scaling. Do not map a total or an “as at” label to a numeric value. Non-money currency cells are ignored. Blank value cells remain missing. Negative cash or revenue is preserved; a negative or fractional count is rejected. Up to four decimals are accepted. Parenthesised negatives, percentages with a percent sign and scientific notation require deliberate normalisation in the source copy.

## Preview, import, reconcile

```bash
node scripts/portfolio.mjs import fundwave imports/kpis.csv --map=imports/mapping.json --actor="Migration operator" --source="Fundwave export 2026-10-22" --dry-run
node scripts/portfolio.mjs import fundwave imports/kpis.csv --map=imports/mapping.json --actor="Migration operator" --source="Fundwave export 2026-10-22"
node scripts/portfolio.mjs observations --json
node scripts/portfolio.mjs imports --json
```

The dry run executes the same validations inside a rolled-back transaction. A real import is atomic. A conflict never overwrites a local value. Review it and use record with an explanation if a correction is warranted. Every imported value records its source reference and CSV row number. Imported figures remain unreviewed until an independent reviewer label records evidence.

Compare counts by company, metric and reporting period, then compare exact values and currencies to the saved workbook. Check blank rows, scaling and the selected export filters. Review a sample reporting pack with the existing process before a switch. “One command” means one mapped metric import after this setup, not a migration of every Fundwave module.

## Separate work

Company setup, permissions, attachments, message history, source audit trails, captable transactions, currency conversions, cashflow returns and valuation logic do not arrive through this metric import. They need their own agreed migration scope. The free base produces internal monitoring documents; it does not replace regulated fund administration. Keep Fundwave and the original documents until the responsible team has reconciled the monitoring records and accepted the replacement workflow.
