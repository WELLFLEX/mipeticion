# DIVIPOLA snapshot

The checked-in MGN 2024 snapshot comes from the DANE ArcGIS service. The official `portalgis.dane.gov.co` host serves the same named service as the `geoportal.dane.gov.co` endpoint in the source plan; the latter returned access errors during import.

The importer discovers the municipality layer by name and validates `MPIO_CDPMP = DPTO_CCDGO + MPIO_CCDGO`. ArcGIS `OBJECTID` and layer IDs are never treated as geographic codes. Department and municipality codes stay strings, preserving leading zeros.

All five pilot entities are national, so intake does not collect location for routing. Document city is free text; the snapshot is available for future reviewed geographic routing. It includes territorial units listed in the source, including non-municipalized areas. Never infer current jurisdiction solely from this historical snapshot.

Run `npm run data:geography` to stage a new candidate; compare and approve it manually. Attribution and source terms are separate from the code license; see DATA_LICENSE.md.
