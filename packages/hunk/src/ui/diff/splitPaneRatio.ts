import { DEFAULT_SPLIT_RATIO, MAX_SPLIT_RATIO, MIN_SPLIT_RATIO } from "../../core/run/splitRatio";

/**
 * Share of split-view code width given to the old (left) pane.
 *
 * Every split geometry consumer (row planning, copy, notes, static pager) derives pane widths
 * from `resolveSplitPaneWidths`, so the ratio lives here as one session-wide value instead of
 * being threaded through each planning layer. `App` owns the interactive value and mirrors it
 * here synchronously; width-keyed caches include `splitPaneRatioCacheKey()` so a change
 * re-measures them.
 */
export const DEFAULT_SPLIT_PANE_RATIO = DEFAULT_SPLIT_RATIO;
export const SPLIT_PANE_RATIO_STEP = 0.05;

let activeSplitPaneRatio = DEFAULT_SPLIT_PANE_RATIO;

/** Clamp and round one ratio so repeated steps never drift through float error. */
export function clampSplitPaneRatio(ratio: number) {
  if (!Number.isFinite(ratio)) {
    return DEFAULT_SPLIT_PANE_RATIO;
  }

  const rounded = Math.round(ratio * 100) / 100;
  return Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, rounded));
}

/** Read the ratio split geometry currently resolves against. */
export function getSplitPaneRatio() {
  return activeSplitPaneRatio;
}

/** Replace the active ratio, returning the clamped value actually stored. */
export function setSplitPaneRatio(ratio: number) {
  activeSplitPaneRatio = clampSplitPaneRatio(ratio);
  return activeSplitPaneRatio;
}

/** Cache-key fragment for geometry that depends on split pane widths. */
export function splitPaneRatioCacheKey(ratio = activeSplitPaneRatio) {
  return `split-ratio:${ratio}`;
}
