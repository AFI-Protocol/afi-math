# AFI Math

**Canonical executable off-chain math kernel package for AFI Protocol**

`afi-math` is a pure TypeScript library providing deterministic mathematical functions for the emissions schedule, time value of money, curve primitives, valuation models, and signal decay. Per the AFI mathematical authority model (`afi-governance` decision `math-authority-v0.1`), this package is the **sole source of truth for promoted deterministic off-chain protocol formulas**: other repos import, wrap, derive from, or test against these kernels rather than redefining them.

## Features

- **Emissions Schedule**: Three-phase front-loaded emissions model (86B over ~53 years), with deterministic golden vectors
- **Time Value Functions**: Present value, future value, implied rates, terminal value multiples
- **Curve Primitives**: Logistic, exponential, power law, smoothstep, and interpolation functions
- **Valuation Models**: Reverse DCF, implied discount rate calculations
- **Decay Models**: Exponential decay, power decay, half-life calculations, greeks-adjusted decay

## Installation

```bash
npm install @afi-protocol/afi-math
```

## Usage

### Emissions Schedule

```typescript
import { emissions } from '@afi-protocol/afi-math';

// Build the canonical schedule (defaults: 86B cap, 52 epochs/year,
// three phases of 4 / 24 / 25 years, targets 1/3 -> 80% -> 100%)
const schedule = emissions.buildEmissionsSchedule();

schedule.totalEpochs;                       // 2756
schedule.milestones.epochTo33Pct;           // 208  (~4 years)
schedule.milestones.epochTo80Pct;           // 1456 (~28 years)

// Per-epoch budget (1-indexed; 0 outside the schedule)
const budget = emissions.getEpochEmission(schedule, 1);

// Cumulative emissions and emitted fraction
const cumulative = emissions.getCumulativeEmissions(schedule, 208);
const fraction = emissions.getEmittedFraction(schedule, 208); // ~1/3

// Remaining mintable supply given an already-minted amount
const remaining = emissions.getRemainingSupply(schedule, 1_000_000);
```

The canonical outputs of this module are pinned by deterministic golden
vectors in [`tests/goldens/emissions.golden.json`](./tests/goldens/emissions.golden.json)
(regenerate with `npm run build && node scripts/generate-emissions-goldens.mjs > tests/goldens/emissions.golden.json`).
Any diff in that file means emissions behavior changed and requires explicit
governance review.

### Time Value of Money

```typescript
import { timeValue } from '@afi-protocol/afi-math';

// Calculate present value
const pv = timeValue.presentValue({
  futureValue: 1000,
  rate: 0.10,
  periods: 5
});

// Calculate terminal value multiple (Gordon Growth)
const multiple = timeValue.tvMultiple(0.10, 0.03); // WACC=10%, g=3%
// Returns: 16.67 (1 / (0.10 - 0.03))

// Find implied rate
const rate = timeValue.impliedRate({
  presentValue: 1000,
  futureValue: 1610.51,
  periods: 5
});
// Returns: ~0.10 (10%)
```

### Curve Primitives

```typescript
import { curves } from '@afi-protocol/afi-math';

// Logistic (sigmoid) curve for scoring
const score = curves.logistic(
  t,    // input value
  100,  // max value (L)
  0.12, // steepness (k)
  30    // midpoint (t0)
);

// Normalized logistic (0 to 1)
const normalized = curves.logisticNormalized(t, 0.12, 30);

// Smoothstep interpolation
const smooth = curves.smoothstep(t, 0, 100);
```

### Valuation Models

```typescript
import { valuation } from '@afi-protocol/afi-math';

// Reverse DCF calculation
const result = valuation.reverseDCF({
  EV: 1000,
  S0: 500,
  margin: 0.15,
  taxRate: 0.25,
  salesToCapital: 0.5,
  WACC: 0.10,
  gStable: 0.03,
  horizonYears: 10,
  trialSalesCAGR: 0.08
});

console.log(result.impliedEV);        // Implied enterprise value
console.log(result.pvTerminalValue);  // PV of terminal value

// Find implied discount rate
const impliedWACC = valuation.impliedDiscountRate({
  cashFlows: [100, 110, 121, 133.1],
  targetPrice: 379.08
});
```

### Decay Models

