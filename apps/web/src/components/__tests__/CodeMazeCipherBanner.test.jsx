import { act, render, screen } from "@testing-library/react";

import CodeMazeCipherBanner from "../CodeMazeCipherBanner";

describe("CodeMazeCipherBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("scrambles and resolves to CODEMAZE", () => {
    render(<CodeMazeCipherBanner />);

    const banner = screen.getByLabelText("CodeMaze cipher banner");
    const cipherText = banner.querySelector(".codemaze-cipher-text");

    expect(cipherText).not.toBeNull();
    expect(cipherText.textContent).toHaveLength(8);

    act(() => {
      vi.advanceTimersByTime(2200);
    });

    expect(cipherText.textContent).toBe("CODEMAZE");
  });
});
