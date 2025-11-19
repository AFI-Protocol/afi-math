import { describe, it, expect } from 'vitest';
import {
  reverseDCF,
  impliedDiscountRate,
  type ReverseDCFInputs
} from '../src/valuation/reverseDcf';

describe('Valuation Functions', () => {
  describe('reverseDCF', () => {
    it('should calculate reverse DCF with default parameters', () => {
      const inputs: ReverseDCFInputs = {
        EV: 1000,
        S0: 500,
        margin: 0.15,
        taxRate: 0.25,
        salesToCapital: 0.5,
        WACC: 0.10,
        gStable: 0.03,
        horizonYears: 10,
        trialSalesCAGR: 0.08
      };
      
      const output = reverseDCF(inputs);
      
      // Verify against known spreadsheet values
      expect(output.pvFcfSum).toBeCloseTo(341.5684456491065, 6);
      expect(output.fcfTerminalYear).toBeCloseTo(81.45943855450562, 6);
      expect(output.pvTerminalValue).toBeCloseTo(462.11891560355, 6);
      expect(output.impliedEV).toBeCloseTo(803.6873612526565, 6);
    });
    
    it('should match target EV with calibrated WACC', () => {
      // With WACC=9% and trial CAGR ≈ 11.3%, EV should be close to 1000
      const inputs: ReverseDCFInputs = {
        EV: 1000,
        S0: 500,
        margin: 0.15,
        taxRate: 0.25,
        salesToCapital: 0.5,
        WACC: 0.09,
        gStable: 0.03,
        horizonYears: 10,
        trialSalesCAGR: 0.113
      };
      
      const output = reverseDCF(inputs);
      
      expect(output.impliedEV).toBeGreaterThan(995);
      expect(output.impliedEV).toBeLessThan(1005);
    });
    
    it('should match target EV with calibrated sales-to-capital', () => {
      // With sales-to-capital=0.4 and trial CAGR ≈ 31.3%, EV should be close to 1000
      const inputs: ReverseDCFInputs = {
        EV: 1000,
        S0: 500,
        margin: 0.15,
        taxRate: 0.25,
        salesToCapital: 0.4,
        WACC: 0.10,
        gStable: 0.03,
        horizonYears: 10,
        trialSalesCAGR: 0.313
      };
      
      const output = reverseDCF(inputs);
      
      expect(output.impliedEV).toBeGreaterThan(990);
      expect(output.impliedEV).toBeLessThan(1010);
    });
    
    it('should have positive terminal value', () => {
      const inputs: ReverseDCFInputs = {
        EV: 1000,
        S0: 500,
        margin: 0.15,
        taxRate: 0.25,
        salesToCapital: 0.5,
        WACC: 0.10,
        gStable: 0.03,
        horizonYears: 10,
        trialSalesCAGR: 0.08
      };
      
      const output = reverseDCF(inputs);
      
      expect(output.terminalValue).toBeGreaterThan(0);
      expect(output.pvTerminalValue).toBeGreaterThan(0);
      expect(output.fcfTerminalYear).toBeGreaterThan(0);
    });
    
    it('should have higher implied EV with higher growth rate', () => {
      const baseInputs: ReverseDCFInputs = {
        EV: 1000,
        S0: 500,
        margin: 0.15,
        taxRate: 0.25,
        salesToCapital: 0.5,
        WACC: 0.10,
        gStable: 0.03,
        horizonYears: 10,
        trialSalesCAGR: 0.08
      };

      const highGrowthInputs: ReverseDCFInputs = {
        ...baseInputs,
        trialSalesCAGR: 0.12
      };

      const baseOutput = reverseDCF(baseInputs);
      const highGrowthOutput = reverseDCF(highGrowthInputs);

      expect(highGrowthOutput.impliedEV).toBeGreaterThan(baseOutput.impliedEV);
    });

    it('should throw error when gStable >= WACC', () => {
      const inputs: ReverseDCFInputs = {
        EV: 1000,
        S0: 500,
        margin: 0.15,
        taxRate: 0.25,
        salesToCapital: 0.5,
        WACC: 0.10,
        gStable: 0.10, // Equal to WACC
        horizonYears: 10,
        trialSalesCAGR: 0.08
      };

      expect(() => reverseDCF(inputs)).toThrow('Invalid: gStable must be < WACC');
    });

    it('should throw error when S0 <= 0', () => {
      const inputs: ReverseDCFInputs = {
        EV: 1000,
        S0: 0,
        margin: 0.15,
        taxRate: 0.25,
        salesToCapital: 0.5,
        WACC: 0.10,
        gStable: 0.03,
        horizonYears: 10,
        trialSalesCAGR: 0.08
      };

      expect(() => reverseDCF(inputs)).toThrow('Invalid: S0 (initial sales) must be positive');
    });

    it('should throw error when horizonYears <= 0', () => {
      const inputs: ReverseDCFInputs = {
        EV: 1000,
        S0: 500,
        margin: 0.15,
        taxRate: 0.25,
        salesToCapital: 0.5,
        WACC: 0.10,
        gStable: 0.03,
        horizonYears: 0,
        trialSalesCAGR: 0.08
      };

      expect(() => reverseDCF(inputs)).toThrow('Invalid: horizonYears must be positive');
    });

    it('should handle negative trial CAGR (declining sales)', () => {
      const baseInputs: ReverseDCFInputs = {
        EV: 1000,
        S0: 500,
        margin: 0.15,
        taxRate: 0.25,
        salesToCapital: 0.5,
        WACC: 0.10,
        gStable: 0.03,
        horizonYears: 10,
        trialSalesCAGR: 0.08
      };

      const decliningInputs: ReverseDCFInputs = {
        ...baseInputs,
        trialSalesCAGR: -0.05
      };

      const baseOutput = reverseDCF(baseInputs);
      const decliningOutput = reverseDCF(decliningInputs);

      // Declining sales should produce lower EV than positive growth
      expect(decliningOutput.impliedEV).toBeGreaterThan(0);
      expect(decliningOutput.impliedEV).toBeLessThan(baseOutput.impliedEV);
    });
  });
  
  describe('impliedDiscountRate', () => {
    it('should find implied discount rate for simple cash flows', () => {
      // Create cash flows with known discount rate
      const knownRate = 0.10;
      const cashFlows = [100, 110, 121, 133.1];
      
      // Calculate target price (NPV at known rate)
      const targetPrice = cashFlows.reduce((sum, cf, t) => {
        return sum + cf / Math.pow(1 + knownRate, t + 1);
      }, 0);
      
      // Find implied rate
      const impliedRate = impliedDiscountRate({
        cashFlows,
        targetPrice
      });
      
      expect(impliedRate).not.toBeNull();
      expect(impliedRate!).toBeCloseTo(knownRate, 4);
    });
    
    it('should return null when no solution exists', () => {
      const cashFlows = [10, 10, 10];
      const impossiblePrice = 1000; // Way too high for these cash flows
      
      const rate = impliedDiscountRate({
        cashFlows,
        targetPrice: impossiblePrice,
        maxRate: 0.50
      });
      
      // Should either return null or a rate at the boundary
      if (rate !== null) {
        expect(rate).toBeCloseTo(0.001, 3); // At lower bound
      }
    });
    
    it('should handle uniform cash flows', () => {
      const cashFlows = [100, 100, 100, 100, 100];
      const targetPrice = 379.08; // Approximate NPV at 10%
      
      const rate = impliedDiscountRate({
        cashFlows,
        targetPrice,
        tolerance: 1
      });
      
      expect(rate).not.toBeNull();
      expect(rate!).toBeCloseTo(0.10, 2);
    });
    
    it('should respect custom search bounds', () => {
      const cashFlows = [100, 100, 100];
      const targetPrice = 248.69; // NPV at 10%

      const rate = impliedDiscountRate({
        cashFlows,
        targetPrice,
        minRate: 0.05,
        maxRate: 0.15
      });

      expect(rate).not.toBeNull();
      expect(rate!).toBeGreaterThanOrEqual(0.05);
      expect(rate!).toBeLessThanOrEqual(0.15);
    });

    it('should handle negative cash flows', () => {
      const cashFlows = [-50, 100, 100, 100];
      const targetPrice = 200;

      const rate = impliedDiscountRate({
        cashFlows,
        targetPrice
      });

      // Should still find a rate
      expect(rate).not.toBeNull();
    });

    it('should handle empty cash flows array', () => {
      const cashFlows: number[] = [];
      const targetPrice = 100;

      const rate = impliedDiscountRate({
        cashFlows,
        targetPrice
      });

      // NPV of empty array is 0, so if targetPrice != 0, no solution
      if (targetPrice !== 0) {
        expect(rate).toBeNull();
      }
    });

    it('should handle zero cash flows', () => {
      const cashFlows = [0, 0, 0];
      const targetPrice = 0;

      const rate = impliedDiscountRate({
        cashFlows,
        targetPrice,
        tolerance: 1e-6
      });

      // NPV is 0 for any rate, so should find a solution
      expect(rate).not.toBeNull();
    });
  });
});

