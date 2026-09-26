import { useState } from "react";
import { LayoutChangeEvent, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { AppText } from "./ui";

function makePath(values: string[], width: number, height: number): string {
  const numbers = values.map(Number).filter(Number.isFinite);
  if (numbers.length < 2 || width <= 0 || height <= 0) return "";
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const range = max - min || 1;
  return numbers
    .map((value, index) => {
      const x = (index / (numbers.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 8) - 4;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

export function Sparkline({
  values,
  color,
  height = 34,
  label,
}: {
  values: string[];
  color: string;
  height?: number;
  label: string;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      onLayout={onLayout}
      style={{ width: "100%", height }}
    >
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Path
            d={makePath(values, width, height)}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ) : null}
    </View>
  );
}

export function EquityChart({
  values,
  color,
  summary,
}: {
  values: string[];
  color: string;
  summary: string;
}) {
  const [width, setWidth] = useState(0);
  const height = 148;
  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);
  const path = makePath(values, width, height);
  const last = path.split("L ").at(-1)?.split(" ").map(Number);
  return (
    <View>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Portfolio equity chart. ${summary}`}
        onLayout={onLayout}
        style={{ height }}
      >
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {last?.length === 2 ? (
              <Circle cx={last[0]} cy={last[1]} r={4} fill={color} />
            ) : null}
          </Svg>
        ) : null}
      </View>
      <AppText variant="small">{summary}</AppText>
    </View>
  );
}
