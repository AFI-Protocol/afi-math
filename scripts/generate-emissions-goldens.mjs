/**
 * Golden-vector generator for the canonical AFI emissions schedule.
 *
 * Regenerates the deterministic golden vectors consumed by
 * `tests/emissions.test.ts`. This is a dev-only tool; it performs no
 * filesystem writes and prints JSON to stdout so the library's
 * "no I/O side effects" doctrine holds even for tooling.
 *
 * Usage:
 *   npm run build
 *   node scripts/generate-emissions-goldens.mjs > tests/goldens/emissions.golden.json
 *
 * Output is fully deterministic (no timestamps, no environment reads),
 * so repeated runs against the same source tree are byte-identical.
 *
 * Numbers are serialized via JSON.stringify, which uses the shortest
 * representation that round-trips to the identical float64 — parsing the
 * golden file recovers bit-identical doubles.
 */

import {
  buildEmissionsSchedule,
  shapeWeights,
} from "../dist/emissions/emissionsSchedule.js";

/** Serialize an EmissionsParams object (bigint cap → string). */
function serializeParams(params) {
  return { ...params, cap: params.cap.toString() };
}

/** Sum an array of numbers (plain left-to-right, matching the kernel). */
function sum(xs) {
  return xs.reduce((acc, x) => acc + x, 0);
}

/**
 * Capture a compact fingerprint of a schedule: integer facts exactly,
 * float facts at selected epochs (1-indexed).
 */
function captureSchedule(overrides, sampleEpochs) {
  const s = buildEmissionsSchedule(overrides);
  const emissionsAtEpochs = {};
  const cumulativeAtEpochs = {};
  for (const epoch of sampleEpochs) {
    emissionsAtEpochs[epoch] = s.emissions[epoch - 1];
    cumulativeAtEpochs[epoch] = s.cumulative[epoch - 1];
  }
  return {
    paramsUsed: serializeParams(s.params),
    totalEpochs: s.totalEpochs,
    milestones: s.milestones,
    emissionsAtEpochs,
    cumulativeAtEpochs,
    sumOfEmissions: sum(s.emissions),
  };
}

const golden = {
  _meta: {
    description:
      "Deterministic golden vectors pinning the canonical AFI emissions schedule " +
      "(three-phase front-loaded model) as implemented in src/emissions/emissionsSchedule.ts. " +
      "These vectors pin CURRENT canonical behavior; any diff here means emissions " +
      "behavior changed and requires explicit governance review.",
    regenerate:
      "npm run build && node scripts/generate-emissions-goldens.mjs > tests/goldens/emissions.golden.json",
    tolerancePolicy:
      "Integer values (epoch counts, milestone epochs) must match exactly. " +
      "Float values must match within relative tolerance 1e-12 (float64 " +
      "transcendentals are not guaranteed bit-identical across JS engines/libm).",
  },

  /**
   * Vector 1 — the canonical published schedule (all defaults):
   * 86B cap, 52 epochs/year, 4y early / 24y mid / 25y tail,
   * targets 1/3 -> 0.8 -> 1.0, shapes 2.0 / 1.5 / 1.2.
   * Sample epochs: first two, last-of-early/first-of-mid (208/209),
   * last-of-mid/first-of-tail (1456/1457), final (2756).
   */
  defaultSchedule: captureSchedule({}, [1, 2, 208, 209, 1456, 1457, 2756]),

  /**
   * Vector 2 — monthly cadence (epochsPerYear: 12), other params default.
   * 48 early + 288 mid + 300 tail = 636 epochs.
   * Sample epochs: phase boundaries 1, 48, 49, 336, 337, 636.
   */
  monthlySchedule: captureSchedule({ epochsPerYear: 12 }, [1, 48, 49, 336, 337, 636]),

  /**
   * Vector 3 — small fully-pinned parameterized schedule:
   * cap 1,000,000; 4 epochs/year; 1y per phase → 12 epochs total.
   * Small enough to pin the complete emissions and cumulative arrays.
   */
  smallSchedule: (() => {
    const s = buildEmissionsSchedule({
      cap: 1_000_000n,
      epochsPerYear: 4,
      earlyYears: 1,
      midYears: 1,
      tailYears: 1,
    });
    return {
      paramsUsed: serializeParams(s.params),
      totalEpochs: s.totalEpochs,
      milestones: s.milestones,
      emissions: s.emissions,
      cumulative: s.cumulative,
      sumOfEmissions: sum(s.emissions),
    };
  })(),

  /** shapeWeights kernel vectors (front-loading weight generator). */
  shapeWeights: {
    "n5_shape2": shapeWeights(5, 2.0),
    "n5_shape0": shapeWeights(5, 0),
    "n3_shape1.5": shapeWeights(3, 1.5),
    "n1_shape3": shapeWeights(1, 3),
    "n0_shape2": shapeWeights(0, 2),
  },
};

process.stdout.write(JSON.stringify(golden, null, 2) + "\n");
