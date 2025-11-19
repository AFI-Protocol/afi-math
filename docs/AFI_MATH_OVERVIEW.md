# AFI Math Overview

## Purpose

**afi-math** is the shared, audited mathematical backbone for AFI Protocol. It provides pure, deterministic functions for financial calculations, signal scoring, and time-based decay models used across the AFI ecosystem.

This library is:
- **Math-only**: No I/O, database, network, or blockchain operations
- **Pure**: All functions are deterministic with no side effects
- **Shared**: Used by afi-engine, afi-token, afi-reactor, afi-plugins, and afi-core
- **Auditable**: Simple, well-tested mathematical primitives

## Architecture

### Separation of Concerns

AFI Protocol maintains a clear separation between:

1. **afi-math** (this repo): Pure mathematical functions
2. **afi-config**: JSON Schemas and configuration templates
3. **afi-engine**: Signal processing and scoring logic
4. **afi-reactor**: Pipeline orchestration and DAG execution
5. **afi-token**: Smart contracts and on-chain tokenomics

This separation ensures that:
- Math functions can be audited independently
- Changes to schemas don't affect mathematical correctness
- Engine behavior can evolve without changing core math
- Math can be reused across different contexts (on-chain, off-chain, testing)

## Module Breakdown

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

**afi-engine**:
- Uses `decay` module for signal freshness scoring
- Uses `curves` module for confidence transformations
- Uses `valuation` module for fundamental analysis validation

**afi-token-finalized**:
- Uses `timeValue` module for emissions discounting
- Uses `decay` module for PoI half-life calculations
- Uses `curves` module for non-linear reward curves

**afi-reactor**:
- Uses `curves` module for pipeline scoring transformations
- Uses `decay` module for time-weighted signal aggregation

**afi-plugins**:
- Uses `valuation` module for equity/strategy signal generation
- Uses `timeValue` module for DCF-based signals
- Uses `decay` module for signal metadata enrichment

**afi-config**:
- References afi-math functions in schema documentation
- Provides USS schemas that align with afi-math decay models

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

- **timeValue.test.ts**: PV/FV round-trips, edge cases (zero rate, zero periods), implied rate accuracy
- **curves.test.ts**: Logistic midpoint, monotonicity, range bounds, inverse functions
- **valuation.test.ts**: Reverse DCF against spreadsheet values, implied rate solving, edge cases
- **decay.test.ts**: Half-life verification, composite scoring, greeks adjustment

Tests verify:
- Mathematical correctness (formulas match specifications)
- Numerical stability (no NaN, Infinity, or precision issues)
- Edge case handling (zero, negative, boundary values)
- Round-trip consistency (PV → FV → PV, logistic → inverse → logistic)

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

