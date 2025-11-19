/**
 * Reverse DCF and Valuation Functions
 * 
 * Implements reverse discounted cash flow analysis and implied discount rate calculations.
 * Used for fundamental analysis and signal valuation in AFI Protocol.
 */

/**
 * Input parameters for reverse DCF calculation.
 */
export interface ReverseDCFInputs {
  /** Enterprise Value (target or observed market value) */
  EV: number;
  
  /** Initial sales (S0) */
  S0: number;
  
  /** Operating margin as fraction (e.g., 0.15 for 15% NOPAT margin) */
  margin: number;
  
  /** Tax rate as fraction (e.g., 0.25 for 25%) */
  taxRate: number;
  
  /** Sales-to-capital ratio (incremental capital efficiency) */
  salesToCapital: number;
  
  /** Weighted Average Cost of Capital (as decimal, e.g., 0.10 for 10%) */
  WACC: number;
  
  /** Stable perpetual growth rate (as decimal, e.g., 0.03 for 3%) */
  gStable: number;
  
  /** Forecast horizon in years */
  horizonYears: number;
  
  /** Trial sales CAGR (compound annual growth rate) to test */
  trialSalesCAGR: number;
}

/**
 * Output results from reverse DCF calculation.
 */
export interface ReverseDCFOutputs {
  /** Sum of present values of explicit forecast period FCFs */
  pvFcfSum: number;
  
  /** Free cash flow in the terminal year */
  fcfTerminalYear: number;
  
  /** Terminal value (perpetuity value at end of forecast) */
  terminalValue: number;
  
  /** Present value of terminal value */
  pvTerminalValue: number;
  
  /** Implied enterprise value (PV of FCFs + PV of terminal value) */
  impliedEV: number;
}

/**
 * Perform reverse DCF calculation.
 *
 * Given a trial sales CAGR, calculates the implied enterprise value.
 * This can be used iteratively to find the CAGR that matches a target EV.
 *
 * Process:
 * 1. Project sales over horizon using trial CAGR
 * 2. Calculate NOPAT (sales * margin * (1 - tax))
 * 3. Calculate reinvestment (delta sales * sales-to-capital)
 * 4. Calculate FCF (NOPAT - reinvestment)
 * 5. Discount FCFs to present value
 * 6. Calculate terminal value using Gordon Growth
 * 7. Sum PV of FCFs and PV of terminal value
 *
 * @param inputs - Reverse DCF input parameters
 * @returns Reverse DCF outputs including implied EV
 * @throws Error if gStable >= WACC (invalid perpetuity)
 * @throws Error if S0 <= 0 or horizonYears <= 0
 */
export function reverseDCF(inputs: ReverseDCFInputs): ReverseDCFOutputs {
  // Validate inputs
  if (inputs.gStable >= inputs.WACC) {
    throw new Error("Invalid: gStable must be < WACC for valid perpetuity");
  }

  if (inputs.S0 <= 0) {
    throw new Error("Invalid: S0 (initial sales) must be positive");
  }

  if (inputs.horizonYears <= 0) {
    throw new Error("Invalid: horizonYears must be positive");
  }

  const pvFcfs: number[] = [];
  const onePlusWACC = 1 + inputs.WACC;
  
  /**
   * Calculate sales at year t using CAGR.
   */
  function salesAt(t: number): number {
    return inputs.S0 * Math.pow(1 + inputs.trialSalesCAGR, t);
  }
  
  // Explicit forecast period
  let prevSales = inputs.S0;
  
  for (let t = 1; t <= inputs.horizonYears; t++) {
    const sales = salesAt(t);
    
    // NOPAT = Sales * Margin * (1 - Tax)
    const nopat = sales * inputs.margin * (1 - inputs.taxRate);
    
    // Reinvestment = Change in Sales * Sales-to-Capital ratio
    const reinvest = (sales - prevSales) * inputs.salesToCapital;
    
    // Free Cash Flow = NOPAT - Reinvestment
    const fcf = nopat - reinvest;
    
    // Present Value of FCF
    const pv = fcf / Math.pow(onePlusWACC, t);
    pvFcfs.push(pv);
    
    prevSales = sales;
  }
  
  // Sum of PV of explicit FCFs
  const pvFcfSum = pvFcfs.reduce((sum, pv) => sum + pv, 0);
  
  // Terminal year calculations
  const salesTerminal = salesAt(inputs.horizonYears);
  const salesPriorYear = salesAt(inputs.horizonYears - 1);
  
  const nopatTerminal = salesTerminal * inputs.margin * (1 - inputs.taxRate);
  const reinvestTerminal = (salesTerminal - salesPriorYear) * inputs.salesToCapital;
  const fcfTerminal = nopatTerminal - reinvestTerminal;
  
  // Terminal Value using Gordon Growth Model
  // TV = FCF_T * (1 + g) / (WACC - g)
  const terminalValue = fcfTerminal * (1 + inputs.gStable) / (inputs.WACC - inputs.gStable);
  
  // Present Value of Terminal Value
  const pvTerminalValue = terminalValue / Math.pow(onePlusWACC, inputs.horizonYears);
  
  // Implied Enterprise Value
  const impliedEV = pvFcfSum + pvTerminalValue;
  
  return {
    pvFcfSum,
    fcfTerminalYear: fcfTerminal,
    terminalValue,
    pvTerminalValue,
    impliedEV
  };
}

/**
 * Find implied discount rate (WACC) given cash flows and target price.
 *
 * Uses binary search to find the discount rate that makes NPV equal to targetPrice.
 *
 * @param params - Object containing cashFlows array, targetPrice, and optional search parameters
 * @returns Implied discount rate, or null if no solution found within tolerance/iterations
 */
export function impliedDiscountRate(params: {
  cashFlows: number[];
  targetPrice: number;
  minRate?: number;
  maxRate?: number;
  tolerance?: number;
  maxIterations?: number;
}): number | null {
  const {
    cashFlows,
    targetPrice,
    minRate = 0.001,
    maxRate = 0.50,
    tolerance = 1e-6,
    maxIterations = 100
  } = params;
  
  // Calculate NPV for a given rate
  function npv(rate: number): number {
    return cashFlows.reduce((sum, cf, t) => {
      return sum + cf / Math.pow(1 + rate, t + 1);
    }, 0);
  }
  
  // Binary search for rate where NPV = targetPrice
  let low = minRate;
  let high = maxRate;
  
  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    const npvMid = npv(mid);
    
    if (Math.abs(npvMid - targetPrice) < tolerance) {
      return mid;
    }
    
    if (npvMid > targetPrice) {
      low = mid; // NPV too high, need higher discount rate
    } else {
      high = mid; // NPV too low, need lower discount rate
    }
  }
  
  return null; // No solution found within iterations
}

