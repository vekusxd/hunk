import { afterEach, describe, expect, test } from "bun:test";
import { KeyEvent } from "@opentui/core";
import { testRender } from "@opentui/react/test-utils";
import { act } from "react";
import type { AppBootstrap } from "../core/bootstrap";
import { createTestVcsAppBootstrap } from "../../../../test/helpers/app-bootstrap";
import { createTestDiffFile } from "../../../../test/helpers/diff-helpers";
import { DEFAULT_SPLIT_PANE_RATIO, setSplitPaneRatio } from "./diff/splitPaneRatio";

const { TestAppHost: AppHost } = await import("../../../../test/helpers/app-host");

function createBootstrap(initialSplitPaneRatio?: number): AppBootstrap {
  return {
    ...createTestVcsAppBootstrap({
      changesetId: "changeset:split-resize",
      files: [
        createTestDiffFile({
          after: "export const alpha = 2;\n",
          before: "export const alpha = 1;\n",
          context: 3,
          id: "alpha",
          path: "alpha.ts",
        }),
      ],
      initialMode: "split",
    }),
    ...(initialSplitPaneRatio === undefined ? {} : { initialSplitPaneRatio }),
  };
}

/** A lone Escape, emitted directly because the mock input path waits out the ESC prefix. */
function escapeKeyEvent() {
  return new KeyEvent({
    name: "escape",
    sequence: "\u001b",
    raw: "\u001b",
    ctrl: false,
    meta: false,
    option: false,
    shift: false,
    number: false,
    eventType: "press",
    source: "raw",
  });
}

/** Column of the new-side code `alpha = 2` on its rendered row. */
function newSideColumn(frame: string) {
  const line = frame.split("\n").find((row) => row.includes("alpha = 2"));
  expect(line).toBeDefined();
  return line!.indexOf("alpha = 2");
}

afterEach(() => {
  setSplitPaneRatio(DEFAULT_SPLIT_PANE_RATIO);
});

describe("split pane resize mode", () => {
  test("ctrl+r enters the mode, h/l move the divider, = resets, and Esc leaves", async () => {
    const setup = await testRender(<AppHost bootstrap={createBootstrap()} />, {
      width: 140,
      height: 20,
    });
    const press = async (action: () => void | Promise<void>) => {
      await act(async () => {
        await action();
      });
      await act(async () => {
        await setup.renderOnce();
      });
    };

    try {
      await press(() => undefined);
      const initialFrame = setup.captureCharFrame();
      const initialColumn = newSideColumn(initialFrame);

      await press(() => setup.mockInput.pressKey("r", { ctrl: true }));
      expect(setup.captureCharFrame()).toContain("Resize panes 50/50");

      await press(() => setup.mockInput.typeText("ll"));
      const widerLeftFrame = setup.captureCharFrame();
      expect(widerLeftFrame).toContain("Resize panes 60/40");
      expect(newSideColumn(widerLeftFrame)).toBeGreaterThan(initialColumn);

      await press(() => setup.mockInput.typeText("H"));
      const widerRightFrame = setup.captureCharFrame();
      expect(widerRightFrame).toContain("Resize panes 40/60");
      expect(newSideColumn(widerRightFrame)).toBeLessThan(initialColumn);

      await press(() => setup.mockInput.typeText("="));
      expect(newSideColumn(setup.captureCharFrame())).toBe(initialColumn);

      await press(() => setup.mockInput.typeText("h"));
      await press(() => {
        setup.renderer.keyInput.emit("keypress", escapeKeyEvent());
      });
      const exitedFrame = setup.captureCharFrame();
      expect(exitedFrame).not.toContain("Resize panes");
      const keptColumn = newSideColumn(exitedFrame);
      expect(keptColumn).toBeLessThan(initialColumn);

      // Outside the mode `l` is the line-number toggle again, not a divider move.
      await press(() => setup.mockInput.typeText("l"));
      expect(setup.captureCharFrame()).not.toContain("Resize panes");
    } finally {
      await act(async () => {
        setup.renderer.destroy();
      });
    }
  });

  test("an initial ratio from config shifts the divider at launch", async () => {
    const render = async (ratio?: number) => {
      const setup = await testRender(<AppHost bootstrap={createBootstrap(ratio)} />, {
        width: 140,
        height: 20,
      });
      try {
        await act(async () => {
          await setup.renderOnce();
        });
        return newSideColumn(setup.captureCharFrame());
      } finally {
        await act(async () => {
          setup.renderer.destroy();
        });
      }
    };

    const even = await render();
    const narrowLeft = await render(0.3);
    expect(narrowLeft).toBeLessThan(even);
  });
});
