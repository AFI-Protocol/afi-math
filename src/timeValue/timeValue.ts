/**
 * Time Value of Money Functions
 * 
 * Pure mathematical functions for present value, future value, and implied rate calculations.
 * Used across AFI Protocol for valuation, discounting, and terminal value computations.
 */

/**
 * Calculate the terminal value multiple using Gordon Growth Model.
 * 
 * Formula: TV Multiple = 1 / (WACC - g_stable)
 * 
 * @param WACC - Weighted Average Cost of Capital (as decimal, e.g., 0.10 for 10%)
 * @param gStable - Stable perpetual growth rate (as decimal, e.g., 0.03 for 3%)
 * @returns Terminal value multiple
 * @throws Error if gStable >= WACC (invalid perpetuity)
 */
export function tvMultiple(WACC: number, gStable: number): number {
  if (gStable >= WACC) {
    throw new Error("Invalid: gStable must be < WACC for valid perpetuity");
  }
  return 1 / (WACC - gStable);
}

/**
 * Calculate present value from future value.
 * 
 * Formula: PV = FV / (1 + r)^n
 * 
 * @param params - Object containing futureValue, rate, and periods
 * @returns Present value
 */
export function presentValue(params: {
  futureValue: number;
  rate: number;
  periods: number;
}): number {
  const { futureValue, rate, periods } = params;
  
  if (periods === 0) return futureValue;
  if (rate === -1) throw new Error("Invalid: rate cannot be -1 (division by zero)");
  
  return futureValue / Math.pow(1 + rate, periods);
}

/**
 * Calculate future value from present value.
 * 
 * Formula: FV = PV * (1 + r)^n
 * 
 * @param params - Object containing presentValue, rate, and periods
 * @returns Future value
 */
export function futureValue(params: {
  presentValue: number;
  rate: number;
  periods: number;
}): number {
  const { presentValue, rate, periods } = params;
  
  if (periods === 0) return presentValue;
  
  return presentValue * Math.pow(1 + rate, periods);
}

/**
 * Calculate implied rate given present value, future value, and periods.
 * Uses analytical solution: r = (FV/PV)^(1/n) - 1
 *
 * Formula: Solve for r in FV = PV * (1 + r)^n
 *
 * @param params - Object containing presentValue, futureValue, periods, and optional tolerance
 * @returns Implied rate, or null if no solution found (e.g., negative PV or FV)
 */
export function impliedRate(params: {
  presentValue: number;
  futureValue: number;
  periods: number;
  tolerance?: number;
  maxIterations?: number;
}): number | null {
  const {
    presentValue,
    futureValue,
    periods,
    tolerance = 1e-9
  } = params;
  
  // Handle edge cases
  if (periods === 0) {
    return presentValue === futureValue ? 0 : null;
  }
  
  if (presentValue <= 0 || futureValue <= 0) {
    return null; // Invalid inputs for rate calculation
  }
  
  // Analytical solution: r = (FV/PV)^(1/n) - 1
  const ratio = futureValue / presentValue;
  const impliedR = Math.pow(ratio, 1 / periods) - 1;
  
  // Verify solution
  const calculatedFV = presentValue * Math.pow(1 + impliedR, periods);
  if (Math.abs(calculatedFV - futureValue) < tolerance) {
    return impliedR;
  }
  
  return null;
}

/**
 * Calculate present value with continuous compounding.
 * 
 * Formula: PV = FV * e^(-r*t)
 * 
 * @param params - Object containing futureValue, rate, and time
 * @returns Present value with continuous compounding
 */
export function presentValueContinuous(params: {
  futureValue: number;
  rate: number;
  time: number;
}): number {
  const { futureValue, rate, time } = params;
  return futureValue * Math.exp(-rate * time);
}

/**
 * Calculate future value with continuous compounding.
 * 
 * Formula: FV = PV * e^(r*t)
 * 
 * @param params - Object containing presentValue, rate, and time
 * @returns Future value with continuous compounding
 */
export function futureValueContinuous(params: {
  presentValue: number;
  rate: number;
  time: number;
}): number {
  const { presentValue, rate, time } = params;
  return presentValue * Math.exp(rate * time);
}

