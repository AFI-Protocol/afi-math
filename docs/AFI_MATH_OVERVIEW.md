# AFI Math Overview

## Purpose

**afi-math** is the **canonical executable off-chain math kernel package** for AFI Protocol (per `afi-governance` decision `math-authority-v0.1`). It provides pure, deterministic functions for the emissions schedule, financial calculations, signal scoring, and time-based decay models used across the AFI ecosystem.

This library is:
- **Math-only**: No I/O, database, network, or blockchain operations
- **Pure**: All functions are deterministic with no side effects
- **Canonical**: Sole source of truth for promoted deterministic off-chain protocol formulas; consumers import, wrap, derive from, or test against these kernels rather than redefining them
- **Auditable**: Simple, well-tested mathematical primitives with deterministic golden vectors

## Architecture

### Separation of Concerns

AFI Protocol maintains a clear separation between:

1. **afi-math** (this repo): Pure mathematical kernels — canonical executable off-chain math
2. **afi-config**: Schemas, version pins, profile registries, mappings, and KAT references
3. **afi-core**: SDK/wrapper surfaces, validators, and scoring contracts that delegate pure math here
4. **afi-reactor**: Reference runtime / pipeline orchestration — not a math authority
5. **afi-mint**: Mint/reward policy execution, consuming canonical math
6. **afi-token**: Smart contracts and on-chain constraints with mirrored, traceable constants
7. **afi-econ**: Economic research/simulation/reference modeling until governed promotion

This separation ensures that:
- Math functions can be audited independently
- Changes to schemas don't affect mathematical correctness
- Runtime behavior can evolve without changing core math
- Math can be reused across different contexts (off-chain, simulation, testing)

## Module Breakdown

### 0. Emissions (`src/emissions/emissionsSchedule.ts`)

**Purpose**: Canonical three-phase front-loaded emissions schedule (86B over ~53 years), derived from `AFI_Emissions_Final.wl` (Wolfram Mathematica).

**Key Functions**:

- `buildEmissionsSchedule(params?)`: Build the complete schedule from (partial) `EmissionsParams`
  - Defaults (`DEFAULT_EMISSIONS_PARAMS`): 86B cap, 52 epochs/year, phases of 4 / 24 / 25 years reaching 33⅓% / 80% / 100% of supply, shape factors 2.0 / 1.5 / 1.2
  - Per-phase front-loaded weights via `shapeWeights` (`w[i] ∝ e^(-shape·i/(n-1))`, normalized to sum 1)
  - Emissions decrease strictly within each phase, with intended upward steps at the two phase boundaries (each phase is front-loaded independently)

- `getEpochEmission(schedule, epoch)`: Per-epoch budget (1-indexed; 0 outside the schedule)
- `getCumulativeEmissions(schedule, epoch)`: Cumulative emissions (exactly the cap at/after the final epoch)
- `getRemainingSupply(schedule, alreadyMinted)`: Remaining mintable supply, clamped at 0
- `getEmittedFraction(schedule, epoch)`: Fraction of the cap emitted by an epoch

**Determinism & precision**: Pure float64; construction is bit-identical across repeated runs on the same engine. Because IEEE-754 does not mandate bit-identical transcendentals (`Math.exp`) across engines, canonical outputs are pinned by golden vectors (`tests/goldens/emissions.golden.json`) with exact integer assertions and relative tolerance `1e-12` for floats.

**AFI Use Cases**:
- Canonical epoch emissions budgets for tokenomics
- Reference vectors for downstream consumers that mirror or apply the schedule

### 1. Time Value (`src/timeValue/timeValue.ts`)

**Purpose**: Time value of money calculations for discounting, valuation, and terminal value computations.

**Key Functions**:

- `tvMultiple(WACC, gStable)`: Calculate terminal value multiple using Gordon Growth Model
  - Used in: Reverse DCF, equity valuation, terminal value calculations
  - Formula: `1 / (WACC - g_stable)`

- `presentValue({ futureValue, rate, periods })`: Discount future value to present
  - Used in: DCF models, bond pricing, option valuation
  - Formula: `FV / (1 + r)^n`

- `futureValue({ presentValue, rate, periods })`: Compound present value to future
  - Used in: Growth projections, reinvestment calculations
  - Formula: `PV * (1 + r)^n`

- `impliedRate({ presentValue, futureValue, periods })`: Solve for implied discount rate
  - Used in: Reverse engineering market expectations, yield calculations
  - Method: Analytical solution with verification

- `presentValueContinuous()` / `futureValueContinuous()`: Continuous compounding variants
  - Used in: Options pricing, high-frequency scenarios
  - Formula: `PV = FV * e^(-r*t)`, `FV = PV * e^(r*t)`

