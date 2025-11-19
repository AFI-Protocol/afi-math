import { describe, it, expect } from 'vitest';
import {
  tvMultiple,
  presentValue,
  futureValue,
  impliedRate,
  presentValueContinuous,
  futureValueContinuous
} from '../src/timeValue/timeValue';

describe('Time Value Functions', () => {
  describe('tvMultiple', () => {
    it('should calculate terminal value multiple correctly', () => {
      const WACC = 0.10;
      const gStable = 0.04;
      const multiple = tvMultiple(WACC, gStable);
      
      expect(multiple).toBeCloseTo(1 / (WACC - gStable), 9);
      expect(multiple).toBeCloseTo(16.666666666666668, 9);
    });
    
    it('should throw error when gStable >= WACC', () => {
      expect(() => tvMultiple(0.10, 0.10)).toThrow('Invalid: gStable must be < WACC');
      expect(() => tvMultiple(0.10, 0.15)).toThrow('Invalid: gStable must be < WACC');
    });
  });
  
  describe('presentValue and futureValue', () => {
    it('should calculate PV correctly', () => {
      const pv = presentValue({
        futureValue: 1000,
        rate: 0.10,
        periods: 5
      });
      
      expect(pv).toBeCloseTo(620.9213230591, 6);
    });
    
    it('should calculate FV correctly', () => {
      const fv = futureValue({
        presentValue: 1000,
        rate: 0.10,
        periods: 5
      });
      
      expect(fv).toBeCloseTo(1610.51, 2);
    });
    
    it('should round-trip PV -> FV -> PV', () => {
      const initialPV = 1000;
      const rate = 0.08;
      const periods = 10;
      
      const fv = futureValue({ presentValue: initialPV, rate, periods });
      const finalPV = presentValue({ futureValue: fv, rate, periods });
      
      expect(finalPV).toBeCloseTo(initialPV, 6);
    });
    
    it('should handle zero periods', () => {
      expect(presentValue({ futureValue: 1000, rate: 0.10, periods: 0 })).toBe(1000);
      expect(futureValue({ presentValue: 1000, rate: 0.10, periods: 0 })).toBe(1000);
    });
    
    it('should handle zero rate', () => {
      expect(presentValue({ futureValue: 1000, rate: 0, periods: 5 })).toBe(1000);
      expect(futureValue({ presentValue: 1000, rate: 0, periods: 5 })).toBe(1000);
    });
    
    it('should handle negative rates', () => {
      const pv = presentValue({ futureValue: 1000, rate: -0.05, periods: 5 });
      expect(pv).toBeGreaterThan(1000); // Negative rate means FV < PV
    });

    it('should handle fractional periods', () => {
      const pv = presentValue({ futureValue: 1000, rate: 0.10, periods: 2.5 });
      expect(pv).toBeGreaterThan(0);
      expect(pv).toBeLessThan(1000);

      const fv = futureValue({ presentValue: 1000, rate: 0.10, periods: 2.5 });
      expect(fv).toBeGreaterThan(1000);
    });

    it('should throw error for rate = -1 in presentValue', () => {
      expect(() => presentValue({ futureValue: 1000, rate: -1, periods: 5 }))
        .toThrow('Invalid: rate cannot be -1');
    });

    it('should handle very high rates', () => {
      const fv = futureValue({ presentValue: 1000, rate: 2.0, periods: 5 });
      expect(fv).toBeGreaterThan(1000);
      expect(fv).toBeCloseTo(1000 * Math.pow(3, 5), 2);
    });
  });
  
  describe('impliedRate', () => {
    it('should calculate implied rate correctly', () => {
      const rate = impliedRate({
        presentValue: 1000,
        futureValue: 1610.51,
        periods: 5
      });
      
      expect(rate).not.toBeNull();
      expect(rate!).toBeCloseTo(0.10, 4);
    });
    
    it('should return 0 for equal PV and FV with zero periods', () => {
      const rate = impliedRate({
        presentValue: 1000,
        futureValue: 1000,
        periods: 0
      });
      
      expect(rate).toBe(0);
    });
    
    it('should return null for invalid inputs', () => {
      expect(impliedRate({
        presentValue: -1000,
        futureValue: 1500,
        periods: 5
      })).toBeNull();
      
      expect(impliedRate({
        presentValue: 1000,
        futureValue: -1500,
        periods: 5
      })).toBeNull();
    });
    
    it('should verify solution accuracy', () => {
      const pv = 1000;
      const fv = 2000;
      const periods = 10;

      const rate = impliedRate({ presentValue: pv, futureValue: fv, periods });
      expect(rate).not.toBeNull();

      // Verify the rate produces the correct FV
      const calculatedFV = futureValue({ presentValue: pv, rate: rate!, periods });
      expect(calculatedFV).toBeCloseTo(fv, 6);
    });

    it('should handle fractional periods', () => {
      const pv = 1000;
      const fv = 1500;
      const periods = 2.5;

      const rate = impliedRate({ presentValue: pv, futureValue: fv, periods });
      expect(rate).not.toBeNull();

      // Verify round-trip
      const calculatedFV = futureValue({ presentValue: pv, rate: rate!, periods });
      expect(calculatedFV).toBeCloseTo(fv, 6);
    });

    it('should handle very high rates', () => {
      const pv = 1000;
      const fv = 10000;
      const periods = 5;

      const rate = impliedRate({ presentValue: pv, futureValue: fv, periods });
      expect(rate).not.toBeNull();
      expect(rate!).toBeGreaterThan(0.5); // Should be ~58%
    });

    it('should handle very low rates', () => {
      const pv = 1000;
      const fv = 1001;
      const periods = 10;

      const rate = impliedRate({ presentValue: pv, futureValue: fv, periods });
      expect(rate).not.toBeNull();
      expect(rate!).toBeGreaterThan(0);
      expect(rate!).toBeLessThan(0.001);
    });

    it('should return null for zero PV', () => {
      expect(impliedRate({
        presentValue: 0,
        futureValue: 1000,
        periods: 5
      })).toBeNull();
    });

    it('should return null for zero FV', () => {
      expect(impliedRate({
        presentValue: 1000,
        futureValue: 0,
        periods: 5
      })).toBeNull();
    });
  });
  
  describe('continuous compounding', () => {
    it('should calculate PV with continuous compounding', () => {
      const pv = presentValueContinuous({
        futureValue: 1000,
        rate: 0.10,
        time: 5
      });
      
      expect(pv).toBeCloseTo(606.5306597126, 6);
    });
    
    it('should calculate FV with continuous compounding', () => {
      const fv = futureValueContinuous({
        presentValue: 1000,
        rate: 0.10,
        time: 5
      });
      
      expect(fv).toBeCloseTo(1648.7212707, 6);
    });
    
    it('should round-trip with continuous compounding', () => {
      const initialPV = 1000;
      const rate = 0.08;
      const time = 10;
      
      const fv = futureValueContinuous({ presentValue: initialPV, rate, time });
      const finalPV = presentValueContinuous({ futureValue: fv, rate, time });
      
      expect(finalPV).toBeCloseTo(initialPV, 6);
    });
  });
});

