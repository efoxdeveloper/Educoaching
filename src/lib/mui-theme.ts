"use client";

import { createTheme } from "@mui/material/styles";

// Matches tailwind.config.ts as closely as possible
// Scholar: primary, Marigold: secondary, paper: background.paper, ink: text.primary
export const muiTheme = createTheme({
  palette: {
    primary: {
      main: "#1E3A5F", // scholar-600
      light: "#2F507A", // scholar-500
      dark: "#182F4C", // scholar-700
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#E8A33D", // marigold-400
      light: "#EFB65B", // marigold-300
      dark: "#B3741C", // marigold-600
      contrastText: "#1E3A5F",
    },
    // Custom semantic aliases — keep Tailwind names available via theme.palette.scholar etc.
    // @ts-ignore — augmented below
    scholar: {
      50: "#EEF2F7",
      100: "#D6E0EB",
      200: "#AFC3D9",
      300: "#7E9BBC",
      400: "#4E6E93",
      500: "#2F507A",
      600: "#1E3A5F",
      700: "#182F4C",
      800: "#13243B",
      900: "#0D1A2A",
      main: "#1E3A5F",
      light: "#EEF2F7",
      dark: "#0D1A2A",
      contrastText: "#FFFFFF",
    } as any,
    marigold: {
      50: "#FDF4E6",
      100: "#FAE4BE",
      200: "#F5CE8C",
      300: "#EFB65B",
      400: "#E8A33D",
      500: "#D68F26",
      600: "#B3741C",
      main: "#E8A33D",
      light: "#FDF4E6",
      dark: "#B3741C",
      contrastText: "#1E3A5F",
    } as any,
    error: {
      main: "#D64545", // danger-500
      light: "#FCEBEA",
      dark: "#B93636",
      contrastText: "#FFFFFF",
    },
    warning: {
      main: "#DB9A1F", // warn-500
      light: "#FFF6E5",
    },
    success: {
      main: "#1F9D66", // success-500
      light: "#E9F7EF",
      dark: "#188050",
      contrastText: "#FFFFFF",
    },
    background: {
      default: "#F7F5F0", // paper
      paper: "#FFFFFF",
    },
    text: {
      primary: "#171A21", // ink
      secondary: "#4E6E93", // scholar-400
    },
  },
  shape: {
    borderRadius: 12, // xl: 14px, 2xl: 18px → 12 base, components override to 14/18 where needed
  },
  typography: {
    fontFamily: "var(--font-inter), Inter, sans-serif",
    h6: {
      fontFamily: "var(--font-sora), sans-serif",
      fontWeight: 700,
      fontSize: "1rem",
    },
    subtitle2: {
      fontFamily: "var(--font-sora), sans-serif",
      fontWeight: 600,
      fontSize: "0.75rem",
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  breakpoints: {
    // Map Tailwind sm:640 md:768 lg:1024 xl:1280 to MUI xs/sm/md/lg/xl
    // Keep xs 0, sm 640, md 768, lg 1024, xl 1280 for 1:1 mapping in Grid2
    values: {
      xs: 0,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid #D6E0EB", // scholar-100
          borderRadius: "18px", // 2xl
          boxShadow: "0 1px 2px rgba(13,26,42,0.04), 0 1px 8px rgba(13,26,42,0.06)", // shadow-card
          backgroundColor: "#FFFFFF",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "12px", // rounded-xl
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: "9999px",
          fontWeight: 500,
          fontSize: "0.75rem",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: "18px",
          border: "1px solid #D6E0EB",
          boxShadow: "0 8px 30px rgba(13,26,42,0.12)",
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "small",
        fullWidth: true,
      },
    },
  },
});

// Extend palette to include custom colors for sx access (scholar, marigold, paper, ink)
// This allows sx={{ bgcolor: "scholar.50" }} etc. if needed via augmentation
declare module "@mui/material/styles" {
  interface Palette {
    scholar: Palette["primary"];
    marigold: Palette["secondary"];
  }
  interface PaletteOptions {
    scholar?: PaletteOptions["primary"];
    marigold?: PaletteOptions["primary"];
  }
}