```typescript
import { decay } from '@afi-protocol/afi-math';

// Exponential decay with half-life
const decayed = decay.exponentialDecay({
  initialValue: 100,
  halfLife: 10,
  elapsed: 10
});
// Returns: 50 (half of initial value after one half-life)

// Time-weighted score
const score = decay.timeWeightedScore({
  baseScore: 100,
  halfLife: 14,
  age: 7
});

// Adjusted half-life based on volatility and conviction
const adjustedHL = decay.adjustedHalfLife({
  baseHalfLife: 10,
  volatility: 2.0,   // Higher volatility shortens half-life
  conviction: 1.5    // Higher conviction lengthens half-life
});

// Greeks-adjusted half-life
const greeksHL = decay.greeksAdjustedHalfLife({
  baseHalfLife: 10,
  thetaPerDay: -0.5  // Time decay sensitivity
});
```

## Module Structure

```
afi-math/
├── src/
│   ├── emissions/
│   │   └── emissionsSchedule.ts  # Canonical three-phase emissions schedule
│   ├── timeValue/
│   │   └── timeValue.ts          # Time value of money functions
│   ├── curves/
│   │   └── curves.ts             # Curve primitives (logistic, exponential, etc.)
│   ├── valuation/
│   │   └── reverseDcf.ts         # Reverse DCF and implied rate calculations
│   ├── decay/
│   │   └── decayModels.ts        # Signal decay and half-life models
│   └── index.ts                  # Barrel exports
├── scripts/
│   └── generate-emissions-goldens.mjs  # Golden-vector generator (stdout-only)
├── tests/
│   ├── goldens/
│   │   └── emissions.golden.json # Deterministic emissions golden vectors
│   ├── emissions.test.ts
│   ├── exports.test.ts           # Locks the public export surface
│   ├── timeValue.test.ts
│   ├── curves.test.ts
│   ├── valuation.test.ts
│   └── decay.test.ts
└── docs/
    └── AFI_MATH_OVERVIEW.md
```

## Design Principles

- **Pure Functions**: All functions are deterministic with no side effects
- **No I/O**: No file system, database, network, or blockchain operations
- **Zero Runtime Dependencies**: Nothing to drift or be supply-chain-compromised
- **Type Safety**: Full TypeScript with strict mode enabled
- **Well-Tested**: Comprehensive test coverage with Vitest, including golden vectors for canonical outputs
- **No Embedded Policy Constants**: AFI-specific parameters are passed as arguments; `DEFAULT_EMISSIONS_PARAMS` documents the canonical published schedule parameters and remains caller-overridable
- **Documented**: Clear JSDoc comments for all public functions

## Intentionally Not Implemented (Yet)

The following are **published AFI economic doctrine** (see the AFI whitepaper,
"AFI: An Agentic Financial Intelligence Market") whose executable promotion
into `afi-math` is pending governance decisions. They are deliberately absent
from this package until governed, version-pinned, and KAT-tested:

- **UWR combiner** — the whitepaper Universal Weighting Rule
  (`conf = clamp(base × product(guards) − sum(penalties) + sum(lifts), 0, 1)`).
  Kernel implementation is a future governed promotion; profile registries,
  mappings, and version pins belong to `afi-config`/Codex.
- **AFI Index / AIM / AAG / SES kernels** — published economic doctrine
  (whitepaper §9). Repo-local artifacts elsewhere in the org are
  implementation drafts or research/reference surfaces until promoted.
- **Fixed-point / quantization helpers** — a deterministic number policy for
  hashed or content-addressed outputs is an open governance decision; current
  kernels are float64 end-to-end.

Authority boundaries are recorded in `afi-governance`
`decisions/math-authority-v0.1.md`.

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run tests
npm test

# Watch mode for tests
npm run test:watch

# Type check without emitting
npm run typecheck

# Regenerate emissions golden vectors (stdout-only generator)
npm run build && node scripts/generate-emissions-goldens.mjs > tests/goldens/emissions.golden.json
```

Note: there are currently no `lint` or `coverage` scripts in this package.

## License

MIT

## Related Repositories

Consumption relationships under the AFI mathematical authority model:

- `afi-core`: SDK/wrapper surfaces; direct consumer of `afi-math` kernels (pins by commit)
- `afi-reactor`: reference runtime; consumes math transitively through `afi-core` surfaces
- `afi-mint`: mint/reward policy execution; intended consumer of the canonical emissions schedule (de-inlining its duplicated copy is tracked follow-up work)
- `afi-token`: on-chain constraints; does not import `afi-math` — mirrored constants require governance/test-vector traceability
- `afi-config`: schemas, version pins, profile registries, and KAT references
- `afi-econ`: research/simulation/reference modeling until governed promotion

---

**AFI Math** is part of the AFI Protocol ecosystem. For more information, see [docs/AFI_MATH_OVERVIEW.md](./docs/AFI_MATH_OVERVIEW.md).

