"use client";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#e9afc5", contrastText: "#25172e" },
    secondary: { main: "#d8b878" },
    background: { default: "#171126", paper: "#211830" },
    text: { primary: "#fbf5ee", secondary: "#c8b9cf" },
    error: { main: "#f29ab5" },
    success: { main: "#86dfbc" },
  },
  typography: {
    fontFamily: 'Arial, Helvetica, sans-serif',
    button: { fontWeight: 700, textTransform: "none" },
  },
  shape: { borderRadius: 16 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { minHeight: 44, borderRadius: 999, paddingInline: 18 },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { color: "#e9afc5" },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(16, 12, 25, .52)",
          "& fieldset": { borderColor: "rgba(255,255,255,.17)" },
          "&:hover fieldset": { borderColor: "rgba(233,175,197,.55)" },
        },
        input: { color: "#fbf5ee" },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
  },
});

export function UiProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ThemeProvider>
  );
}
