# ZMR-03 provisional full144 DEV/CAL checkpoint

Batch `ZMR-03-CAL144-P0-20260929`; expected main `299e85861b54b4aefa186b53948c0d2ad08a7979`. The single candidate writer authored 144 new ordinary DEV/CAL scenarios after seeing A1/A2 and earlier TRAIN/TUNE. All texts and Topic labels are public, provisional, unreviewed and classified `NON_INDEPENDENT_DEVELOPMENT_EVIDENCE`. `calibration_status=UNFITTED`: no threshold, feature, weight or parameter was selected with this file.

## Data identity and limits

`provisional_cal_v0.1.json` has one provisional single-intent scenario per fixed Catalog Topic, with zh/en/mixed counts 90/36/18. Each row retains Catalog digest, writer/cohort, source, scenario/template family, mechanism, input bundle, provisional state and label, public exposure, license declaration and review status. Concrete scenario/template family IDs are distinct from the existing TRAIN and TUNE versions. The real writer lineage is shared across all of them, so **the split is not independent**, whatever the file names or source IDs say. Gold is a candidate-writer hypothesis; Catalog boundaries are themselves provisional. Accepted independent 01B rows and source cohorts remain zero.

A pre-prediction metadata audit found 144 unique CAL row IDs, Topic IDs, scenario IDs and template IDs. Exact bundle, NFC and NFKC fingerprints are unique within CAL and have zero exact overlaps with TRAIN v0.2, TUNE v0.1 or the 18-row exposed old challenge. A provisional character-trigram Jaccard screen at 0.55 flagged zero predecessor/CAL pairs. The threshold is not a frozen qualification threshold; these mechanical screens do not prove semantic, template or author independence and are not a human source review. No candidate prediction influenced acceptance.

## Calibration boundary and next action

One example per Topic cannot support 144 individual thresholds, and the same writer cannot establish transfer reliability. If this CAL is later used at all, it is only for predeclared low-dimensional global or language-shared development parameters after candidate structure is frozen; provenance must state same-writer, exposed, `NON_INDEPENDENT_DEVELOPMENT_EVIDENCE`. This batch runs **no** scoring, fitting, AS or final TEST. Capability is UNTESTED; resource qualification remains absent. All 144 Topic, 95% assigned precision, 70% coverage/macro, safety and resource hard constraints remain unchanged.

Next author a separately versioned full144 provisional challenge with new concrete scenario/template lineages and pre-prediction audit. Then one changed-closure A1/A2 development comparison may guide at most two recorded mechanism-level repairs per stable candidate, followed by elimination or A3/A4. Independent 01B data acquisition and sealed curator remain a separate qualification path.
