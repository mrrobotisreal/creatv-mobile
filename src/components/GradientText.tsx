import React, { useCallback, useMemo, useState } from "react";
import { Text, View, type TextProps, type TextStyle } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

type GradientTextProps = {
  text: string;
  colors: readonly string[];
  style?: TextStyle;
  numberOfLines?: number;
  ellipsizeMode?: TextProps["ellipsizeMode"];
  allowFontScaling?: boolean;
};

type Layout = {
  width: number;
  height: number;
};

const buildStops = (colors: readonly string[]) => {
  if (!colors.length) return [{ color: "#ffffff", offset: "0%" }];
  if (colors.length === 1) return [{ color: colors[0], offset: "0%" }];
  return colors.map((color, index) => ({
    color,
    offset: `${Math.round((index / (colors.length - 1)) * 100)}%`,
  }));
};

export function GradientText({
  text,
  colors,
  style,
  numberOfLines,
  ellipsizeMode,
  allowFontScaling,
}: GradientTextProps) {
  const [layout, setLayout] = useState<Layout | null>(null);
  const stops = useMemo(() => buildStops(colors), [colors]);
  const gradientId = useMemo(
    () => `grad-${Math.random().toString(36).slice(2)}`,
    []
  );
  const handleLayout = useCallback(
    (event: { nativeEvent: { layout: Layout } }) => {
      const next = event.nativeEvent.layout;
      const nextWidth = Math.ceil(next.width);
      const nextHeight = Math.ceil(next.height);
      if (!nextWidth || !nextHeight) return;
      setLayout((prev) =>
        prev?.width === nextWidth && prev?.height === nextHeight ? prev : { width: nextWidth, height: nextHeight }
      );
    },
    []
  );

  return (
    <View style={{ alignSelf: "flex-start", flexShrink: 0 }}>
      <Text
        style={[style, layout ? { opacity: 0 } : null]}
        onLayout={handleLayout}
        numberOfLines={numberOfLines}
        ellipsizeMode={ellipsizeMode}
        allowFontScaling={allowFontScaling}
      >
        {text}
      </Text>
      {layout ? (
        <MaskedView
          pointerEvents="none"
          style={{ position: "absolute", left: 0, top: 0, width: layout.width, height: layout.height }}
          maskElement={
            <Text
              style={style}
              numberOfLines={numberOfLines}
              ellipsizeMode={ellipsizeMode}
              allowFontScaling={allowFontScaling}
            >
              {text}
            </Text>
          }
        >
          <Svg width={layout.width} height={layout.height}>
            <Defs>
              <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                {stops.map((stop) => (
                  <Stop key={`${stop.offset}-${stop.color}`} offset={stop.offset} stopColor={stop.color} />
                ))}
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
          </Svg>
        </MaskedView>
      ) : null}
    </View>
  );
}
