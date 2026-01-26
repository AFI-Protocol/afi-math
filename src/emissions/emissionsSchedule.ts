/**
 * AFI Emissions Schedule
 * 
 * Canonical implementation of the three-phase front-loaded emissions model.
 * Derived from AFI_Emissions_Final.wl (Wolfram Mathematica)
 * 
 * The model distributes 86B AFI over ~53 years in three phases:
 * - Early (4 years): 33⅓% of supply, aggressively front-loaded
 * - Mid (~24 years): 33⅓% → 80%, moderately front-loaded  
 * - Tail (~25 years): 80% → 100%, gently front-loaded
 */

export interface EmissionsParams {
  /** Total supply cap (default: 86 billion) */
  cap: bigint;
  /** Epochs per year (default: 52 for weekly) */
  epochsPerYear: number;
  /** Years for early phase - reaches 33⅓% (default: 4) */
  earlyYears: number;
  /** Years for mid phase - 33⅓% to 80% (default: 24) */
  midYears: number;
  /** Years for tail phase - 80% to 100% (default: 25) */
  tailYears: number;
  /** Target fractions for each milestone */
  targets: {
    f33: number;  // default: 1/3
    f80: number;  // default: 0.8
    f100: number; // default: 1.0
  };
  /** Front-loading shape factors (higher = more front-loaded) */
  shapeEarly: number;  // default: 2.0
  shapeMid: number;    // default: 1.5
  shapeTail: number;   // default: 1.2
}

export interface EmissionsSchedule {
  /** Parameters used to generate this schedule */
  params: EmissionsParams;
  /** Total number of epochs in the schedule */
  totalEpochs: number;
  /** Per-epoch emission amounts (in base units, not wei) */
  emissions: number[];
  /** Cumulative emissions at each epoch */
  cumulative: number[];
  /** Milestone information */
  milestones: {
    epochTo33Pct: number;
    epochTo80Pct: number;
    epochTo100Pct: number;
    yearsTo33Pct: number;
    yearsTo80Pct: number;
    yearsTo100Pct: number;
  };
}

/**
 * Default emissions parameters matching the canonical Wolfram model.
 */
export const DEFAULT_EMISSIONS_PARAMS: EmissionsParams = {
  cap: 86_000_000_000n,
  epochsPerYear: 52,
  earlyYears: 4,
  midYears: 24,
  tailYears: 25,
  targets: {
    f33: 1 / 3,
    f80: 0.8,
    f100: 1.0,
  },
  shapeEarly: 2.0,
  shapeMid: 1.5,
  shapeTail: 1.2,
};

/**
 * Generate front-loaded weights that sum to 1.
 * Uses exponential decay: w[i] = exp(-shape * i / (n-1))
 * 
 * @param n - Number of weights to generate
 * @param shape - Shape parameter (higher = more front-loaded)
 * @returns Array of weights summing to 1
 */
export function shapeWeights(n: number, shape: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [1.0];

  const weights: number[] = [];
  const denominator = Math.max(1, n - 1);

  for (let i = 0; i < n; i++) {
    const t = i / denominator;
    weights.push(Math.exp(-shape * t));
  }

  const total = weights.reduce((sum, w) => sum + w, 0);
  return weights.map(w => w / total);
}

/**
 * Convert years to epochs, rounding to nearest integer.
 */
function toEpochs(years: number, epochsPerYear: number): number {
  return Math.max(1, Math.round(years * epochsPerYear));
}

/**
 * Build the complete emissions schedule.
 * 
 * @param params - Emissions parameters (uses defaults if not provided)
 * @returns Complete emissions schedule with per-epoch amounts
 */
