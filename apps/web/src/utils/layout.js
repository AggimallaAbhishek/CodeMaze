export function calculateSortingStageMetrics(containerWidth, itemCount) {
  const safeItemCount = Math.max(itemCount, 1);
  const safeWidth = Math.max(containerWidth || 0, 320);
  const horizontalPadding = safeWidth < 520 ? 24 : 40;
  const barGap = safeWidth < 520 ? 8 : 12;
  const minBarWidth = safeWidth < 520 ? 28 : 40;
  const availableBarSpace = safeWidth - horizontalPadding * 2 - barGap * (safeItemCount - 1);
  const computedBarWidth = Math.floor(availableBarSpace / safeItemCount);
  const barWidth = Math.max(minBarWidth, computedBarWidth);
  const stageWidth = Math.max(
    safeWidth,
    horizontalPadding * 2 + safeItemCount * barWidth + (safeItemCount - 1) * barGap
  );
  const stageHeight = safeWidth < 520 ? 264 : 320;

  return {
    stageWidth,
    stageHeight,
    barAreaHeight: stageHeight - 80,
    barWidth,
    barGap,
    horizontalPadding
  };
}
