# afi-math — Wave 2 Audit Report

**Original audit:** 2026-06-25, against branch `claude/afi-math-audit-m0nery` (HEAD `1a524d3`)
**Revalidated:** 2026-07-02, against `main` @ `623a149` (v0.2.0) and the current afi-core dependency pin
**Subject:** Emissions purity · precision discipline · self-versioning · pinning · consistency with doctrine

Repo at a glance: 5 source modules, 4 test files, zero runtime dependencies.

## Revalidation summary (2026-07-02)

| # | Finding | Status after revalidation |
|---|---|---|
| 1 | Emissions schedule is pure/deterministic | **Active — confirmed** (source unchanged since audit apart from an ESM import-extension fix in `src/index.ts`) |
| 2 | Float64/transcendental reproducibility risk | **Active — confirmed** |
| 3 | No self-version, no tags/releases | **Active — confirmed, with a new wrinkle** (CHANGELOG describes v0.2.0 as "the first tagged release", but no git tag or GitHub release exists; `package.json` is 0.2.0 while `.afi-codex.json` still says 0.1.0) |
| 4 | afi-core pin predates the emissions module | **Superseded — resolved** (afi-core now pins `6091cbf`, the v0.2.0 release commit, whose tree contains `src/emissions/`; re-pinned via afi-core PR #15 / afi-math PR #2, merged 2026-06-29) |
| 5 | `totalRewardPool` symbol not present in afi-math | **Active — confirmed, wording refined** (still zero matches in `src/` and `docs/`; the v0.2.0 CHANGELOG now *mentions* that afi-core derives `totalRewardPool` from the emissions schedule, documenting that the derivation lives downstream) |
| 6 | Emissions module has no test coverage | **Active — confirmed** |
| 7 | `.afi-codex.json` consumer list inconsistent with README/AGENTS | **Active — confirmed** |

---

## 1. Map

| Module | File | What it is |
|---|---|---|
| Emissions | `src/emissions/emissionsSchedule.ts` | Three-phase front-loaded 86B schedule |
| Time value | `src/timeValue/timeValue.ts` | PV/FV, Gordon Growth, implied rate |
| Curves | `src/curves/curves.ts` | logistic, exp, power, tanh, smoothstep, lerp |
| Valuation | `src/valuation/reverseDcf.ts` | reverse DCF + binary-search implied WACC |
| Decay | `src/decay/decayModels.ts` | exp/power decay, half-life, greeks-adjusted |
| Barrel | `src/index.ts` | re-exports all 5 namespaces |

---

## 2. Emissions purity — ✅ genuinely pure / deterministic (active)

`buildEmissionsSchedule()` (`emissionsSchedule.ts:112-179`) is a pure function of its `params` object. A grep for `Date.now|Math.random|new Date|fetch|fs|process.|crypto|readFile` across `src/` returns **zero matches** (re-verified 2026-07-02). The only non-arithmetic operation is `Math.round` (deterministic). All five modules are referentially transparent.

This is the one repo where the Wave 2 "genuinely deterministic" claim holds in the shipped behavior, and `AGENTS.md` explicitly forbids `Date.now()`/random/IO as doctrine. Doctrine matches implementation.

Caveat (not a purity break): `cap: bigint` is immediately downcast via `Number(p.cap)`. 86e9 < 2⁵³ so the downcast is exact, but everything downstream is float64.

---

## 3. Precision discipline — ⚠️ float64 throughout, no output-rounding discipline (active)

- **No fixed-point anywhere.** Emissions are `number[]`, not integer base-units. The lone `bigint` is decorative — downcast on entry.
- **The "exact sum to cap" comment overstates.** `scale = cap / baseTotal` corrects gross drift, but float64 summation still carries rounding; milestone detection uses `findIndex(c => c >= target)` on a float cumulative, which is boundary-sensitive.
- **Cross-engine reproducibility risk is real.** Every module relies on `Math.exp/pow/tanh/log`. IEEE-754 does **not** mandate bit-identical transcendentals across JS engines/libm implementations, so outputs can diverge in low-order bits across platforms. This is a significant technical risk for any scheme that hashes or content-addresses emitted values.
- The only numeric tolerances present are solver-convergence constants (`1e-9`, `1e-6`) — not output-rounding discipline.

**Precision profile the Canon could adopt:** declare float64 + last-write scale-normalization as canonical; or move to integer/fixed-point base-units for emissions; and avoid raw transcendentals in any value that gets hashed or pinned. As of this revalidation, none of this exists.

---

## 4. Self-identity — ❌ no self-version, no self-hash, untagged (active; partially worsened)

- Version strings are hand-maintained and now **disagree**: `package.json` says `0.2.0`, `.afi-codex.json` still says `0.1.0`. No code reads or emits either.
- **No git tags and no GitHub releases exist** (re-verified 2026-07-02: `git tag -l` empty; releases/tags API both return 0) — despite the v0.2.0 CHANGELOG entry describing itself as "the first tagged release" and advising consumers to "pin to the `v0.2.0` tag". The tag was never created/pushed, so that advice is not currently actionable.
- No self-hashing code (grep `crypto` = 0).
- The only durable identity remains the git SHA itself, which is what afi-core's pin uses; content-addressing is imposed entirely from the consumer side.

---

## 5. Pinning form

- **Onward (afi-math → deps):** pins nothing. `package.json` has **no `dependencies` block** (devDeps only); `.afi-codex.json` declares `external: [], internal: []`. Genuinely zero-dependency. ✅
- **Inbound (→ afi-math):** afi-core pins by commit hash — **now `#6091cbf`** (the v0.2.0 release commit, direct parent of the current `main` tip `623a149`). The `.afi-codex.json` consumer list remains a declarative name-list, not a hash pin.

---

## 6. Reproducibility of "totalRewardPool from afi-math emissions" — materially improved; two findings remain

**Finding A — pin predated the emissions code: SUPERSEDED (resolved 2026-06-29).**
The original audit found afi-core pinned `#2042ed3` (2025-12-16), a tree that predates the emissions module (added in `1a524d3`, 2026-01-25) and therefore could not reproduce any emissions-derived figure. This was resolved by the "afi-core-math-pin-fix" changes (afi-core PR #15 / afi-math PR #2, merged 2026-06-29): afi-core now pins `#6091cbf`, whose tree **contains `src/emissions/emissionsSchedule.ts`** (verified via `git ls-tree`). Emissions-derived figures are now reproducible from the pinned source.

**Finding B — `totalRewardPool` is not defined in this repo: still accurate (wording refined).**
A grep for `totalRewardPool|rewardPool` across current `main` returns zero matches in `src/` and `docs/`. The only occurrence is a v0.2.0 CHANGELOG sentence noting that *afi-core* "derives `totalRewardPool` from the emissions schedule" — which documents, rather than resolves, the fact that the named symbol and its derivation live downstream of this repo. The `cap` (86B) exists here; the doctrine-referenced symbol does not.

**Finding C — emissions module is untested: still accurate.**
`tests/` holds curves/decay/timeValue/valuation suites; there is **no `emissions.test.ts`** (re-verified 2026-07-02). The most tokenomics-critical, protocol-wide module has zero test coverage, contrary to `AGENTS.md` ("100% coverage for critical functions") and the "thoroughly tested" claim in `AFI_MATH_OVERVIEW.md`.

---

## Under-credited positives

1. **The determinism is real and shipped** — not a stub. Grep-clean of all IO/clock/random; this is the genuine determinism floor the rest of the protocol only claims.
2. **Truly zero runtime dependencies** — no `dependencies` block exists; nothing to drift or be supply-chain-compromised. Cleanest dependency posture in the triad.
3. **The afi-core pin resolves to a real, complete tree** — since the 2026-06-29 re-pin, the pinned commit contains all five modules including emissions, making the one content-addressed link in the triad fully honest.
4. **Math primitives are real and tested** (4 test files) — the afi-math analogue of afi-core's real `computeUwrScore`, without the inert-stub problem.
5. **Doctrine-as-code:** `AGENTS.md` codifies the purity invariants the implementation actually honors.

---

## Open questions (updated 2026-07-02)

- ~~Will afi-core re-pin to a commit that contains `emissions/`?~~ **Resolved:** re-pinned to `6091cbf` on 2026-06-29.
- Will the missing `v0.2.0` git tag be created, and `.afi-codex.json` bumped to match `package.json` (0.2.0), so the CHANGELOG's pin-to-tag advice becomes actionable?
- Is emissions output **hashed anywhere downstream**? If so, the transcendental cross-engine risk (§3) makes the hash platform-dependent.
- Why does `.afi-codex.json` list `afi-engine`/`afi-token-finalized` as consumers when README/AGENTS name `afi-mint`/`afi-token`? The consumer list remains internally inconsistent.
- Will an `emissions.test.ts` be added to close the coverage gap on the most tokenomics-critical module?
