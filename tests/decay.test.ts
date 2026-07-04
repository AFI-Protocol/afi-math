import { describe, it, expect } from 'vitest';
import {
  exponentialDecay,
  powerDecay,
  halfLifeFromLambda,
  lambdaFromHalfLife,
  remainingAfterHalfLives,
  adjustedHalfLife,
  timeWeightedScore,
  compositeDecayScore,
  greeksAdjustedHalfLife
} from '../src/decay/decayModels';

describe('Decay Models', () => {
  describe('exponentialDecay', () => {
    it('should halve value at one half-life', () => {
      const result = exponentialDecay({
        initialValue: 100,
        halfLife: 10,
        elapsed: 10
      });
      
      expect(result).toBeCloseTo(50, 6);
    });
    
    it('should quarter value at two half-lives', () => {
      const result = exponentialDecay({
        initialValue: 100,
        halfLife: 10,
        elapsed: 20
      });
      
      expect(result).toBeCloseTo(25, 6);
    });
    
    it('should approach zero over many half-lives', () => {
      const result = exponentialDecay({
        initialValue: 100,
        halfLife: 10,
        elapsed: 100
      });
      
      expect(result).toBeLessThan(0.1);
      expect(result).toBeGreaterThan(0);
    });
    
    it('should return initial value at t=0', () => {
      const result = exponentialDecay({
        initialValue: 100,
        halfLife: 10,
        elapsed: 0
      });
      
      expect(result).toBe(100);
    });
    
    it('should throw for non-positive half-life', () => {
      expect(() => exponentialDecay({
        initialValue: 100,
        halfLife: 0,
        elapsed: 10
      })).toThrow('Invalid: halfLife must be positive');
      
      expect(() => exponentialDecay({
        initialValue: 100,
        halfLife: -5,
        elapsed: 10
      })).toThrow('Invalid: halfLife must be positive');
    });
  });
  
  describe('powerDecay', () => {
    it('should decay according to power law', () => {
      const result = powerDecay({
        initialValue: 100,
        timeScale: 10,
        power: 2,
        elapsed: 10
      });
      
      // At t=timeScale, value = initial / (1+1)^power = 100 / 4 = 25
      expect(result).toBeCloseTo(25, 6);
    });
    
    it('should return initial value at t=0', () => {
      const result = powerDecay({
        initialValue: 100,
        timeScale: 10,
        power: 2,
        elapsed: 0
      });
      
      expect(result).toBe(100);
    });
    
    it('should throw for non-positive timeScale', () => {
      expect(() => powerDecay({
        initialValue: 100,
        timeScale: 0,
        power: 2,
        elapsed: 10
      })).toThrow('Invalid: timeScale must be positive');
    });
  });
  
  describe('halfLifeFromLambda and lambdaFromHalfLife', () => {
    it('should convert between half-life and lambda', () => {
      const halfLife = 10;
      const lambda = lambdaFromHalfLife({ halfLife });
      const recoveredHalfLife = halfLifeFromLambda({ lambda });
      
      expect(recoveredHalfLife).toBeCloseTo(halfLife, 9);
    });
    
    it('should calculate lambda correctly', () => {
      const lambda = lambdaFromHalfLife({ halfLife: 10 });
      expect(lambda).toBeCloseTo(Math.LN2 / 10, 9);
    });
    
    it('should throw for non-positive values', () => {
      expect(() => halfLifeFromLambda({ lambda: 0 })).toThrow('Invalid: lambda must be positive');
      expect(() => lambdaFromHalfLife({ halfLife: 0 })).toThrow('Invalid: halfLife must be positive');
    });
  });
  
  describe('remainingAfterHalfLives', () => {
    it('should return 0.5 after 1 half-life', () => {
      const remaining = remainingAfterHalfLives({ halfLives: 1 });
      expect(remaining).toBeCloseTo(0.5, 9);
    });
    
    it('should return 0.25 after 2 half-lives', () => {
      const remaining = remainingAfterHalfLives({ halfLives: 2 });
      expect(remaining).toBeCloseTo(0.25, 9);
    });
    
    it('should return 0.125 after 3 half-lives', () => {
      const remaining = remainingAfterHalfLives({ halfLives: 3 });
      expect(remaining).toBeCloseTo(0.125, 9);
    });
    
    it('should return 1 after 0 half-lives', () => {
      const remaining = remainingAfterHalfLives({ halfLives: 0 });
      expect(remaining).toBe(1);
    });
  });
  
  describe('adjustedHalfLife', () => {
    it('should shorten half-life with higher volatility', () => {
      const base = adjustedHalfLife({ baseHalfLife: 10, volatility: 1, conviction: 1 });
      const highVol = adjustedHalfLife({ baseHalfLife: 10, volatility: 2, conviction: 1 });

      expect(highVol).toBeLessThan(base);
      expect(highVol).toBeCloseTo(5, 6);
    });

    it('should lengthen half-life with higher conviction', () => {
      const base = adjustedHalfLife({ baseHalfLife: 10, volatility: 1, conviction: 1 });
      const highConv = adjustedHalfLife({ baseHalfLife: 10, volatility: 1, conviction: 2 });

      expect(highConv).toBeGreaterThan(base);
      expect(highConv).toBeCloseTo(20, 6);
    });

    it('should use defaults for optional parameters', () => {
      const result = adjustedHalfLife({ baseHalfLife: 10 });
      expect(result).toBe(10);
    });

    it('should throw for non-positive baseHalfLife', () => {
      expect(() => adjustedHalfLife({ baseHalfLife: 0 })).toThrow('Invalid: baseHalfLife must be positive');
    });

    it('should throw for non-positive volatility or conviction', () => {
      expect(() => adjustedHalfLife({ baseHalfLife: 10, volatility: 0 })).toThrow('Invalid: volatility and conviction must be positive');
      expect(() => adjustedHalfLife({ baseHalfLife: 10, conviction: 0 })).toThrow('Invalid: volatility and conviction must be positive');
    });
  });
  
  describe('timeWeightedScore', () => {
    it('should decay score over time', () => {
      const fresh = timeWeightedScore({ baseScore: 100, halfLife: 10, age: 0 });
      const aged = timeWeightedScore({ baseScore: 100, halfLife: 10, age: 10 });
      
      expect(fresh).toBe(100);
      expect(aged).toBeCloseTo(50, 6);
    });
  });
  
  describe('compositeDecayScore', () => {
    it('should average multiple decayed signals', () => {
      const signals = [
        { score: 100, halfLife: 10, age: 0 },
        { score: 100, halfLife: 10, age: 10 },
        { score: 100, halfLife: 10, age: 20 }
      ];
      
      const composite = compositeDecayScore(signals);
      
      // Average of 100, 50, 25 = 58.33...
      expect(composite).toBeCloseTo(58.333, 2);
    });
    
    it('should return 0 for empty array', () => {
      expect(compositeDecayScore([])).toBe(0);
    });
  });
  
  describe('greeksAdjustedHalfLife', () => {
    it('should shorten half-life for high theta', () => {
      const base = greeksAdjustedHalfLife({ baseHalfLife: 10, thetaPerDay: 0 });
      const highTheta = greeksAdjustedHalfLife({ baseHalfLife: 10, thetaPerDay: -0.5 });

      expect(highTheta).toBeLessThan(base);
    });

    it('should handle positive theta', () => {
      const result = greeksAdjustedHalfLife({ baseHalfLife: 10, thetaPerDay: 0.5 });
      expect(result).toBeLessThan(10);
    });

    it('should use absolute value of theta', () => {
      const negTheta = greeksAdjustedHalfLife({ baseHalfLife: 10, thetaPerDay: -0.5 });
      const posTheta = greeksAdjustedHalfLife({ baseHalfLife: 10, thetaPerDay: 0.5 });

      // Both should produce same result (uses abs value)
      expect(negTheta).toBeCloseTo(posTheta, 9);
    });

    it('should throw for non-positive baseHalfLife', () => {
      expect(() => greeksAdjustedHalfLife({ baseHalfLife: 0, thetaPerDay: 0.1 })).toThrow('Invalid: baseHalfLife must be positive');
    });
  });

  // --- Hardening invariants (deterministic parameter grids) ---
  // Grid-based rather than randomized so the suite stays fully deterministic
  // with zero new dependencies. Adopting fast-check property tests is a
  // recorded follow-up.
  describe('invariants (deterministic grids)', () => {
    const halfLives = [0.1, 1, 5, 14, 365];
    const elapsedTimes = [0, 0.5, 1, 3, 10, 100];

    it('exponentialDecay should equal initialValue * remainingAfterHalfLives(elapsed/halfLife)', () => {
      for (const halfLife of halfLives) {
        for (const elapsed of elapsedTimes) {
          const direct = exponentialDecay({ initialValue: 250, halfLife, elapsed });
          const viaHalfLives = 250 * remainingAfterHalfLives({ halfLives: elapsed / halfLife });
          const relErr = Math.abs(direct - viaHalfLives) / Math.max(Math.abs(viaHalfLives), Number.MIN_VALUE);
          expect(relErr).toBeLessThanOrEqual(1e-12);
        }
      }
    });

    it('exponentialDecay should be strictly decreasing in elapsed time', () => {
      for (const halfLife of halfLives) {
        let prev = Number.POSITIVE_INFINITY;
        for (const elapsed of elapsedTimes) {
          const v = exponentialDecay({ initialValue: 100, halfLife, elapsed });
          expect(v).toBeLessThan(prev);
          expect(v).toBeGreaterThan(0);
          prev = v;
        }
      }
    });

    it('powerDecay should be strictly decreasing in elapsed time for positive power', () => {
      for (const timeScale of [1, 10, 50]) {
        for (const power of [0.5, 1, 2]) {
          let prev = Number.POSITIVE_INFINITY;
          for (const elapsed of elapsedTimes) {
            const v = powerDecay({ initialValue: 100, timeScale, power, elapsed });
            expect(v).toBeLessThan(prev);
            expect(v).toBeGreaterThan(0);
            prev = v;
          }
        }
      }
    });

    it('lambdaFromHalfLife and halfLifeFromLambda should round-trip across a grid', () => {
      for (const halfLife of halfLives) {
        const lambda = lambdaFromHalfLife({ halfLife });
        const recovered = halfLifeFromLambda({ lambda });
        expect(Math.abs(recovered - halfLife) / halfLife).toBeLessThanOrEqual(1e-12);
      }
    });

    it('should be deterministic: repeated calls return bit-identical results', () => {
      const a = exponentialDecay({ initialValue: 123.456, halfLife: 7.5, elapsed: 3.25 });
      const b = exponentialDecay({ initialValue: 123.456, halfLife: 7.5, elapsed: 3.25 });
      expect(Object.is(a, b)).toBe(true);

      const c = greeksAdjustedHalfLife({ baseHalfLife: 10, thetaPerDay: -0.37 });
      const d = greeksAdjustedHalfLife({ baseHalfLife: 10, thetaPerDay: -0.37 });
      expect(Object.is(c, d)).toBe(true);
    });

    it('compositeDecayScore should be order-invariant up to float rounding', () => {
      const signals = [
        { score: 100, halfLife: 10, age: 0 },
        { score: 80, halfLife: 5, age: 3 },
        { score: 120, halfLife: 20, age: 15 }
      ];
      const forward = compositeDecayScore(signals);
      const reversed = compositeDecayScore([...signals].reverse());
      const relErr = Math.abs(forward - reversed) / Math.abs(forward);
      expect(relErr).toBeLessThanOrEqual(1e-12);
    });

    it('compositeDecayScore of identical signals should equal the single decayed score', () => {
      const one = timeWeightedScore({ baseScore: 90, halfLife: 12, age: 6 });
      const composite = compositeDecayScore([
        { score: 90, halfLife: 12, age: 6 },
        { score: 90, halfLife: 12, age: 6 },
        { score: 90, halfLife: 12, age: 6 }
      ]);
      expect(Math.abs(composite - one) / one).toBeLessThanOrEqual(1e-12);
    });
  });
});

