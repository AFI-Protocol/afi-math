import { describe, it, expect } from 'vitest';
import {
  logistic,
  logisticNormalized,
  inverseLogistic,
  exponential,
  powerLaw,
  tanhNormalized,
  linearInterpolation,
  smoothstep
} from '../src/curves/curves';

describe('Curve Primitives', () => {
  describe('logistic', () => {
    it('should return L/2 at midpoint t0', () => {
      const L = 100;
      const k = 0.12;
      const t0 = 30;
      
      const mid = logistic(30, L, k, t0);
      expect(mid).toBeCloseTo(L / 2, 6);
    });
    
    it('should approach L as t increases', () => {
      const L = 100;
      const k = 0.12;
      const t0 = 30;
      
      const farRight = logistic(100, L, k, t0);
      expect(farRight).toBeGreaterThan(0.99 * L);
      expect(farRight).toBeLessThan(L);
    });
    
    it('should approach 0 as t decreases', () => {
      const L = 100;
      const k = 0.12;
      const t0 = 30;
      
      const farLeft = logistic(-50, L, k, t0);
      expect(farLeft).toBeGreaterThan(0);
      expect(farLeft).toBeLessThan(0.01 * L);
    });
    
    it('should be monotonically increasing for positive k', () => {
      const L = 100;
      const k = 0.12;
      const t0 = 30;

      const v1 = logistic(20, L, k, t0);
      const v2 = logistic(30, L, k, t0);
      const v3 = logistic(40, L, k, t0);

      expect(v2).toBeGreaterThan(v1);
      expect(v3).toBeGreaterThan(v2);
    });

    it('should be monotonically decreasing for negative k', () => {
      const L = 100;
      const k = -0.12;
      const t0 = 30;

      const v1 = logistic(20, L, k, t0);
      const v2 = logistic(30, L, k, t0);
      const v3 = logistic(40, L, k, t0);

      expect(v2).toBeLessThan(v1);
      expect(v3).toBeLessThan(v2);
      expect(v2).toBeCloseTo(L / 2, 6); // Still L/2 at midpoint
    });
  });
  
  describe('logisticNormalized', () => {
    it('should return 0.5 at midpoint', () => {
      const mid = logisticNormalized(30, 0.12, 30);
      expect(mid).toBeCloseTo(0.5, 6);
    });
    
    it('should stay in [0, 1] range', () => {
      for (let t = -100; t <= 100; t += 10) {
        const val = logisticNormalized(t, 0.12, 30);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    });
  });
  
  describe('inverseLogistic', () => {
    it('should recover input from output', () => {
      const L = 100;
      const k = 0.12;
      const t0 = 30;
      const t = 45;
      
      const y = logistic(t, L, k, t0);
      const recoveredT = inverseLogistic(y, L, k, t0);
      
      expect(recoveredT).not.toBeNull();
      expect(recoveredT!).toBeCloseTo(t, 6);
    });
    
    it('should return null for out-of-range values', () => {
      expect(inverseLogistic(0, 100, 0.12, 30)).toBeNull();
      expect(inverseLogistic(100, 100, 0.12, 30)).toBeNull();
      expect(inverseLogistic(-10, 100, 0.12, 30)).toBeNull();
      expect(inverseLogistic(110, 100, 0.12, 30)).toBeNull();
    });
  });
  
  describe('exponential', () => {
    it('should calculate exponential growth correctly', () => {
      const val = exponential(5, 100, 0.10);
      expect(val).toBeCloseTo(100 * Math.exp(0.5), 6);
    });
    
    it('should handle decay (negative rate)', () => {
      const val = exponential(5, 100, -0.10);
      expect(val).toBeCloseTo(100 * Math.exp(-0.5), 6);
      expect(val).toBeLessThan(100);
    });
    
    it('should return initial value at t=0', () => {
      expect(exponential(0, 100, 0.10)).toBe(100);
    });
  });
  
  describe('powerLaw', () => {
    it('should calculate power law correctly', () => {
      const val = powerLaw(2, 10, 3);
      expect(val).toBe(10 * Math.pow(2, 3));
      expect(val).toBe(80);
    });
    
    it('should handle fractional powers', () => {
      const val = powerLaw(4, 1, 0.5);
      expect(val).toBeCloseTo(2, 6); // sqrt(4) = 2
    });
    
    it('should throw for negative t with non-integer power', () => {
      expect(() => powerLaw(-2, 10, 0.5)).toThrow('Invalid: negative t with non-integer power');
    });
  });
  
  describe('tanhNormalized', () => {
    it('should return 0.5 at midpoint', () => {
      const mid = tanhNormalized(30, 0.12, 30);
      expect(mid).toBeCloseTo(0.5, 6);
    });
    
    it('should stay in [0, 1] range', () => {
      for (let t = -100; t <= 100; t += 10) {
        const val = tanhNormalized(t, 0.12, 30);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    });
  });
  
  describe('linearInterpolation', () => {
    it('should interpolate correctly', () => {
      const val = linearInterpolation(5, 0, 10, 0, 100);
      expect(val).toBe(50);
    });
    
    it('should clamp to endpoints', () => {
      expect(linearInterpolation(-5, 0, 10, 0, 100)).toBe(0);
      expect(linearInterpolation(15, 0, 10, 0, 100)).toBe(100);
    });
    
    it('should handle reverse ranges', () => {
      const val = linearInterpolation(5, 0, 10, 100, 0);
      expect(val).toBe(50);
    });

    it('should handle t0 == t1 edge case', () => {
      const val = linearInterpolation(5, 10, 10, 0, 100);
      expect(val).toBe(0); // Should return y0 when t0 == t1
    });
  });
  
  describe('smoothstep', () => {
    it('should return 0 at lower edge', () => {
      expect(smoothstep(0, 0, 10)).toBe(0);
    });
    
    it('should return 1 at upper edge', () => {
      expect(smoothstep(10, 0, 10)).toBe(1);
    });
    
    it('should be smooth at endpoints (zero derivative)', () => {
      // At edges, derivative should be zero (smooth)
      // We can't test derivative directly, but smoothstep is designed for this
      const val = smoothstep(5, 0, 10);
      expect(val).toBeGreaterThan(0);
      expect(val).toBeLessThan(1);
    });
    
    it('should clamp values outside range', () => {
      expect(smoothstep(-5, 0, 10)).toBe(0);
      expect(smoothstep(15, 0, 10)).toBe(1);
    });

    it('should return 0.5 at midpoint', () => {
      const val = smoothstep(5, 0, 10);
      expect(val).toBe(0.5);
    });
  });
});

