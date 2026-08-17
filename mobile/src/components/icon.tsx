import { HugeiconsIcon } from "@hugeicons/react-native";
import type { ComponentProps } from "react";
type Props = ComponentProps<typeof HugeiconsIcon>;
export function Icon({ size = 21, color = "#0B0B0B", strokeWidth = 1.7, ...props }: Props) {
  return <HugeiconsIcon size={size} color={color} strokeWidth={strokeWidth} {...props} />;
}