**AFI Use Cases**:
- Terminal value calculations in equity lens signals
- Discounting future cash flows in reverse DCF
- Implied WACC calculations for signal validation
- Time-weighted scoring in PoI (Proof of Insight) assessment

### 2. Curves (`src/curves/curves.ts`)

**Purpose**: Mathematical curve primitives for scoring, confidence shaping, and non-linear transformations.

**Key Functions**:

- `logistic(t, L, k, t0)`: Standard logistic (sigmoid) curve
  - Used in: Confidence scoring, probability transformations, S-curve adoption models
  - Properties: Smooth transition from 0 to L, inflection at t0, steepness controlled by k

- `logisticNormalized(t, k, t0)`: Logistic curve normalized to [0, 1]
  - Used in: Score normalization, probability outputs

- `inverseLogistic(y, L, k, t0)`: Recover input from logistic output
  - Used in: Reverse scoring, calibration

- `exponential(t, A, r)`: Exponential growth/decay
  - Used in: Rapid growth models, decay functions

- `powerLaw(t, A, p)`: Power law relationships
  - Used in: Network effects, scaling laws, long-tail distributions

- `smoothstep(t, edge0, edge1)`: Smooth interpolation with zero derivatives at endpoints
  - Used in: Smooth transitions, animation curves, gradual cutoffs

**AFI Use Cases**:
- Logistic curves for signal confidence scoring (low conviction → high conviction)
- Exponential curves for rapid decay of stale signals
- Power law for network effect modeling in PoI scoring
- Smoothstep for gradual quality thresholds

### 3. Valuation (`src/valuation/reverseDcf.ts`)

**Purpose**: Reverse DCF and implied discount rate calculations for fundamental analysis.

**Key Functions**:

- `reverseDCF(inputs)`: Calculate implied enterprise value given trial sales CAGR
  - Inputs: EV target, S0, margin, tax rate, sales-to-capital, WACC, g_stable, horizon, trial CAGR
  - Outputs: PV of FCFs, terminal value, PV of terminal value, implied EV
  - Process:
    1. Project sales over horizon using trial CAGR
    2. Calculate NOPAT (sales * margin * (1 - tax))
    3. Calculate reinvestment (Δsales * sales-to-capital)
    4. Calculate FCF (NOPAT - reinvestment)
    5. Discount FCFs to present value
    6. Calculate terminal value using Gordon Growth
    7. Sum PV of FCFs and PV of terminal value

- `impliedDiscountRate({ cashFlows, targetPrice })`: Find WACC that makes NPV = target price
  - Method: Binary search with configurable tolerance
  - Used in: Reverse engineering market expectations, signal validation

**AFI Use Cases**:
- Equity lens signals: Validate fundamental analysis claims
- Strategy lens signals: Implied return expectations
- Signal quality scoring: Coherence between claimed metrics and market prices
- PoI assessment: Reward signals with economically sound valuations

### 4. Decay (`src/decay/decayModels.ts`)

**Purpose**: Signal decay, half-life calculations, and time-based scoring for PoI assessment.

**Key Functions**:

- `exponentialDecay({ initialValue, halfLife, elapsed })`: Standard exponential decay
  - Formula: `V(t) = V0 * e^(-λ*t)` where `λ = ln(2) / halfLife`
  - Used in: Signal freshness scoring, time-weighted averages

- `powerDecay({ initialValue, timeScale, power, elapsed })`: Power law decay
  - Formula: `V(t) = V0 / (1 + t/t0)^p`
  - Used in: Long-tail decay, slower-than-exponential aging

- `halfLifeFromLambda()` / `lambdaFromHalfLife()`: Convert between decay constant and half-life
  - Used in: Calibration, parameter conversion

- `adjustedHalfLife({ baseHalfLife, volatility, conviction })`: Adjust half-life based on signal characteristics
  - Higher volatility → shorter half-life (signal decays faster)
  - Higher conviction → longer half-life (signal stays relevant longer)
  - Used in: Dynamic decay based on signal metadata

- `timeWeightedScore({ baseScore, halfLife, age })`: Calculate decayed score
  - Used in: PoI scoring, signal ranking, quality weighting

- `compositeDecayScore(signals)`: Weighted average of multiple decayed signals
  - Used in: Aggregating signals with different ages and half-lives

- `greeksAdjustedHalfLife({ baseHalfLife, thetaPerDay })`: Adjust half-life based on theta (time decay sensitivity)
  - Used in: Options-style signals, greeks-aware decay
  - Higher |theta| → shorter effective half-life

**AFI Use Cases**:
- Signal half-life from USS telemetry.decay fields
- Time-weighted PoI scoring (recent signals weighted higher)
- Greeks-aware decay for strategy lens signals
- Composite scoring across multiple signal sources
- Dynamic decay based on volatility and conviction metadata

