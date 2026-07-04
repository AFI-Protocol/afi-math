import { describe, it, expect } from 'vitest';
import * as afiMath from '../src/index';
import type {
  ReverseDCFInputs,
  ReverseDCFOutputs,
  EmissionsParams,
  EmissionsSchedule
} from '../src/index';

/**
 * Export-surface tests for the public barrel (`src/index.ts`).
 *
 * afi-math is the canonical executable off-chain math kernel package, so its
 * export surface is part of the protocol contract. These tests lock the
 * surface EXACTLY: they fail on accidental removals AND on accidental
 * additions, forcing any surface change to be deliberate and reviewed.
 */

/** Sorted own-key list of a module namespace object. */
function surfaceOf(ns: object): string[] {
  return Object.keys(ns).sort();
}

const EXPECTED_NAMESPACES = ['curves', 'decay', 'emissions', 'timeValue', 'valuation'] as const;

const EXPECTED_SURFACE: Record<(typeof EXPECTED_NAMESPACES)[number], string[]> = {
  timeValue: [
    'futureValue',
    'futureValueContinuous',
    'impliedRate',
    'presentValue',
    'presentValueContinuous',
    'tvMultiple'
  ].sort(),
  curves: [
    'exponential',
    'inverseLogistic',
    'linearInterpolation',
    'logistic',
    'logisticNormalized',
    'powerLaw',
    'smoothstep',
    'tanhNormalized'
  ].sort(),
  valuation: ['impliedDiscountRate', 'reverseDCF'].sort(),
  decay: [
    'adjustedHalfLife',
    'compositeDecayScore',
    'exponentialDecay',
    'greeksAdjustedHalfLife',
    'halfLifeFromLambda',
    'lambdaFromHalfLife',
    'powerDecay',
    'remainingAfterHalfLives',
    'timeWeightedScore'
  ].sort(),
  emissions: [
    'DEFAULT_EMISSIONS_PARAMS',
    'buildEmissionsSchedule',
    'getCumulativeEmissions',
    'getEmittedFraction',
    'getEpochEmission',
    'getRemainingSupply',
    'shapeWeights'
  ].sort()
};

describe('Public export surface (src/index.ts barrel)', () => {
  it('should export exactly the five kernel namespaces (no more, no fewer)', () => {
    const runtimeKeys = surfaceOf(afiMath);
    expect(runtimeKeys).toEqual([...EXPECTED_NAMESPACES].sort());
  });

  it.each(EXPECTED_NAMESPACES.map(ns => [ns] as const))(
    'should expose exactly the expected members in the %s namespace',
    ns => {
      expect(surfaceOf(afiMath[ns])).toEqual(EXPECTED_SURFACE[ns]);
    }
  );

  it('should export functions for every member except the documented constants', () => {
    const constants = new Set(['emissions.DEFAULT_EMISSIONS_PARAMS']);
    for (const ns of EXPECTED_NAMESPACES) {
      for (const member of EXPECTED_SURFACE[ns]) {
        const value = (afiMath[ns] as Record<string, unknown>)[member];
        if (constants.has(`${ns}.${member}`)) {
          expect(typeof value).toBe('object');
        } else {
          expect(typeof value, `${ns}.${member} should be a function`).toBe('function');
        }
      }
    }
  });

  describe('barrel wiring smoke tests (one call per namespace)', () => {
    it('timeValue.presentValue is callable through the barrel', () => {
      const pv = afiMath.timeValue.presentValue({ futureValue: 1000, rate: 0.1, periods: 5 });
      expect(pv).toBeCloseTo(620.9213230591, 6);
    });

    it('curves.logisticNormalized is callable through the barrel', () => {
      expect(afiMath.curves.logisticNormalized(30, 0.12, 30)).toBeCloseTo(0.5, 9);
    });

    it('valuation.impliedDiscountRate is callable through the barrel', () => {
      const rate = afiMath.valuation.impliedDiscountRate({
        cashFlows: [100, 100, 100],
        targetPrice: 248.685,
        tolerance: 1e-2
      });
      expect(rate).not.toBeNull();
      expect(rate!).toBeCloseTo(0.1, 2);
    });

    it('decay.exponentialDecay is callable through the barrel', () => {
      const v = afiMath.decay.exponentialDecay({ initialValue: 100, halfLife: 10, elapsed: 10 });
      expect(v).toBeCloseTo(50, 9);
    });

    it('emissions.buildEmissionsSchedule is callable through the barrel', () => {
      const s = afiMath.emissions.buildEmissionsSchedule();
      expect(s.totalEpochs).toBe(2756);
      expect(afiMath.emissions.getEpochEmission(s, 1)).toBeGreaterThan(0);
    });
  });

  describe('type re-exports', () => {
    it('should re-export ReverseDCFInputs/ReverseDCFOutputs usable as types', () => {
      const inputs: ReverseDCFInputs = {
        EV: 1000,
        S0: 500,
        margin: 0.15,
        taxRate: 0.25,
        salesToCapital: 0.5,
        WACC: 0.1,
        gStable: 0.03,
        horizonYears: 10,
        trialSalesCAGR: 0.08
      };
      const outputs: ReverseDCFOutputs = afiMath.valuation.reverseDCF(inputs);
      expect(outputs.impliedEV).toBeGreaterThan(0);
    });

    it('should re-export EmissionsParams/EmissionsSchedule usable as types', () => {
      const params: Partial<EmissionsParams> = { epochsPerYear: 12 };
      const schedule: EmissionsSchedule = afiMath.emissions.buildEmissionsSchedule(params);
      expect(schedule.params.epochsPerYear).toBe(12);
    });
  });
});
