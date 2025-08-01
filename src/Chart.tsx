import React from "react";

interface ChartProps {
  title: string;
  data: number[];
  color?: string;
  maxBars?: number;
}

const Chart: React.FC<ChartProps> = ({ title, data, color = "#4ecdc4", maxBars = 50 }) => {
  const max = Math.max(...data, 1);
  const shown = data.slice(0, maxBars);
  return (
    <div style={{ margin: "16px 0" }}>
      <div style={{ marginBottom: 4 }}>{title}</div>
      <svg width={400} height={100}>
        {shown.map((v, i) => (
          <rect
            key={i}
            x={i * (400 / maxBars)}
            y={100 - (v / max) * 100}
            width={400 / maxBars - 2}
            height={(v / max) * 100}
            fill={color}
          />
        ))}
      </svg>
      <div style={{ fontSize: 12, color: "#888" }}>
        min: {Math.min(...shown).toFixed(2)} ms | max: {Math.max(...shown).toFixed(2)} ms | avg: {(shown.reduce((a, b) => a + b, 0) / shown.length).toFixed(2)} ms
      </div>
    </div>
  );
};

export default Chart;
