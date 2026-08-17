import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
export function AdaptiveGlass({
  children,
  style,
  interactive = false,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; interactive?: boolean }>) {
  if (isLiquidGlassAvailable())
    return (
      <GlassView isInteractive={interactive} style={style}>
        {children}
      </GlassView>
    );
  return (
    <BlurView tint="systemMaterial" intensity={90} style={[{ overflow: "hidden" }, style]}>
      {children}
    </BlurView>
  );
}
