# Maintenance record checks

These checks identify record gaps for a site competent person to review. They do not inspect machinery, issue certificates, release isolations, establish every legal duty or prove compliance. Manufacturer instructions and local rules determine intervals; this software does not invent universal inspection periods. Sources checked 26 September 2026.

## Sources

- NZ: [WorkSafe, Safe use of machinery](https://www.worksafe.govt.nz/topic-and-industry/machinery/safe-use-of-machinery/). Follow its inspection, maintenance and isolation guidance alongside the applicable HSWA duties. Parts of this guide retain older legislative references; it is not a complete statement of current law.
- AU: [Safe Work Australia, plant WHS duties](https://www.safeworkaustralia.gov.au/safety-topic/managing-health-and-safety/plant-supply-design-and-registration/whs-duties).
- AU: [Model Code of Practice, managing risks of plant](https://www.safeworkaustralia.gov.au/sites/default/files/2022-03/Model%20Code%20of%20Practice%20-%20Managing%20the%20risks%20of%20plant%20in%20the%20workplace%202021.pdf), maintenance and record keeping, including model regulations 213 and 237. Check adoption and any different requirements with your state or territory regulator, including Victoria's separate framework.

## INSPECTION-DUE

Flags active assets with no inspection date or a date in the past. A local tracking control supporting the NZ and AU guidance above. It checks the recorded due date, not a universal legal interval.

## INTERVAL-SOURCE

Flags missing manufacturer or competent-person references. Record where each date came from. This is a local evidence control informed by maintenance guidance, not a test that a chosen interval is correct.

## AU-REGISTER

Flags assets marked registered plant at AU sites without a registration reference. Model regulation 237 covers records for registered plant while used or until control is relinquished. This checks one field only; registration obligations and retention must be verified with the jurisdiction. Retain the underlying certificates and history separately. The base has no automatic deletion or retention expiry.

## COMPETENCY

Flags assigned workers with missing or expired site competency evidence. The operator chooses the authorisation end date. The software does not assess competence or prescribe an annual renewal. Local authorisation policy supports competent-person maintenance requirements.

## ISOLATION

Flags started or completed work on assets marked isolation-required without an isolation reference. WorkSafe guidance requires isolation procedures; a reference is only evidence tracking. Local policy blocks starting or completing these jobs until it is recorded. Never use this record as authority to remove a physical lock or energise equipment.

## PROCEDURE-FAIL

Flags failed checks, plus unfinished checks on completed work. A local control. New completion is blocked unless every check has pass or justified not-applicable, evidence and an identified checker.

## COMPLETION-EVIDENCE

Flags completed work without a completion note, including imported history. A local evidence check informed by the record-keeping guidance. Imports keep historical facts intact and do not invent a sign-off.

## METER-STALE

Flags meters with no reading in seven days. This is demo site policy only, with no statutory seven-day claim. Adjust to the manufacturer's operating plan.

## INSPECTION-FAIL

Flags an asset whose latest recorded inspection failed. Failed inspections mark it down; restoration requires a later recorded pass and a separate return-to-service evidence note. This is a local operational record control, not physical interlocking or legal certification.
