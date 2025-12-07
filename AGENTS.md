# afi-math — Agent Instructions ⚠️ MEDIUM RISK (PROTOCOL-WIDE IMPACT)

**afi-math** is a **pure TypeScript library** providing deterministic mathematical functions for AFI Protocol. It contains time value of money calculations, curve primitives, valuation models, and signal decay functions.

**⚠️ MEDIUM RISK (EFFECTIVELY HIGH)**: This repo is marked MEDIUM risk because it contains **pure, deterministic math** with no I/O or side effects. However, changes can have **protocol-wide impact** because:
- Math functions are used across `afi-reactor`, `afi-core`, `afi-mint`, and `afi-token`
- Incorrect decay curves can affect signal scoring and validator reputation
- Incorrect time value calculations can affect tokenomics and emissions
- Bugs in math functions can propagate to all consumers

**Global Authority**: All agents operating in AFI Protocol repos must follow `afi-config/codex/governance/droids/AFI_DROID_CHARTER.v0.1.md`. If this AGENTS.md conflicts with the Charter, **the Charter wins**.

For global droid behavior and terminology, see:
- `afi-config/codex/governance/droids/AFI_DROID_CHARTER.v0.1.md`
- `afi-config/codex/governance/droids/AFI_DROID_PLAYBOOK.v0.1.md`
- `afi-config/codex/governance/droids/AFI_DROID_GLOSSARY.md`

---

## Build & Test

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests (Vitest)
npm test

# Type check (use tsc directly; no typecheck script in package.json yet)
npx tsc --noEmit

# Generate coverage report (planned command – may be stubbed in this phase)
npm run coverage
```

**Expected outcomes**: All tests pass, 100% coverage for critical math functions, no TypeScript errors.

---

## Run Locally / Dev Workflow

```bash
# Build and test
npm run build && npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report (planned command – may be stubbed in this phase)
npm run coverage

