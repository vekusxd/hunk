import { afterEach, describe, expect, test } from "bun:test";
import { resolveSplitPaneWidths } from "./codeColumns";
import {
  clampSplitPaneRatio,
  DEFAULT_SPLIT_PANE_RATIO,
  getSplitPaneRatio,
  setSplitPaneRatio,
} from "./splitPaneRatio";

afterEach(() => {
  setSplitPaneRatio(DEFAULT_SPLIT_PANE_RATIO);
});

describe("split pane ratio", () => {
  test("keeps the historical even split by default", () => {
    expect(resolveSplitPaneWidths(102)).toEqual({ leftWidth: 51, rightWidth: 51 });
    expect(resolveSplitPaneWidths(103)).toEqual({ leftWidth: 51, rightWidth: 52 });
  });

  test("divides usable code width by the active ratio without losing columns", () => {
    setSplitPaneRatio(0.3);
    const { leftWidth, rightWidth } = resolveSplitPaneWidths(102);
    expect(leftWidth).toBe(31);
    expect(leftWidth + rightWidth).toBe(102);
    expect(resolveSplitPaneWidths(102, 0.7)).toEqual({ leftWidth: 71, rightWidth: 31 });
  });

  test("clamps and rounds stored ratios", () => {
    expect(setSplitPaneRatio(0.95)).toBe(0.9);
    expect(setSplitPaneRatio(0.01)).toBe(0.1);
    expect(clampSplitPaneRatio(0.1 + 0.05 + 0.05)).toBe(0.2);
    expect(clampSplitPaneRatio(Number.NaN)).toBe(DEFAULT_SPLIT_PANE_RATIO);
    setSplitPaneRatio(0.35);
    expect(getSplitPaneRatio()).toBe(0.35);
  });
});
