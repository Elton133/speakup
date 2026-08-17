export const palette = {
  ink: "#0B0B0B",
  charcoal: "#494949",
  grey: "#7C7A7A",
  paper: "#F1EFE9",
  white: "#FFFFFF",
  ember: "#F0A43A",
  emberSoft: "#FFD88A",
  danger: "#A63A32",
} as const;
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 10, md: 16, lg: 24, full: 999 } as const;
export const type = {
  display: { fontFamily: "Flexing", fontSize: 42, lineHeight: 44 },
  title: { fontFamily: "Flexing-Bold", fontSize: 28, lineHeight: 31 },
  body: { fontSize: 16, lineHeight: 24 },
  caption: { fontSize: 12, lineHeight: 16 },
} as const;
