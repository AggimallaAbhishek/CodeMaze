import { Layer, Rect, Stage, Text } from "react-konva";

import { useElementWidth } from "../hooks/useElementWidth";
import { calculateSortingStageMetrics } from "../utils/layout";

export default function SortingCanvas({ values, selectedIndex, hintIndices = [], onSelectBar, disabled }) {
  const [containerRef, containerWidth] = useElementWidth(360);
  const maxValue = Math.max(...values, 1);
  const { barAreaHeight, barGap, barWidth, horizontalPadding, stageHeight, stageWidth } =
    calculateSortingStageMetrics(containerWidth, values.length);

  return (
    <div className="sorting-canvas-wrapper">
      <div ref={containerRef} className="sorting-canvas-frame">
        <Stage className="sorting-stage" width={stageWidth} height={stageHeight}>
          <Layer>
            {values.map((value, index) => {
              const height = Math.max(24, Math.floor((value / maxValue) * barAreaHeight));
              const x = horizontalPadding + index * (barWidth + barGap);
              const y = stageHeight - height - 48;
              const isSelected = selectedIndex === index;
              const isHinted = hintIndices.includes(index);

              return (
                <Rect
                  key={`bar-${index}`}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={height}
                  cornerRadius={6}
                  fill={isSelected ? "#ef9b31" : isHinted ? "#7ac7ff" : "#43b6a7"}
                  shadowBlur={isSelected || isHinted ? 12 : 4}
                  shadowOpacity={0.35}
                  onClick={() => !disabled && onSelectBar(index)}
                  onTap={() => !disabled && onSelectBar(index)}
                />
              );
            })}
            {values.map((value, index) => {
              const x = horizontalPadding + index * (barWidth + barGap);
              return (
                <Text
                  key={`label-${index}`}
                  x={x}
                  y={stageHeight - 34}
                  width={barWidth}
                  align="center"
                  text={String(value)}
                  fontSize={14}
                  fill="#f4f3ec"
                />
              );
            })}
          </Layer>
        </Stage>
      </div>

      <p id="sorting-controls-help" className="sr-only">
        Choose two positions to swap the displayed values. The numbered controls match the bars shown above.
      </p>
      <div className="bar-button-grid" role="group" aria-label="Swap controls" aria-describedby="sorting-controls-help">
        {values.map((value, index) => (
          <button
            key={`bar-control-${index}`}
            type="button"
            className={[
              "bar-btn",
              selectedIndex === index ? "selected" : "",
              hintIndices.includes(index) ? "hinted" : ""
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onSelectBar(index)}
            disabled={disabled}
            aria-label={`Select value ${value} at position ${index + 1}`}
            aria-pressed={selectedIndex === index}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
