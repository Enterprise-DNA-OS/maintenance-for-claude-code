# Maintenance CLI

Run `npm run maintenance -- help`. Every read returns human tables by default. Append `--json` for structured results. Quote names with spaces. Exact names are case-insensitive; otherwise names and partial IDs are matched. Ambiguity lists candidates and exits 1. Failures roll back each write transaction. Successful writes add an audit record. The audit is a working log, not a tamper-proof ledger.

## Read commands

- `locations`
- `technicians`
- `assets`
- `work-orders`
- `attention`
- `pm-due`
- `meters`
- `parts`
- `purchasing`
- `requests`
- `procedures`
- `backlog`
- `workload`
- `costs`
- `downtime`
- `reliability`
- `metrics`
- `inspections`
- `audit`
- `activity`
- `compliance`
- `weekly-review`

## Record commands

- `asset "Packing Conveyor"`
- `work "Replace conveyor bearing"`
- `add <entity> --field=value`
- `set <entity> <name-or-id> --field=value`
- `assign <work> <technician>`
- `status <work> open|in_progress|on_hold|cancelled`
- `log <work> "note"`
- `time <work> <technician> <hours> "note"`
- `check-step <step> pass|fail|na "evidence" "checked by"`
- `complete <work> "completion evidence"`
- `generate-pm`
- `reading <meter> <cumulative-value>`
- `use-part <work> <part> <quantity>`
- `order-part <part> <quantity> YYYY-MM-DD --name=PO-unique`
- `receive <purchase-order>`
- `approve-request <request> YYYY-MM-DD`
- `inspect <asset> --inspector="name" --next-due=YYYY-MM-DD --result=pass --evidence="certificate reference"`
- `down <asset> "reason"`
- `restore <asset> "return-to-service evidence"`
- `draft-handover <work>`
- `import maintainx assets|work-orders <file.csv> --org=site [--date-order=dmy|mdy] [--apply]`
- `export exports/snapshot.json`

## Adding and changing records

Entities: location, technician, asset, meter, schedule, work, part, request, step. Field names are listed in scripts/lib/domain.mjs. Unknown fields fail. Use `null` to clear an optional field. Reference fields accept the linked record's name or partial ID.

```bash
npm run maintenance -- add location --name="North Store" --jurisdiction=NZ
npm run maintenance -- add technician --name="Jo Smith" --weekly-hours=32 --rate=65 --currency=NZD --competency-ref="Approved site record JS" --competency-until=2027-01-31
npm run maintenance -- add asset --name="Store Fan" --location-id="North Store" --inspection-due=2026-12-01 --interval-source="Manufacturer instruction rev 2"
npm run maintenance -- add work --title="Fan vibration check" --asset-id="Store Fan" --technician-id="Jo Smith" --due-date=2026-12-01
npm run maintenance -- set work "Fan vibration check" --isolation-ref="Site isolation record 145"
```

Dates above are examples, never prescribed deadlines. Record your competent person's actual authorisation and maintenance interval. `inspect` requires current competency evidence. A failed inspection marks the asset down. A later pass does not restore it automatically; `restore` requires an explicit evidence note. None of these records operate physical equipment or release a site isolation.

`generate-pm` opens due calendar or cumulative-meter work within the next seven days, once per schedule. A meter-triggered order is due today. Completing it advances the next calendar date from completion and the next meter threshold from the latest reading. This is a local completion-based scheduling policy, not a statutory interval. Configure both a meter interval and threshold together. Pending or failed steps block completion. Repeated completion and receiving a purchase twice fail.

Stock changes use `use-part` or `receive`; imported opening balances can be added once. `set` cannot change stock or meter readings. `reading` accepts only cumulative increases. Meter replacement needs a separate meter record. Purchase receipts are for the full quantity; partial receipts require separate orders. One part has one currency and one stock pool. Different sites can use different part records and SKUs.

## Calculations and scope

Workload sums max(estimated hours minus logged hours, zero) for open work due within seven days or without a date. It does not subtract future weeks or account for leave. Costs are recorded labour hours times the rate at entry, plus part quantities times cost at use. Each currency stays separate; no exchange rates are assumed. Purchasing commitments are shown separately from consumed maintenance costs.

Reliability counts recorded reactive orders and recorded downtime. It is not MTBF without complete operating-hour and failure histories. Metrics mean elapsed hours is creation-to-completion, not active repair time. On-time completion uses the recorded due date. Filters and custom analyses can be added to your own database without buying another reporting plan.

The base does not implement live sensors, photo capture, a request portal, message delivery, SSO, mobile/offline entry or individual permissions. Shared installations need scoped database roles, network controls, backups and an agreed operating process. HTML views are dated snapshots.
