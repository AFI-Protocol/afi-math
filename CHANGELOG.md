# Changelog

All notable changes to `@afi-protocol/afi-math` are documented here.
This project adheres to [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2026-06-29

### Added
- Canonical emissions schedule: `src/emissions/emissionsSchedule.ts`
  (`buildEmissionsSchedule`, `EmissionsParams`, `EmissionsSchedule`),
  the three-phase front-loaded emissions model derived from
  `AFI_Emissions_Final.wl`. Re-exported as `emissions` from the package root.

### Fixed
- ESM: relative re-exports in `src/index.ts` now carry explicit `.js`
  extensions so the compiled `dist/index.js` resolves under Node's native
  ESM loader. Previously `import { emissions } from "@afi-protocol/afi-math"`
  threw `Cannot find module .../dist/timeValue/timeValue` in Node-ESM
  consumers (the package is `"type": "module"`), making the library
  unusable outside of bundlers/vitest.

This is the first tagged release. Downstream consumers (e.g. `afi-core`,
which derives `totalRewardPool` from the emissions schedule) should pin to
the `v0.2.0` tag rather than a raw commit SHA.

## [0.1.0]

### Added
- Initial library: time value of money, curve primitives, reverse DCF
  valuation, and signal decay models.