export function buildEmissionsSchedule(
  params: Partial<EmissionsParams> = {}
): EmissionsSchedule {
  const p: EmissionsParams = { ...DEFAULT_EMISSIONS_PARAMS, ...params };
  const cap = Number(p.cap);

  // Calculate epochs for each phase
  const nEarly = toEpochs(p.earlyYears, p.epochsPerYear);
  const nMid = toEpochs(p.midYears, p.epochsPerYear);
  const nTail = toEpochs(p.tailYears, p.epochsPerYear);
  const totalEpochs = nEarly + nMid + nTail;

  // Generate weights for each phase
  const wEarly = shapeWeights(nEarly, p.shapeEarly);
  const wMid = shapeWeights(nMid, p.shapeMid);
  const wTail = shapeWeights(nTail, p.shapeTail);

  // Calculate supply allocated to each phase
  const supplyEarly = cap * p.targets.f33;
  const supplyMid = cap * (p.targets.f80 - p.targets.f33);
  const supplyTail = cap * (p.targets.f100 - p.targets.f80);

  // Build base emissions schedule
  const baseEmissions: number[] = [
    ...wEarly.map(w => w * supplyEarly),
    ...wMid.map(w => w * supplyMid),
    ...wTail.map(w => w * supplyTail),
  ];

  // Scale to ensure exact sum to cap (handles floating point)
  const baseTotal = baseEmissions.reduce((sum, e) => sum + e, 0);
  const scale = cap / baseTotal;
  const emissions = baseEmissions.map(e => e * scale);

  // Build cumulative series
  const cumulative: number[] = [];
  let runningTotal = 0;
  for (const e of emissions) {
    runningTotal += e;
    cumulative.push(runningTotal);
  }

  // Find milestone epochs
  const findMilestoneEpoch = (targetFraction: number): number => {
    const target = cap * targetFraction;
    const idx = cumulative.findIndex(c => c >= target);
    return idx >= 0 ? idx + 1 : totalEpochs;
  };

  const epochTo33Pct = findMilestoneEpoch(p.targets.f33);
  const epochTo80Pct = findMilestoneEpoch(p.targets.f80);
  const epochTo100Pct = findMilestoneEpoch(p.targets.f100);

  return {
    params: p,
    totalEpochs,
    emissions,
    cumulative,
    milestones: {
      epochTo33Pct,
      epochTo80Pct,
      epochTo100Pct,
      yearsTo33Pct: epochTo33Pct / p.epochsPerYear,
      yearsTo80Pct: epochTo80Pct / p.epochsPerYear,
      yearsTo100Pct: epochTo100Pct / p.epochsPerYear,
    },
  };
}

/**
 * Get the emission budget for a specific epoch.
 * 
 * @param schedule - Pre-built emissions schedule
 * @param epoch - Epoch number (1-indexed)
 * @returns Emission budget for that epoch (0 if past end)
 */
export function getEpochEmission(schedule: EmissionsSchedule, epoch: number): number {
  if (epoch < 1 || epoch > schedule.totalEpochs) {
    return 0;
  }
  return schedule.emissions[epoch - 1];
}

/**
 * Get cumulative emissions up to and including a specific epoch.
 * 
 * @param schedule - Pre-built emissions schedule
 * @param epoch - Epoch number (1-indexed)
 * @returns Cumulative emissions (cap if past end)
 */
export function getCumulativeEmissions(schedule: EmissionsSchedule, epoch: number): number {
  if (epoch < 1) return 0;
  if (epoch >= schedule.totalEpochs) return Number(schedule.params.cap);
  return schedule.cumulative[epoch - 1];
}

/**
 * Get remaining supply that can be minted.
 * 
 * @param schedule - Pre-built emissions schedule
 * @param alreadyMinted - Amount already minted
 * @returns Remaining mintable supply
 */
export function getRemainingSupply(schedule: EmissionsSchedule, alreadyMinted: number): number {
  return Math.max(0, Number(schedule.params.cap) - alreadyMinted);
}

/**
 * Calculate what fraction of total supply has been emitted by a given epoch.
 * 
 * @param schedule - Pre-built emissions schedule
 * @param epoch - Epoch number (1-indexed)
 * @returns Fraction between 0 and 1
 */
export function getEmittedFraction(schedule: EmissionsSchedule, epoch: number): number {
  const cum = getCumulativeEmissions(schedule, epoch);
  return cum / Number(schedule.params.cap);
}
