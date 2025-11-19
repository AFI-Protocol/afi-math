/**
 * Signal Decay Models
 * 
 * Mathematical models for signal decay, half-life calculations, and time-based scoring.
 * Used for signal quality assessment and Proof of Insight (PoI) scoring in AFI Protocol.
 */

/**
 * Calculate exponential decay value.
 * 
 * Formula: V(t) = V0 * e^(-λ*t) where λ = ln(2) / half-life
 * 
 * @param params - Object containing initialValue, halfLife, and elapsed time
 * @returns Decayed value at time t
 */
export function exponentialDecay(params: {
  initialValue: number;
  halfLife: number;
  elapsed: number;
}): number {
  const { initialValue, halfLife, elapsed } = params;
  
  if (halfLife <= 0) {
    throw new Error("Invalid: halfLife must be positive");
  }
  
  // Decay constant: λ = ln(2) / half-life
  const lambda = Math.LN2 / halfLife;
  
  return initialValue * Math.exp(-lambda * elapsed);
}

/**
 * Calculate power law decay value.
 * 
 * Formula: V(t) = V0 / (1 + t/t0)^p
 * 
 * @param params - Object containing initialValue, timeScale, power, and elapsed time
 * @returns Decayed value at time t
 */
export function powerDecay(params: {
  initialValue: number;
  timeScale: number;
  power: number;
  elapsed: number;
}): number {
  const { initialValue, timeScale, power, elapsed } = params;
  
  if (timeScale <= 0) {
    throw new Error("Invalid: timeScale must be positive");
  }
  
  return initialValue / Math.pow(1 + elapsed / timeScale, power);
}

/**
 * Calculate half-life from decay constant (lambda).
 * 
 * Formula: t_half = ln(2) / λ
 * 
 * @param params - Object containing lambda (decay constant)
 * @returns Half-life in same time units as lambda
 */
export function halfLifeFromLambda(params: { lambda: number }): number {
  const { lambda } = params;
  
  if (lambda <= 0) {
    throw new Error("Invalid: lambda must be positive");
  }
  
  return Math.LN2 / lambda;
}

/**
 * Calculate decay constant (lambda) from half-life.
 * 
 * Formula: λ = ln(2) / t_half
 * 
 * @param params - Object containing halfLife
 * @returns Decay constant lambda
 */
export function lambdaFromHalfLife(params: { halfLife: number }): number {
  const { halfLife } = params;
  
  if (halfLife <= 0) {
    throw new Error("Invalid: halfLife must be positive");
  }
  
  return Math.LN2 / halfLife;
}

/**
 * Calculate remaining value as percentage after n half-lives.
 * 
 * Formula: remaining = (1/2)^n = 2^(-n)
 * 
 * @param params - Object containing number of half-lives
 * @returns Remaining value as fraction (0 to 1)
 */
export function remainingAfterHalfLives(params: { halfLives: number }): number {
  const { halfLives } = params;
  return Math.pow(0.5, halfLives);
}

/**
 * Calculate adjusted half-life based on volatility and conviction.
 * 
 * Higher volatility or lower conviction shortens effective half-life.
 * 
 * @param params - Object containing baseHalfLife, volatility factor, and conviction factor
 * @returns Adjusted half-life
 */
export function adjustedHalfLife(params: {
  baseHalfLife: number;
  volatility?: number;
  conviction?: number;
}): number {
  const {
    baseHalfLife,
    volatility = 1.0,
    conviction = 1.0
  } = params;
  
  if (baseHalfLife <= 0) {
    throw new Error("Invalid: baseHalfLife must be positive");
  }
  
  if (volatility <= 0 || conviction <= 0) {
    throw new Error("Invalid: volatility and conviction must be positive");
  }
  
  // Higher volatility shortens half-life (divide by volatility)
  // Higher conviction lengthens half-life (multiply by conviction)
  return (baseHalfLife * conviction) / volatility;
}

/**
 * Calculate time-weighted score with exponential decay.
 * 
 * Useful for scoring signals where recent data is more valuable.
 * 
 * @param params - Object containing baseScore, halfLife, and age
 * @returns Time-weighted score
 */
export function timeWeightedScore(params: {
  baseScore: number;
  halfLife: number;
  age: number;
}): number {
  return exponentialDecay({
    initialValue: params.baseScore,
    halfLife: params.halfLife,
    elapsed: params.age
  });
}

/**
 * Calculate composite decay score from multiple signals with different ages.
 * 
 * @param signals - Array of signals with score, halfLife, and age
 * @returns Weighted average of decayed scores
 */
export function compositeDecayScore(signals: Array<{
  score: number;
  halfLife: number;
  age: number;
}>): number {
  if (signals.length === 0) {
    return 0;
  }
  
  const decayedScores = signals.map(s => 
    timeWeightedScore({
      baseScore: s.score,
      halfLife: s.halfLife,
      age: s.age
    })
  );
  
  // Simple average (could be weighted by other factors)
  return decayedScores.reduce((sum, score) => sum + score, 0) / decayedScores.length;
}

/**
 * Calculate effective half-life for a signal based on greeks sensitivity.
 * 
 * Signals with high theta (time decay) have shorter effective half-lives.
 * 
 * @param params - Object containing baseHalfLife and theta (time decay per day)
 * @returns Effective half-life adjusted for theta
 */
export function greeksAdjustedHalfLife(params: {
  baseHalfLife: number;
  thetaPerDay: number;
}): number {
  const { baseHalfLife, thetaPerDay } = params;
  
  if (baseHalfLife <= 0) {
    throw new Error("Invalid: baseHalfLife must be positive");
  }
  
  // Higher absolute theta shortens half-life
  // Theta is typically negative for long positions
  const thetaFactor = 1 + Math.abs(thetaPerDay);
  
  return baseHalfLife / thetaFactor;
}

