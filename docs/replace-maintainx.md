# Bring your MaintainX history

Sources checked 26 September 2026: [work order exports and columns](https://help.getmaintainx.com/export-work-order-data), [asset exports](https://help.getmaintainx.com/view-and-export-asset-data), [pricing](https://www.getmaintainx.com/pricing).

Use the MaintainX web app and an administrator account. Work-order CSV export requires Premium or Enterprise. In Work Orders, switch to the list's table view and export CSV. That route is limited to 200 orders per export; Reporting > Export Data supports date-range exports. Include IDs, names, assets, assignees, status and dates. Export assets from the Assets module as a separate CSV. Keep the original files and attachments in a secure archive.

## One command per export

Start with a new DATA_DIR, run npm run migrate, and add the locations and technicians referenced by your exports. Each organisation gets a stable --org key because vendor IDs can overlap. Never seed real records with the demo.

```bash
npm run maintenance -- import maintainx assets assets.csv --org=harbour
npm run maintenance -- import maintainx assets assets.csv --org=harbour --apply
npm run maintenance -- import maintainx work-orders work-orders.csv --org=harbour
npm run maintenance -- import maintainx work-orders work-orders.csv --org=harbour --apply
```

Default is a test run: the entire transaction rolls back. The report shows new records, existing IDs and fields kept only in the original record. The applied import is atomic too. Existing IDs are skipped without overwriting local work. A repeated file creates no duplicates; updates to previously imported records require a reviewed mapping.

## What maps

Asset ID or ID becomes the organisation-scoped external ID. Name, Asset Name or Asset supplies the asset name. Location must match a pre-created location; Serial Number or Serial maps to serial.

Work orders prefer Global ID, falling back to ID. Title, Status, Priority, Work Type, Description, Due Date and Completed on map directly. Asset ID links to the imported asset; Asset name is a fallback only when no ID exists. Assigned to matches one existing technician. Multiple assets or assignees require a deliberate mapping, never an arbitrary first match. Completed exports need Completed on and retain missing evidence as missing.

ISO dates are accepted. Slash-form dates require --date-order=dmy or --date-order=mdy. Other date forms fail with an actionable message. Timestamp fields map to the calendar date; original precision remains in source_data. Check the organisation's timezone before approving dates.

Every source column remains in source_data, including custom fields. Unknown statuses, bad dates, missing relationships, malformed CSV and duplicate IDs fail the whole import. Sample files in fixtures/ use documented vendor headings and fictional records; they are not captured customer exports.

## What needs mapping

Procedures and signatures, maintenance-plan recurrence, meter triggers, locations beyond the supplied name, cost summaries, parts, purchase orders, attachments and multi-asset relationships are not reconstructed from one work-order file. Their exported values remain in source_data. No files are downloaded from attachment URLs, and links can require the old login. Export and archive those documents while access remains available. Enterprise DNA maps the additional exports for your version.

Compare counts and several known completed and overdue jobs. Check dates, assignments, plant references and the compliance report. Keep MaintainX available until the migration is reconciled. Aim to import the supported core records in a day; the full move depends on data quality and your mappings.

## Take it out again

`npm run maintenance -- export exports/snapshot.json` writes every domain record, source field and audit entry. It refuses to overwrite an existing file. Protect it as business data. It is a portable JSON snapshot, not an automatic restore utility. Use database backups for disaster recovery.
