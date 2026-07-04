import { describe, it, expect } from 'vitest';
import {
  DEFAULT_EMISSIONS_PARAMS,
  shapeWeights,
  buildEmissionsSchedule,
  getEpochEmission,
  getCumulativeEmissions,
  getRemainingSupply,
  getEmittedFraction,
  type EmissionsSchedule
} from '../src/emissions/emissionsSchedule';
import golden from './goldens/emissions.golden.json';

/**
 * Relative-tolerance assertion for float64 outputs.
 *
 * Golden floats are compared at a tight relative tolerance (1e-12) rather
 * than bit-equality because IEEE-754 does not mandate bit-identical
 * transcendentals (Math.exp) across JS engines/libm implementations.
 * Integer outputs (epoch counts, milestone epochs) are asserted exactly.
 */
const REL_TOL = 1e-12;
function expectRelClose(actual: number, expected: number, relTol: number = REL_TOL): void {
  if (expected === 0) {
    expect(actual).toBe(0);
    return;
  }
  const relErr = Math.abs(actual - expected) / Math.abs(expected);
  expect(relErr).toBeLessThanOrEqual(relTol);
}

/** Sum with plain left-to-right accumulation (matches kernel + generator). */
function sum(xs: number[]): number {
  return xs.reduce((acc, x) => acc + x, 0);
}

