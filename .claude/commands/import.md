---
description: "Import from the maintenance records"
---
# Import

Read CLAUDE.md and docs/cli.md. Use fresh data, resolve names, and run:

```bash
npm run maintenance -- import maintainx assets|work-orders <file.csv> --org=site [--date-order=dmy|mdy] [--apply]
```

Read docs/replace-maintainx.md. Run without --apply first. Report counts, unmapped fields and failures. Apply only the agreed file to the intended database.

Report the result in plain language. Keep currencies separate. For record changes, read the affected records first, use the operator's facts and show the resulting record. Ambiguous names list candidates and exit 1. Never invent evidence, change isolation controls or certify a machine as safe.
