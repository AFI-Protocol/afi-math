/**
 * Curve Primitives
 * 
 * Mathematical curve functions used for scoring, confidence shaping, and decay modeling.
 * All functions are pure and deterministic.
 */

/**
 * Standard logistic (sigmoid) function.
 * 
 * Formula: f(t) = L / (1 + e^(-k*(t - t0)))
 * 
 * Properties:
 * - At t = t0, f(t) = L/2 (midpoint)
 * - As t → ∞, f(t) → L (upper asymptote)
 * - As t → -∞, f(t) → 0 (lower asymptote)
 * - k controls steepness (higher k = steeper curve)
 * 
 * @param t - Input value (e.g., time, score, or any continuous variable)
 * @param L - Maximum value (upper asymptote)
 * @param k - Steepness parameter (positive for increasing, negative for decreasing)
 * @param t0 - Midpoint (inflection point where value = L/2)
 * @returns Logistic curve value at t
 */
export function logistic(t: number, L: number, k: number, t0: number): number {
  return L / (1 + Math.exp(-k * (t - t0)));
}

/**
 * Normalized logistic function (0 to 1 range).
 * 
 * Convenience wrapper for logistic with L=1.
 * 
 * @param t - Input value
 * @param k - Steepness parameter
 * @param t0 - Midpoint
 * @returns Value in [0, 1]
 */
export function logisticNormalized(t: number, k: number, t0: number): number {
  return logistic(t, 1, k, t0);
}

/**
 * Inverse logistic (logit) function.
 * 
 * Given a logistic output y, recover the input t.
 * Formula: t = t0 - (1/k) * ln((L/y) - 1)
 * 
 * @param y - Logistic output value (must be in (0, L))
 * @param L - Maximum value
 * @param k - Steepness parameter
 * @param t0 - Midpoint
 * @returns Input value t, or null if y is out of valid range
 */
export function inverseLogistic(y: number, L: number, k: number, t0: number): number | null {
  if (y <= 0 || y >= L) {
    return null; // Out of valid range
  }
  
  return t0 - (1 / k) * Math.log((L / y) - 1);
}

/**
 * Exponential growth/decay curve.
 * 
 * Formula: f(t) = A * e^(r*t)
 * 
 * @param t - Time or input value
 * @param A - Initial value at t=0
 * @param r - Growth rate (positive) or decay rate (negative)
 * @returns Exponential value at t
 */
export function exponential(t: number, A: number, r: number): number {
  return A * Math.exp(r * t);
}

/**
 * Power law curve.
 * 
 * Formula: f(t) = A * t^p
 * 
 * @param t - Input value (must be positive for non-integer p)
 * @param A - Scaling constant
 * @param p - Power exponent
 * @returns Power law value at t
 */
export function powerLaw(t: number, A: number, p: number): number {
  if (t < 0 && p !== Math.floor(p)) {
    throw new Error("Invalid: negative t with non-integer power");
  }
  return A * Math.pow(t, p);
}

/**
 * Hyperbolic tangent (tanh) curve, normalized to [0, 1].
 * 
 * Formula: f(t) = (tanh(k*(t - t0)) + 1) / 2
 * 
 * Similar to logistic but with different shape characteristics.
 * 
 * @param t - Input value
 * @param k - Steepness parameter
 * @param t0 - Midpoint
 * @returns Value in [0, 1]
 */
export function tanhNormalized(t: number, k: number, t0: number): number {
  return (Math.tanh(k * (t - t0)) + 1) / 2;
}

/**
 * Linear interpolation between two points.
 * 
 * Formula: f(t) = y0 + (y1 - y0) * (t - t0) / (t1 - t0)
 * 
 * @param t - Input value
 * @param t0 - Start point x-coordinate
 * @param t1 - End point x-coordinate
 * @param y0 - Start point y-coordinate
 * @param y1 - End point y-coordinate
 * @returns Interpolated value, clamped to [y0, y1] if t is outside [t0, t1]
 */
export function linearInterpolation(
  t: number,
  t0: number,
  t1: number,
  y0: number,
  y1: number
): number {
  if (t1 === t0) {
    return y0; // Avoid division by zero
  }
  
  // Clamp t to [t0, t1]
  const tClamped = Math.max(t0, Math.min(t1, t));
  
  return y0 + (y1 - y0) * (tClamped - t0) / (t1 - t0);
}

/**
 * Smooth step function (smoothstep).
 * 
 * Formula: f(t) = 3t^2 - 2t^3 where t is normalized to [0, 1]
 * 
 * Provides smooth interpolation with zero derivatives at endpoints.
 * 
 * @param t - Input value
 * @param edge0 - Lower edge
 * @param edge1 - Upper edge
 * @returns Smoothstep value in [0, 1]
 */
export function smoothstep(t: number, edge0: number, edge1: number): number {
  // Clamp and normalize t to [0, 1]
  const x = Math.max(0, Math.min(1, (t - edge0) / (edge1 - edge0)));
  
  // Smoothstep polynomial
  return x * x * (3 - 2 * x);
}

