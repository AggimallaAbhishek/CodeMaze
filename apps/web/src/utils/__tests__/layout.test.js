import { calculateSortingStageMetrics } from "../layout";

describe("calculateSortingStageMetrics", () => {
  it("uses compact dimensions on narrow containers", () => {
    const metrics = calculateSortingStageMetrics(360, 4);

    expect(metrics.stageHeight).toBe(264);
    expect(metrics.barGap).toBe(8);
    expect(metrics.horizontalPadding).toBe(24);
    expect(metrics.stageWidth).toBeGreaterThanOrEqual(360);
  });

  it("expands the stage when the minimum bar width would overflow", () => {
    const metrics = calculateSortingStageMetrics(320, 8);

    expect(metrics.barWidth).toBe(28);
    expect(metrics.stageWidth).toBeGreaterThan(320);
  });
});
