export const DEFAULT_SPLIT_RATIO = 0.5;
export const MIN_SPLIT_RATIO = 0.1;
export const MAX_SPLIT_RATIO = 0.9;

/** Validate one left-pane share of split-view code width. */
export function validateSplitRatio(value: number, label = "split ratio") {
  if (!Number.isFinite(value) || value < MIN_SPLIT_RATIO || value > MAX_SPLIT_RATIO) {
    throw new Error(
      `Invalid ${label}: ${String(value)} (expected ${MIN_SPLIT_RATIO}-${MAX_SPLIT_RATIO})`,
    );
  }

  return value;
}
