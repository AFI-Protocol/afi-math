# AFI Math

**Shared financial math primitives for AFI Protocol**

`afi-math` is a pure TypeScript library providing deterministic mathematical functions for time value of money, curve primitives, valuation models, and signal decay. It serves as the mathematical backbone for AFI Protocol's scoring, tokenomics, and pipeline operations.

## Features

- **Time Value Functions**: Present value, future value, implied rates, terminal value multiples
- **Curve Primitives**: Logistic, exponential, power law, smoothstep, and interpolation functions
- **Valuation Models**: Reverse DCF, implied discount rate calculations
- **Decay Models**: Exponential decay, power decay, half-life calculations, greeks-adjusted decay

## Installation

```bash
npm install @afi-protocol/afi-math
```

## Usage

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
│   ├── timeValue/
│   │   └── timeValue.ts       # Time value of money functions
│   ├── curves/
│   │   └── curves.ts          # Curve primitives (logistic, exponential, etc.)
│   ├── valuation/
│   │   └── reverseDcf.ts      # Reverse DCF and implied rate calculations
│   ├── decay/
│   │   └── decayModels.ts     # Signal decay and half-life models
│   └── index.ts               # Barrel exports
├── tests/
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
- **Type Safety**: Full TypeScript with strict mode enabled
- **Well-Tested**: Comprehensive test coverage with Vitest
- **Documented**: Clear JSDoc comments for all public functions

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
```

## License

MIT

## Related Repositories

- `afi-config`: Configuration and JSON Schema library
- `afi-engine`: Signal processing and scoring engine
- `afi-reactor`: DAG orchestration and pipeline execution
- `afi-token-finalized`: Smart contracts and tokenomics

---

**AFI Math** is part of the AFI Protocol ecosystem. For more information, see [docs/AFI_MATH_OVERVIEW.md](./docs/AFI_MATH_OVERVIEW.md).

