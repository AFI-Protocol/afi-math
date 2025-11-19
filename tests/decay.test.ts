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
});

