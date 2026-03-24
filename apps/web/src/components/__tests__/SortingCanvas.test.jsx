import { fireEvent, render, screen } from "@testing-library/react";

import SortingCanvas from "../SortingCanvas";

describe("SortingCanvas", () => {
  it("invokes callback when controls are clicked", () => {
    const onSelectBar = vi.fn();
    render(
      <SortingCanvas values={[4, 2, 1]} selectedIndex={null} onSelectBar={onSelectBar} disabled={false} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Select value 4 at position 1" }));
    expect(onSelectBar).toHaveBeenCalledWith(0);
  });
});
