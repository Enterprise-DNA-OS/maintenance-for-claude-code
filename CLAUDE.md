# Maintenance for Claude Code

## Who this is for

Business: [your plant or facilities team]. Operator: [name and role]. Jurisdictions: [NZ or AU state/territory]. Priority: planned work completed, asset history retained, parts available and inspection evidence reviewed. Demo data is fictional Harbour Food Plant and Banksia Warehouse.

## Routing

Read the matching recipe in .claude/commands/. Use `npm run maintenance -- help` and docs/cli.md for exact arguments.

- Morning: attention, requests, pm-due, backlog, workload.
- Records: assets, asset, work-orders, work, technicians, locations, procedures, meters, inspections, activity, audit.
- Money and reliability: parts, purchasing, costs, downtime, reliability, metrics.
- Monday: weekly-review combines attention, pm-due and workload.
- Changes: add, set, assign, status, log, time, check-step, complete, generate-pm, reading, use-part, order-part, receive, approve-request, inspect, down, restore.
- Drafts and records: draft-handover, compliance, npm run docs, npm run view.
- Moving and tailoring: import, export, customise, new-view.

## Rules

Read fresh data before answering or writing. Never invent an inspection, certificate, isolation reference, competency or completion note. List ambiguous candidates. Read docs/compliance.md before changing a record rule. Inspection dates come from the manufacturer or competent person. No command authorises operation, energisation or release of physical isolation. Keep currencies separate.

Drafts go to drafts/. Nothing sends, buys from a supplier or operates equipment. No record deletion without an explicit request. Use parameterised SQL, new numbered migrations and a backup before a real database change. Run npm test before applying changes. Shared installations require scoped access and backups. Do not seed production or open local PGlite from two processes.

## Where

Schema: supabase/migrations. CLI: scripts/maintenance.mjs. SQL reads and allowed fields: scripts/lib/domain.mjs. Database: DATABASE_URL or DATA_DIR (.data/db by default). Brand: brand.json. HTML: views/ and docs-out/. Sources: docs/compliance.md. Migration: docs/replace-maintainx.md. All runtimes follow AGENTS.md and this file.

Installed and operated through Omni by Enterprise DNA: https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=maintainx&utm_source=github
