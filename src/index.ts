/**
 * AFI Math Library
 * 
 * Shared financial math primitives for AFI Protocol.
 * 
 * This library provides pure mathematical functions for:
 * - Time value of money calculations
 * - Curve primitives (logistic, exponential, power law)
 * - Valuation models (reverse DCF, implied discount rates)
 * - Signal decay models (exponential, power law, greeks-adjusted)
 * 
 * All functions are deterministic and side-effect free.
 * No I/O, database, network, or blockchain operations.
 */

// Re-export all modules
export * as timeValue from "./timeValue/timeValue";
export * as curves from "./curves/curves";
export * as valuation from "./valuation/reverseDcf";
export * as decay from "./decay/decayModels";

// Also export types for convenience
export type {
  ReverseDCFInputs,
  ReverseDCFOutputs
} from "./valuation/reverseDcf";

