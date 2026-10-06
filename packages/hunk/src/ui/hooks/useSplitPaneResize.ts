import type { KeyEvent } from "@opentui/core";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LayoutMode } from "../../core/run/commandInputs";
import {
  DEFAULT_SPLIT_PANE_RATIO,
  setSplitPaneRatio,
  SPLIT_PANE_RATIO_STEP,
} from "../diff/splitPaneRatio";
import { isEscapeKey } from "../lib/keyboard";

const FAST_STEP_MULTIPLIER = 4;

export interface SplitPaneResizeController {
  /** Left-pane share of split code width, mirrored into split geometry. */
  splitPaneRatio: number;
  /** Persistent status text while the resize mode owns its keys. */
  modeStatusHint: string | null;
  /** Live answer for key routing: several keys of one input flush arrive before a render. */
  isModeActive: () => boolean;
  /** Enter the mode, or leave it when it is already running. */
  toggleMode: () => void;
  /** Offer one key to the mode; true means the mode consumed it. */
  sendModeKey: (key: KeyEvent) => boolean;
}

/** Resolve the divider movement one key asks for, or undefined when it is not a resize key. */
function resizeDelta(key: KeyEvent) {
  const name = key.name?.toLowerCase();
  if (key.ctrl || key.meta || key.option) return undefined;

  const fast = Boolean(key.shift) || key.sequence === "H" || key.sequence === "L";
  const step = SPLIT_PANE_RATIO_STEP * (fast ? FAST_STEP_MULTIPLIER : 1);
  if (name === "h" || name === "left") return -step;
  if (name === "l" || name === "right") return step;
  return undefined;
}

/** Report whether one key finishes the resize mode. */
function isFinishKey(key: KeyEvent) {
  const name = key.name?.toLowerCase();
  return isEscapeKey(key) || name === "return" || name === "enter" || name === "q";
}

/** Report whether one key restores the even split. */
function isResetKey(key: KeyEvent) {
  return key.sequence === "=" || key.sequence === "0";
}

/** Format the ratio as the integer column shares shown in the status line. */
function formatRatio(ratio: number) {
  const left = Math.round(ratio * 100);
  return `${left}/${100 - left}`;
}

/**
 * Own the split-view divider position and the keyboard mode that moves it.
 *
 * The ratio is session-local view state: it is stored in the split geometry module so every
 * planning layer resolves the same pane widths, and in React state so the review re-measures.
 */
export function useSplitPaneResize({
  initialRatio,
  layout,
  showNotice,
}: {
  initialRatio?: number;
  layout: Exclude<LayoutMode, "auto">;
  showNotice: (message: string) => void;
}): SplitPaneResizeController {
  const [splitPaneRatio, setSplitPaneRatioState] = useState(() =>
    setSplitPaneRatio(initialRatio ?? DEFAULT_SPLIT_PANE_RATIO),
  );
  const ratioRef = useRef(splitPaneRatio);
  const [active, setActiveState] = useState(false);
  const activeRef = useRef(false);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;

  const setActive = useCallback((next: boolean) => {
    activeRef.current = next;
    setActiveState(next);
  }, []);

  const applyRatio = useCallback((next: number) => {
    const stored = setSplitPaneRatio(next);
    ratioRef.current = stored;
    setSplitPaneRatioState(stored);
  }, []);

  // A layout switch away from split leaves nothing to resize.
  useEffect(() => {
    if (layout !== "split" && activeRef.current) {
      setActive(false);
    }
  }, [layout, setActive]);

  const isModeActive = useCallback(() => activeRef.current && layoutRef.current === "split", []);

  const toggleMode = useCallback(() => {
    if (activeRef.current) {
      setActive(false);
      return;
    }

    if (layoutRef.current !== "split") {
      showNotice("Pane resize works in split view");
      return;
    }

    setActive(true);
  }, [setActive, showNotice]);

  const sendModeKey = useCallback(
    (key: KeyEvent) => {
      if (isFinishKey(key)) {
        setActive(false);
        return true;
      }

      if (isResetKey(key)) {
        applyRatio(DEFAULT_SPLIT_PANE_RATIO);
        return true;
      }

      const delta = resizeDelta(key);
      if (delta === undefined) {
        return false;
      }

      applyRatio(ratioRef.current + delta);
      return true;
    },
    [applyRatio, setActive],
  );

  const modeStatusHint =
    active && layout === "split"
      ? `Resize panes ${formatRatio(splitPaneRatio)} • h/l move, H/L faster, = reset, Esc done`
      : null;

  return { splitPaneRatio, modeStatusHint, isModeActive, toggleMode, sendModeKey };
}
