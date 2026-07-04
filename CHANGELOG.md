# Changelog

All notable changes to `@afi-protocol/afi-math` are documented here.
This project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Emissions schedule test suite (`tests/emissions.test.ts`) covering golden-vector
  conformance, cap behavior, milestone epochs, per-phase monotonicity (including
  the intended upward steps at phase boundaries), zero/first/high epoch
  boundaries, determinism, and invalid-input characterization. This closes the
  previously untested gap on the most tokenomics-critical module.
- Deterministic emissions golden vectors (`tests/goldens/emissions.golden.json`)
  pinning current canonical behavior, plus a stdout-only generator
  (`scripts/generate-emissions-goldens.mjs`). Integer values are asserted
  exactly; floats at relative tolerance 1e-12.
- Export-surface test suite (`tests/exports.test.ts`) locking the public barrel
  exports exactly (fails on accidental removals and additions).
- Deterministic grid-based invariant tests for the decay, time-value, curves,
  and valuation kernels (round-trips, monotonicity, bit-identical determinism).
- `npm run typecheck` script (`tsc --noEmit`).

### Changed
- README, `package.json`, `.afi-codex.json`, `docs/AFI_MATH_OVERVIEW.md`, and
  `AGENTS.md` metadata aligned with the repo's governed role as the
  **canonical executable off-chain math kernel package**
  (see `afi-governance` `decisions/math-authority-v0.1.md`): emissions module
  documented everywhere, `.afi-codex.json` version synced to 0.2.0, and
  consumer references corrected with precise consumption modes
  (afi-core direct; afi-reactor transitive via afi-core; afi-mint intended;
  afi-token traceability-only; afi-econ research until promoted).

### Notes
- **No behavior changes**: `src/` is untouched in this release; emissions
  outputs are bit-for-bit identical.
- The `v0.2.0` git tag referenced by the 0.2.0 entry below has not yet been
  created; tagging/releasing is deferred to a release-authorized change.
  Consumers currently pin by commit SHA.

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