## Integration with AFI Protocol

### How Other Repos Use afi-math

Consumption modes follow the authority model in `afi-governance` `decisions/math-authority-v0.1.md` — not every repo imports `afi-math` directly:

**afi-core** (direct SDK/wrapper consumer):
- Pins `afi-math` by commit and wraps kernels behind SDK surfaces
- Uses `decay`, `curves`, `timeValue`, and `emissions` lineage for scoring and derived figures
- Must not independently redefine canonical formulas that belong here

**afi-reactor** (transitive consumer):
- Reference runtime; consumes math transitively through `afi-core` surfaces (no direct `afi-math` import today)
- Not a math authority; strategy/indicator math inside the reactor is implementation/profile math unless separately promoted

**afi-mint** (intended consumer):
- Should consume the canonical emissions schedule from `afi-math` instead of duplicating it; de-inlining its current inline copy is tracked follow-up work (PR-3 in the authority-model decision record)

**afi-token** (traceability, not import):
- Does not import `afi-math`; mirrors constants (e.g. the supply cap) on-chain
- Mirrored values require governance/test-vector traceability to `afi-math` golden vectors

**afi-config**:
- Owns schemas, version pins, profile registries, mappings, and KAT references
- Provides USS schemas that align with afi-math decay models

**afi-econ**:
- Research/simulation/reference modeling; formulas become executable canon only via governed promotion into `afi-math`

### USS Integration

AFI Universal Signal Schema (USS) defines telemetry fields that map directly to afi-math functions:

```json
{
  "telemetry": {
    "decay": {
      "halfLifeDays": 14,
      "function": "exp",
      "params": { "H": 12 }
    },
    "greeks": {
      "thetaPerDay": -0.0006,
      "deltaPer1pctPrice": 0.12
    }
  }
}
```

**Mapping**:
- `telemetry.decay.halfLifeDays` → `decay.exponentialDecay({ halfLife })`
- `telemetry.decay.function: "exp"` → `decay.exponentialDecay()`
- `telemetry.decay.function: "power"` → `decay.powerDecay()`
- `telemetry.greeks.thetaPerDay` → `decay.greeksAdjustedHalfLife({ thetaPerDay })`

## Testing Strategy

All modules have comprehensive test coverage:

- **emissions.test.ts**: Golden-vector conformance, cap behavior, milestone epochs, per-phase monotonicity and intended phase-boundary discontinuities, boundary epochs, determinism, invalid-input characterization
- **exports.test.ts**: Locks the public barrel export surface exactly (fails on accidental removals and additions)
- **timeValue.test.ts**: PV/FV round-trips, edge cases (zero rate, zero periods), implied rate accuracy, grid invariants
- **curves.test.ts**: Logistic midpoint, monotonicity, range bounds, inverse functions, grid invariants
- **valuation.test.ts**: Reverse DCF against spreadsheet values, implied rate solving, edge cases, grid invariants
- **decay.test.ts**: Half-life verification, composite scoring, greeks adjustment, grid invariants

Golden vectors (`tests/goldens/emissions.golden.json`) pin canonical emissions outputs deterministically: integer values are asserted exactly; float values at relative tolerance `1e-12` (IEEE-754 does not guarantee bit-identical transcendentals across JS engines).

Tests verify:
- Mathematical correctness (formulas match specifications)
- Numerical stability (no NaN, Infinity, or precision issues)
- Edge case handling (zero, negative, boundary values)
- Round-trip consistency (PV → FV → PV, logistic → inverse → logistic)
- Determinism (repeated calls produce bit-identical results)
- Canonical behavior pinning (golden vectors; any diff requires explicit review)

## Future Extensions (Phase 2+)

Potential additions (not in Phase 1 scope):

1. **Options Pricing**: Black-Scholes, binomial trees, implied volatility
2. **Risk Metrics**: VaR, CVaR, Sharpe ratio, Sortino ratio
3. **Statistical Functions**: Correlation, covariance, regression
4. **Optimization**: Newton-Raphson, gradient descent, constrained optimization
5. **Monte Carlo**: Random number generation, path simulation, scenario analysis

These would be added as separate modules following the same pure-function design.

## Conclusion

**afi-math** provides the mathematical foundation for AFI Protocol's scoring, valuation, and decay models. By keeping math separate from schemas, configuration, and engine logic, we ensure:

- **Auditability**: Math can be verified independently
- **Reusability**: Same functions work on-chain, off-chain, in tests
- **Maintainability**: Changes to one layer don't cascade to others
- **Testability**: Pure functions are easy to test exhaustively

All functions are deterministic, well-documented, and thoroughly tested. This library is Phase 1 ready and serves as the canonical math reference for the AFI ecosystem.

