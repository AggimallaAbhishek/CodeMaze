import { Layer, Rect, Stage, Text } from "react-konva";

export default function SortingCanvas({ values, selectedIndex, hintIndices = [], onSelectBar, disabled }) {
  const stageWidth = Math.max(760, values.length * 90);
  const stageHeight = 320;
  const barAreaHeight = 240;
  const maxValue = Math.max(...values, 1);
  const barWidth = Math.max(48, Math.floor((stageWidth - 80) / values.length) - 12);

  return (
    <div className="sorting-canvas-wrapper">
      <Stage className="sorting-stage" width={stageWidth} height={stageHeight}>
        <Layer>
          {values.map((value, index) => {
            const height = Math.max(24, Math.floor((value / maxValue) * barAreaHeight));
            const x = 40 + index * (barWidth + 12);
            const y = stageHeight - height - 40;
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
            const x = 40 + index * (barWidth + 12) + barWidth / 2 - 8;
            return (
              <Text
                key={`label-${index}`}
                x={x}
                y={stageHeight - 32}
                text={String(value)}
                fontSize={14}
                fill="#f4f3ec"
              />
            );
          })}
        </Layer>
      </Stage>

      <div className="bar-button-grid" aria-label="Swap Controls">
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
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
