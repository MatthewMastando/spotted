import { useState } from "react";
import { LayoutChangeEvent, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { AppText } from "./ui";

export function makePath(
  values: string[],
  width: number,
  height: number,
  domainValues: string[] = values,
): string {
  const numbers = values.map(Number).filter(Number.isFinite);
  const domain = domainValues.map(Number).filter(Number.isFinite);
  if (numbers.length < 2 || width <= 0 || height <= 0) return "";
  const min = Math.min(...domain);
  const max = Math.max(...domain);
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
  baseline,
  startLabel,
  endLabel,
}: {
  values: string[];
  color: string;
  summary: string;
  baseline?: string;
  startLabel?: string;
  endLabel?: string;
}) {
  const [width, setWidth] = useState(0);
  const height = 148;
  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);
  const domainValues = baseline ? [...values, baseline] : values;
  const path = makePath(values, width, height, domainValues);
  const numericValues = domainValues.map(Number).filter(Number.isFinite);
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const range = max - min || 1;
  const baselineY = baseline
    ? height - ((Number(baseline) - min) / range) * (height - 8) - 4
    : null;
  const last = path.split("L ").at(-1)?.split(" ").map(Number);
  return (
    <View>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Portfolio equity chart. ${summary}${
          baseline
            ? ` Starting balance ${baseline}; ${startLabel ?? ""} to ${endLabel ?? ""}.`
            : ""
        }`}
        onLayout={onLayout}
        style={{ height }}
      >
        {width > 0 ? (
          <Svg width={width} height={height}>
            {baselineY !== null ? (
              <Path
                d={`M 0 ${baselineY} L ${width} ${baselineY}`}
                fill="none"
                stroke="#89918D"
                strokeWidth={1}
                strokeDasharray="5 5"
              />
            ) : null}
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
      {baseline ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <View
            style={{
              width: 23,
              borderTopWidth: 1,
              borderStyle: "dashed",
              borderColor: "#89918D",
            }}
          />
          <AppText variant="small">Starting balance · $10,000</AppText>
        </View>
      ) : null}
      {startLabel || endLabel ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <AppText variant="small">{startLabel ?? ""}</AppText>
          <AppText variant="small">{endLabel ?? ""}</AppText>
        </View>
      ) : null}
      <AppText variant="small">{summary}</AppText>
    </View>
  );
}