# Type check (use tsc directly; no typecheck script in package.json yet)
npx tsc --noEmit
```

---

## Architecture Overview

**Purpose**: Provide pure, deterministic mathematical functions for AFI Protocol. **Not** for business logic, orchestration, or I/O operations.

**Key directories**:
- `src/timeValue/` — Time value of money functions (PV, FV, implied rates, terminal value)
- `src/curves/` — Curve primitives (logistic, exponential, power law, smoothstep, interpolation)
- `src/valuation/` — Valuation models (reverse DCF, implied discount rates)
- `src/decay/` — Decay models (exponential decay, power decay, half-life, greeks-adjusted decay)
- `tests/` — Comprehensive unit tests and property-based tests
- `docs/` — Mathematical documentation and formulas

**Consumed by**: afi-reactor (signal decay), afi-core (scoring), afi-mint (threshold calculations), afi-token (emissions curves)  
**Depends on**: **NONE** (pure math library, no external dependencies beyond TypeScript)

**Design Principle**: `afi-math` is a **pure, deterministic library**:
- No network calls
- No database access
- No filesystem writes
- No side effects
- All functions are referentially transparent (same inputs → same outputs)

---

## Security

- **⚠️ Math errors propagate protocol-wide**: Incorrect functions affect all consumers.
- **⚠️ Decay curves affect signal scoring**: Bugs can cause incorrect validator reputation or signal scores.
- **⚠️ Time value calculations affect tokenomics**: Errors can cause incorrect emissions or valuations.
- **All math changes require tests**: 100% coverage for critical functions, property-based tests for invariants.
- **No I/O side effects**: Functions must remain pure and deterministic.
- **No hardcoded policy constants**: AFI-specific parameters (e.g., decay rates, discount rates) should be passed as arguments, not embedded in functions.

---

## Git Workflows

- **Base branch**: `main`
- **Branch naming**: `feat/`, `fix/`, `math/`, `test/`
- **Commit messages**: Conventional commits (e.g., `feat(decay): add greeks-adjusted decay function`)
- **Before committing**: Run `npm run build && npm test`
- **⚠️ Math changes require review**: Tag @afi-math-team in PR

---

## Conventions & Patterns

- **Language**: TypeScript (ESM), pure functions only
- **Style**: Functional programming, no classes or mutable state
- **Tests**: Vitest, comprehensive unit tests + property-based tests (e.g., `fast-check`)
- **Documentation**: All functions must include JSDoc with mathematical formulas and examples
- **Type safety**: Strict TypeScript, no `any` types

---

## Scope & Boundaries for Agents

**Allowed**:
- Add pure mathematical functions in `src/` (time value, curves, valuation, decay)
- Add comprehensive tests in `tests/` (unit tests, property-based tests)
- Improve documentation in `docs/` (formulas, examples, references to AFI whitepaper)
- Add JSDoc comments with mathematical formulas
- Refactor for performance or clarity (while preserving determinism)

**Forbidden**:
- **Add I/O operations** (no network calls, database access, filesystem writes)
- **Add side effects** (functions must remain pure and deterministic)
- **Embed AFI-specific policy constants** (e.g., hardcoded decay rates, discount rates) — pass as arguments instead
- **Add dependencies on `afi-reactor`, `afi-token`, or other AFI repos** (avoid circular coupling)
- **Add business logic or orchestration** (those belong to `afi-reactor` and `afi-core`)
- **Add tokenomics logic** (those belong to `afi-token` and `afi-mint`)
- **Change function signatures without updating all consumers** (breaking changes require coordination)
- **Add non-deterministic functions** (e.g., random number generation, Date.now())

**When unsure**: **DO NOT PROCEED**. Ask for explicit spec and review. Math errors propagate protocol-wide.

---

## Interaction with Other AFI Repos

**afi-reactor** (DAG orchestrator):
- `afi-reactor` **consumes** decay functions from `afi-math`
- `afi-math` **MUST NOT** depend on `afi-reactor` (avoid circular coupling)
- Dependency direction: `afi-reactor` → `afi-math` (never reverse)

**afi-core** (runtime layer):
- `afi-core` **consumes** time value and curve functions from `afi-math`
- `afi-math` **MUST NOT** depend on `afi-core` (avoid circular coupling)
- Dependency direction: `afi-core` → `afi-math` (never reverse)

**afi-mint** (minting coordination):
- `afi-mint` **consumes** threshold and valuation functions from `afi-math`
- `afi-math` **MUST NOT** depend on `afi-mint` (avoid circular coupling)
- Dependency direction: `afi-mint` → `afi-math` (never reverse)

**afi-token** (on-chain contracts):
- `afi-token` **may reference** emissions curves from `afi-math` (for off-chain simulation)
- `afi-math` **MUST NOT** depend on `afi-token` (avoid circular coupling)
- Dependency direction: `afi-token` → `afi-math` (never reverse)

**afi-config** (global config):
- `afi-math` **MUST NOT** hardcode AFI-specific parameters (use config from `afi-config` in consuming repos)
- `afi-math` functions should accept parameters as arguments, not embed policy constants

**Principle**: `afi-math` is a **pure utility library**. It provides mathematical primitives, not AFI-specific business logic. Consumers pass in AFI-specific parameters.

---

## Future Droids (Placeholder)

**TODO**: Define `math-guardian-droid` in `.factory/droids/math-guardian-droid.md` when math library matures.

**Expected responsibilities**:
- Validate mathematical correctness (unit tests, property-based tests)
- Ensure functions remain pure and deterministic
- Review performance and numerical stability
- Ensure no AFI-specific policy constants are hardcoded

**Constraints**:
- MUST follow AFI_DROID_CHARTER and AFI_DROID_PLAYBOOK
- MUST NOT add I/O operations or side effects
- MUST NOT create circular dependencies with other AFI repos

---

## Human Review & Escalation

- **All math changes require human review** before merge.
- **CRITICAL functions** (decay curves, time value calculations) require explicit sign-off from @afi-math-team and @afi-core-team.
- **Breaking changes** (function signature changes) require coordination with all consumers.
- **Prefer small, reversible changes** over large refactors.
- **When in doubt, escalate** to @afi-math-team.

---

**Last Updated**: 2025-12-06  
**Maintainers**: AFI Math Team  
**Charter**: `afi-config/codex/governance/droids/AFI_DROID_CHARTER.v0.1.md`  
**Risk Level**: MEDIUM (PROTOCOL-WIDE IMPACT)