describe('Emissions Schedule', () => {
  // Build once — construction is pure/deterministic, and reuse keeps the suite fast.
  const schedule = buildEmissionsSchedule();
  const cap = Number(DEFAULT_EMISSIONS_PARAMS.cap);

  describe('golden vectors (canonical behavior pins)', () => {
    it('should match the default-schedule golden vector (86B canonical schedule)', () => {
      const g = golden.defaultSchedule;

      // Integer facts: exact.
      expect(schedule.totalEpochs).toBe(g.totalEpochs);
      expect(schedule.milestones.epochTo33Pct).toBe(g.milestones.epochTo33Pct);
      expect(schedule.milestones.epochTo80Pct).toBe(g.milestones.epochTo80Pct);
      expect(schedule.milestones.epochTo100Pct).toBe(g.milestones.epochTo100Pct);

      // Derived years: exact ratio of integers.
      expect(schedule.milestones.yearsTo33Pct).toBe(g.milestones.yearsTo33Pct);
      expect(schedule.milestones.yearsTo80Pct).toBe(g.milestones.yearsTo80Pct);
      expect(schedule.milestones.yearsTo100Pct).toBe(g.milestones.yearsTo100Pct);

      // Float facts: tight relative tolerance.
      for (const [epochStr, expected] of Object.entries(g.emissionsAtEpochs)) {
        expectRelClose(schedule.emissions[Number(epochStr) - 1], expected);
      }
      for (const [epochStr, expected] of Object.entries(g.cumulativeAtEpochs)) {
        expectRelClose(schedule.cumulative[Number(epochStr) - 1], expected);
      }
      expectRelClose(sum(schedule.emissions), g.sumOfEmissions);
    });

    it('should match the monthly-cadence golden vector (epochsPerYear: 12)', () => {
      const g = golden.monthlySchedule;
      const s = buildEmissionsSchedule({ epochsPerYear: 12 });

      expect(s.totalEpochs).toBe(g.totalEpochs);
      // Note: pinned milestones land at epochs 49/337 — one past the 48/336
      // phase boundaries — because milestone detection scans a float64
      // cumulative series (`findIndex(c => c >= target)`), which is
      // boundary-sensitive. This pins current canonical behavior.
      expect(s.milestones.epochTo33Pct).toBe(g.milestones.epochTo33Pct);
      expect(s.milestones.epochTo80Pct).toBe(g.milestones.epochTo80Pct);
      expect(s.milestones.epochTo100Pct).toBe(g.milestones.epochTo100Pct);

      for (const [epochStr, expected] of Object.entries(g.emissionsAtEpochs)) {
        expectRelClose(s.emissions[Number(epochStr) - 1], expected);
      }
      for (const [epochStr, expected] of Object.entries(g.cumulativeAtEpochs)) {
        expectRelClose(s.cumulative[Number(epochStr) - 1], expected);
      }
      expectRelClose(sum(s.emissions), g.sumOfEmissions);
    });

    it('should match the fully-pinned small-schedule golden vector (12 epochs)', () => {
      const g = golden.smallSchedule;
      const s = buildEmissionsSchedule({
        cap: BigInt(g.paramsUsed.cap),
        epochsPerYear: g.paramsUsed.epochsPerYear,
        earlyYears: g.paramsUsed.earlyYears,
        midYears: g.paramsUsed.midYears,
        tailYears: g.paramsUsed.tailYears
      });

      expect(s.totalEpochs).toBe(g.totalEpochs);
      expect(s.milestones.epochTo33Pct).toBe(g.milestones.epochTo33Pct);
      expect(s.milestones.epochTo80Pct).toBe(g.milestones.epochTo80Pct);
      expect(s.milestones.epochTo100Pct).toBe(g.milestones.epochTo100Pct);

      expect(s.emissions).toHaveLength(g.emissions.length);
      for (let i = 0; i < g.emissions.length; i++) {
        expectRelClose(s.emissions[i], g.emissions[i]);
        expectRelClose(s.cumulative[i], g.cumulative[i]);
      }
      expectRelClose(sum(s.emissions), g.sumOfEmissions);
    });

    it('should match the shapeWeights golden vectors', () => {
      const cases: Array<[number[], number[]]> = [
        [shapeWeights(5, 2.0), golden.shapeWeights['n5_shape2']],
        [shapeWeights(5, 0), golden.shapeWeights['n5_shape0']],
        [shapeWeights(3, 1.5), golden.shapeWeights['n3_shape1.5']],
        [shapeWeights(1, 3), golden.shapeWeights['n1_shape3']],
        [shapeWeights(0, 2), golden.shapeWeights['n0_shape2']]
      ];
      for (const [actual, expected] of cases) {
        expect(actual).toHaveLength(expected.length);
        for (let i = 0; i < expected.length; i++) {
          expectRelClose(actual[i], expected[i]);
        }
      }
    });
  });

  describe('DEFAULT_EMISSIONS_PARAMS (canonical published parameters)', () => {
    it('should pin the canonical default parameters', () => {
      expect(DEFAULT_EMISSIONS_PARAMS.cap).toBe(86_000_000_000n);
      expect(DEFAULT_EMISSIONS_PARAMS.epochsPerYear).toBe(52);
      expect(DEFAULT_EMISSIONS_PARAMS.earlyYears).toBe(4);
      expect(DEFAULT_EMISSIONS_PARAMS.midYears).toBe(24);
      expect(DEFAULT_EMISSIONS_PARAMS.tailYears).toBe(25);
      expect(DEFAULT_EMISSIONS_PARAMS.targets.f33).toBe(1 / 3);
      expect(DEFAULT_EMISSIONS_PARAMS.targets.f80).toBe(0.8);
      expect(DEFAULT_EMISSIONS_PARAMS.targets.f100).toBe(1.0);
      expect(DEFAULT_EMISSIONS_PARAMS.shapeEarly).toBe(2.0);
      expect(DEFAULT_EMISSIONS_PARAMS.shapeMid).toBe(1.5);
      expect(DEFAULT_EMISSIONS_PARAMS.shapeTail).toBe(1.2);
    });

    it('should downcast the 86B bigint cap to float64 exactly (86e9 < 2^53)', () => {
      expect(Number(DEFAULT_EMISSIONS_PARAMS.cap)).toBe(86e9);
      expect(Number.isSafeInteger(Number(DEFAULT_EMISSIONS_PARAMS.cap))).toBe(true);
    });
  });

  describe('structure', () => {
    it('should produce 2756 total epochs by default (208 early + 1248 mid + 1300 tail)', () => {
      expect(schedule.totalEpochs).toBe(2756);
      expect(schedule.totalEpochs).toBe(208 + 1248 + 1300);
      expect(schedule.emissions).toHaveLength(2756);
      expect(schedule.cumulative).toHaveLength(2756);
    });

    it('should echo back the effective params', () => {
      expect(schedule.params).toEqual(DEFAULT_EMISSIONS_PARAMS);
    });

    it('should merge partial params over defaults', () => {
      const s = buildEmissionsSchedule({ epochsPerYear: 26 });
      expect(s.params.epochsPerYear).toBe(26);
      expect(s.params.cap).toBe(DEFAULT_EMISSIONS_PARAMS.cap);
      expect(s.params.shapeEarly).toBe(DEFAULT_EMISSIONS_PARAMS.shapeEarly);
      expect(s.totalEpochs).toBe(26 * 4 + 26 * 24 + 26 * 25);
    });

    it('should emit only finite, strictly positive per-epoch amounts', () => {
      for (const e of schedule.emissions) {
        expect(Number.isFinite(e)).toBe(true);
        expect(e).toBeGreaterThan(0);
      }
    });

    it('should order milestones epochTo33Pct <= epochTo80Pct <= epochTo100Pct = totalEpochs', () => {
      const m = schedule.milestones;
      expect(m.epochTo33Pct).toBeLessThanOrEqual(m.epochTo80Pct);
      expect(m.epochTo80Pct).toBeLessThanOrEqual(m.epochTo100Pct);
      expect(m.epochTo100Pct).toBe(schedule.totalEpochs);
    });

    it('should derive years* milestones as epoch / epochsPerYear', () => {
      const m = schedule.milestones;
      const perYear = schedule.params.epochsPerYear;
      expect(m.yearsTo33Pct).toBe(m.epochTo33Pct / perYear);
      expect(m.yearsTo80Pct).toBe(m.epochTo80Pct / perYear);
      expect(m.yearsTo100Pct).toBe(m.epochTo100Pct / perYear);
    });
  });

  describe('cumulative cap behavior (86B)', () => {
    it('should sum per-epoch emissions to the cap within relative 1e-9', () => {
      expectRelClose(sum(schedule.emissions), cap, 1e-9);
    });

    it('should have a strictly increasing cumulative series ending within float epsilon of the cap', () => {
      for (let i = 1; i < schedule.cumulative.length; i++) {
        expect(schedule.cumulative[i]).toBeGreaterThan(schedule.cumulative[i - 1]);
      }
      expectRelClose(schedule.cumulative[schedule.totalEpochs - 1], cap, 1e-9);
    });

    it('should reach ~1/3 of the cap at the 33% milestone and ~80% at the 80% milestone', () => {
      const m = schedule.milestones;
      expectRelClose(schedule.cumulative[m.epochTo33Pct - 1], cap / 3, 1e-9);
      expectRelClose(schedule.cumulative[m.epochTo80Pct - 1], 0.8 * cap, 1e-9);
    });

    it('should never allow cumulative emissions to exceed the cap beyond float rounding', () => {
      for (const c of schedule.cumulative) {
        expect(c).toBeLessThanOrEqual(cap * (1 + 1e-9));
      }
    });
  });

  describe('monotonicity and phase shape (front-loading)', () => {
    // Default phase boundaries (1-indexed): early = 1..208, mid = 209..1456, tail = 1457..2756.
    const phases: Array<[string, number, number]> = [
      ['early', 1, 208],
      ['mid', 209, 1456],
      ['tail', 1457, 2756]
    ];

    it.each(phases)('should decrease strictly within the %s phase', (_name, first, last) => {
      for (let epoch = first + 1; epoch <= last; epoch++) {
        expect(schedule.emissions[epoch - 1]).toBeLessThan(schedule.emissions[epoch - 2]);
      }
    });

    it('should step UP at both phase boundaries (intended per-phase front-loading discontinuity)', () => {
      // The model front-loads each phase independently, so the first epoch of
      // a new phase intentionally emits more than the last epoch of the
      // previous phase. This is intended schedule shape, not a bug.
      expect(schedule.emissions[208]).toBeGreaterThan(schedule.emissions[207]); // early -> mid
      expect(schedule.emissions[1456]).toBeGreaterThan(schedule.emissions[1455]); // mid -> tail
    });

    it('should emit its global maximum at epoch 1 within the early phase', () => {
      // Front-loading makes epoch 1 the largest emission of the early phase
      // (and of the whole default schedule).
      const max = Math.max(...schedule.emissions);
      expect(schedule.emissions[0]).toBe(max);
    });
  });

  describe('determinism / repeatability', () => {
    it('should produce bit-identical schedules across repeated default builds', () => {
      const a = buildEmissionsSchedule();
      const b = buildEmissionsSchedule();
      expect(a.totalEpochs).toBe(b.totalEpochs);
      expect(a.milestones).toEqual(b.milestones);
      for (let i = 0; i < a.emissions.length; i++) {
        expect(Object.is(a.emissions[i], b.emissions[i])).toBe(true);
        expect(Object.is(a.cumulative[i], b.cumulative[i])).toBe(true);
      }
    });

    it('should produce bit-identical schedules across repeated parameterized builds', () => {
      const params = { epochsPerYear: 12, shapeEarly: 3.0 };
      const a = buildEmissionsSchedule(params);
      const b = buildEmissionsSchedule(params);
      for (let i = 0; i < a.emissions.length; i++) {
        expect(Object.is(a.emissions[i], b.emissions[i])).toBe(true);
      }
    });
  });

  describe('getEpochEmission', () => {
    it('should return 0 for epoch 0 and negative epochs (schedule is 1-indexed)', () => {
      expect(getEpochEmission(schedule, 0)).toBe(0);
      expect(getEpochEmission(schedule, -1)).toBe(0);
      expect(getEpochEmission(schedule, -1000)).toBe(0);
    });

    it('should return the first per-epoch emission for epoch 1', () => {
      expect(getEpochEmission(schedule, 1)).toBe(schedule.emissions[0]);
      expect(getEpochEmission(schedule, 1)).toBeGreaterThan(0);
    });

    it('should return the last per-epoch emission at totalEpochs and 0 beyond it', () => {
      expect(getEpochEmission(schedule, schedule.totalEpochs)).toBe(
        schedule.emissions[schedule.totalEpochs - 1]
      );
      expect(getEpochEmission(schedule, schedule.totalEpochs)).toBeGreaterThan(0);
      expect(getEpochEmission(schedule, schedule.totalEpochs + 1)).toBe(0);
      expect(getEpochEmission(schedule, 1_000_000)).toBe(0);
    });
  });

  describe('getCumulativeEmissions', () => {
    it('should return 0 for epoch < 1', () => {
      expect(getCumulativeEmissions(schedule, 0)).toBe(0);
      expect(getCumulativeEmissions(schedule, -5)).toBe(0);
    });

    it('should return the first cumulative value for epoch 1', () => {
      expect(getCumulativeEmissions(schedule, 1)).toBe(schedule.cumulative[0]);
    });

    it('should return exactly the cap at and beyond totalEpochs', () => {
      // Current behavior: at epoch >= totalEpochs the function returns
      // Number(params.cap) exactly, even though cumulative[totalEpochs - 1]
      // carries float64 summation rounding (~3e-5 absolute below the cap).
      expect(getCumulativeEmissions(schedule, schedule.totalEpochs)).toBe(cap);
      expect(getCumulativeEmissions(schedule, schedule.totalEpochs + 100)).toBe(cap);
    });

    it('should be non-decreasing in epoch', () => {
      let prev = 0;
      for (const epoch of [0, 1, 2, 100, 208, 209, 1000, 1456, 1457, 2755, 2756, 2757]) {
        const c = getCumulativeEmissions(schedule, epoch);
        expect(c).toBeGreaterThanOrEqual(prev);
        prev = c;
      }
    });
  });

  describe('getRemainingSupply', () => {
    it('should return the full cap when nothing has been minted', () => {
      expect(getRemainingSupply(schedule, 0)).toBe(cap);
    });

    it('should return the difference for partial minting', () => {
      expect(getRemainingSupply(schedule, 1_000_000)).toBe(cap - 1_000_000);
    });

    it('should return 0 when the cap has been fully minted', () => {
      expect(getRemainingSupply(schedule, cap)).toBe(0);
    });

    it('should clamp to 0 when minted amount exceeds the cap', () => {
      expect(getRemainingSupply(schedule, cap + 1)).toBe(0);
      expect(getRemainingSupply(schedule, cap * 2)).toBe(0);
    });
  });

  describe('getEmittedFraction', () => {
    it('should return 0 before the first epoch and 1 at/after the final epoch', () => {
      expect(getEmittedFraction(schedule, 0)).toBe(0);
      expect(getEmittedFraction(schedule, schedule.totalEpochs)).toBe(1);
      expect(getEmittedFraction(schedule, schedule.totalEpochs + 10)).toBe(1);
    });

    it('should be strictly between 0 and 1 mid-schedule and non-decreasing', () => {
      const f1 = getEmittedFraction(schedule, 1);
      expect(f1).toBeGreaterThan(0);
      expect(f1).toBeLessThan(1);

      let prev = 0;
      for (const epoch of [1, 10, 208, 209, 1000, 1456, 2000, 2756]) {
        const f = getEmittedFraction(schedule, epoch);
        expect(f).toBeGreaterThanOrEqual(prev);
        prev = f;
      }
    });

    it('should reach ~1/3 at the 33% milestone and ~0.8 at the 80% milestone', () => {
      expectRelClose(getEmittedFraction(schedule, schedule.milestones.epochTo33Pct), 1 / 3, 1e-9);
      expectRelClose(getEmittedFraction(schedule, schedule.milestones.epochTo80Pct), 0.8, 1e-9);
    });
  });

  describe('shapeWeights invariants', () => {
    const shapes = [0.5, 1, 1.2, 1.5, 2, 3];
    const sizes = [2, 5, 52, 208];

    it('should return [] for n <= 0 and [1.0] for n === 1', () => {
      expect(shapeWeights(0, 2)).toEqual([]);
      expect(shapeWeights(-3, 2)).toEqual([]);
      expect(shapeWeights(1, 2)).toEqual([1.0]);
      expect(shapeWeights(1, 0)).toEqual([1.0]);
    });

    it('should always produce n weights that sum to 1', () => {
      for (const n of sizes) {
        for (const shape of shapes) {
          const w = shapeWeights(n, shape);
          expect(w).toHaveLength(n);
          expectRelClose(sum(w), 1);
        }
      }
    });

    it('should be strictly decreasing for positive shape (front-loaded)', () => {
      for (const n of sizes) {
        for (const shape of shapes) {
          const w = shapeWeights(n, shape);
          for (let i = 1; i < w.length; i++) {
            expect(w[i]).toBeLessThan(w[i - 1]);
          }
        }
      }
    });

    it('should be uniform for shape 0', () => {
      for (const n of sizes) {
        const w = shapeWeights(n, 0);
        for (const x of w) {
          expectRelClose(x, 1 / n);
        }
      }
    });

    it('should front-load more as shape increases (larger first weight)', () => {
      for (const n of sizes) {
        let prevFirst = 0;
        for (const shape of shapes) {
          const first = shapeWeights(n, shape)[0];
          expect(first).toBeGreaterThan(prevFirst);
          prevFirst = first;
        }
      }
    });
  });

  describe('invalid input handling (characterization of current behavior)', () => {
    // These tests PIN current behavior so any future change is deliberate.
    // They are characterization, not endorsement — see follow-up notes in
    // the PR: adding input validation would be a (small) behavior change
    // that needs its own review.

    it('currently returns undefined for fractional epochs in getEpochEmission (follow-up: validate)', () => {
      // Fractional epochs index a hole in the array; the number-typed
      // signature leaks `undefined` at runtime.
      expect(getEpochEmission(schedule, 1.5)).toBeUndefined();
    });

    it('currently returns undefined for NaN epochs in getEpochEmission (follow-up: validate)', () => {
      // NaN fails both range guards (NaN comparisons are false) and then
      // indexes as undefined.
      expect(getEpochEmission(schedule, Number.NaN)).toBeUndefined();
    });

    it('currently clamps each phase to >= 1 epoch when epochsPerYear is 0 (follow-up: validate)', () => {
      // toEpochs() applies Math.max(1, ...), so a zero cadence still yields
      // a 3-epoch schedule (one per phase) instead of throwing.
      const s = buildEmissionsSchedule({ epochsPerYear: 0 });
      expect(s.totalEpochs).toBe(3);
      expectRelClose(sum(s.emissions), cap, 1e-9);
    });

    it('currently accepts NaN cumulative reads for NaN epochs via getCumulativeEmissions (follow-up: validate)', () => {
      // NaN < 1 is false and NaN >= totalEpochs is false, so the array is
      // indexed with NaN and returns undefined.
      expect(getCumulativeEmissions(schedule, Number.NaN)).toBeUndefined();
    });
  });

  describe('type surface', () => {
    it('should expose the EmissionsSchedule shape used by consumers', () => {
      // Compile-time check that the exported type matches the runtime shape.
      const s: EmissionsSchedule = schedule;
      expect(s.params).toBeDefined();
      expect(Array.isArray(s.emissions)).toBe(true);
      expect(Array.isArray(s.cumulative)).toBe(true);
      expect(typeof s.totalEpochs).toBe('number');
      expect(typeof s.milestones.epochTo33Pct).toBe('number');
    });
  });
});
