# Maintenance for Claude Code

Your plant, work orders, preventive schedules, parts and inspection evidence in a database you own. Free MIT-licensed software for maintenance teams at NZ and AU plants, warehouses and facilities. Runs with Claude Code, Codex, OpenCode or Cursor.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free. Clone, run the demo, import your history. | Your fields, rules, MaintainX records, web front end or different stack. | Installed, connected and operated through Omni by Enterprise DNA. Setup fee, then a retainer. |
| [Quick start](#quick-start) | [Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=maintainx&utm_source=github&utm_medium=customise) | [Book a call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=maintainx&utm_source=github&utm_medium=managed) |

## What the team does each week

Triage requests, plan preventive work, assign the backlog, chase ordered parts and review inspection gaps. This base includes plant and location records, technicians, cumulative meters, preventive schedules, work orders, procedures, requests, stock, purchases, labour, downtime, inspections and an audit log. Every write uses the CLI; nothing sends messages or controls equipment.

The fictional Harbour Food Plant has an overdue conveyor bearing job waiting for parts, a compressor past its service meter threshold, a stale reading, an unassigned leak investigation and a late purchase. Banksia Warehouse has a hoist missing inspection details and a technician whose competency evidence expired. Demo dates move with the first seed. Re-seeding does not reset existing records.

## Quick start

Node 20 or later on Windows or Linux:

```bash
git clone https://github.com/Enterprise-DNA-OS/maintenance-for-claude-code.git
cd maintenance-for-claude-code
npm install
npm run demo
npm test
npm run view
npm run docs
```

No database server is needed. PGlite stores local records under .data/db. For real records, use a fresh DATA_DIR, migrate and import. Do not seed a real installation. For shared Postgres, set DATABASE_URL using .env.example. Hosted TLS verification is enabled. Configure scoped database access, backups and network controls before sharing. Local PGlite is for one process at a time.

Open the folder in your coding agent and ask “Which maintenance jobs need attention?” AGENTS.md points every runtime to the same instructions. Slash recipes live in .claude/commands/.

## Commands

- `/locations`
- `/technicians`
- `/assets`
- `/work-orders`
- `/attention`
- `/pm-due`
- `/meters`
- `/parts`
- `/purchasing`
- `/requests`
- `/procedures`
- `/backlog`
- `/workload`
- `/costs`
- `/downtime`
- `/reliability`
- `/metrics`
- `/inspections`
- `/audit`
- `/activity`
- `/compliance`
- `/weekly-review`
- `/asset`
- `/work`
- `/add`
- `/set`
- `/assign`
- `/status`
- `/log`
- `/time`
- `/check-step`
- `/complete`
- `/generate-pm`
- `/reading`
- `/use-part`
- `/order-part`
- `/receive`
- `/approve-request`
- `/inspect`
- `/down`
- `/restore`
- `/draft-handover`
- `/import`
- `/export`
- `/customise`
- `/new-view`

[The CLI guide](docs/cli.md) covers arguments, fields and calculations. Commands return human tables or --json. Partial IDs and case-insensitive names work; ambiguous matches list candidates and exit 1. Completion requires current technician evidence, the recorded isolation reference when required, and resolved procedure checks. Parts cannot go negative. Receiving a purchase twice fails. Preventive generation creates only one active job per schedule.

## Ten questions beyond a fixed dashboard

Each question has a working command today. MaintainX offers custom reporting too; this is a set of queries you own and can change, not a claim that its reports cannot answer them.

1. Which overdue jobs are unassigned, on hold or quiet for a week? `/attention`
2. Which services are due by date or by operating hours? `/pm-due`
3. Which technicians have more planned work than weekly capacity? `/workload`
4. Which assets have repeat reactive jobs and recorded downtime? `/reliability`
5. What has each job consumed in parts and labour, by currency? `/costs`
6. Which parts are below the stock level we chose? `/parts`
7. Which ordered parts are late and what is still committed? `/purchasing`
8. Which inspections lack a date, a source or current evidence? `/compliance`
9. Which completed jobs were on time and how long did they take? `/metrics`
10. What changed on a work order before the next shift took over? `/work`

## Your first hour: ten things to ask for

1. Put our name, logo and colours on the job cards.
2. Add our sites and plant register.
3. Import one MaintainX asset export as a test run.
4. Map our technicians and check their evidence dates.
5. Show overdue jobs without an owner.
6. Set our real preventive intervals with source references.
7. Draft a shift handover for the bearing repair.
8. Add our production-line code as a field and migrate it.
9. Compare recorded downtime and costs by asset.
10. Add a read-only weekly view for our site manager.

## Documents and views

Change brand.json once. `npm run docs` creates draft job cards, plant service records and purchase orders in docs-out/. `npm run view` creates maintenance-week and plant-spend snapshots in views/. Logo paths should be absolute or data URLs. Every document is keyed by record ID. Print HTML to PDF from a browser. Nothing sends. `/new-view` adds an operator's question to the same read-only renderer.

## Checks and migration

[Source-backed record checks](docs/compliance.md) cover due inspections, interval references, AU plant registration references, technician evidence, isolation references, procedure failures, completion evidence, stale meters and failed inspections. A clean record check does not certify safety or legal compliance.

[Moving from MaintainX](docs/replace-maintainx.md) explains the CSV export, plan restrictions, one-command import, test runs, duplicate handling and what requires mapping. The free importer handles asset and work-order exports and keeps every original column. Procedures, costs, recurrence and attachments need separate mapping before they become operational records.

[Why no front end](docs/why-no-front-end.md) covers mobile, offline and live-connection needs. Enterprise DNA builds those into your custom version. The base does not promise feature parity with every MaintainX tier.

## Verification and operations

`npm test` uses a temporary database and exercises every command, with assertions for preventive scheduling, costs, stock, repeated receipts, safety evidence, ambiguous names, import rollback, repeat imports and HTML output. It needs no secrets. The suite runs the shared SQL on PGlite; hosted Postgres uses the same adapter interface and SQL but needs installation-specific validation. Protect exports and source evidence as business data.

## Licence and relationship

MIT. Not affiliated with MaintainX or Anthropic. Hosting and agent usage have separate costs. [Omni by Enterprise DNA](https://enterprisedna.co/omni/instead-of/maintainx?utm_source=github&utm_medium=readme&utm_campaign=maintainx) installs, customises and runs your version. [Book 30 minutes with Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=maintainx&utm_source=github&utm_medium=readme).
