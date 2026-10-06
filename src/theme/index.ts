import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#0071bc',
      light: '#4d9fd4',
      dark: '#004c8c',
      contrastText: '#ffffff',
    },
    /**
     * `secondary` marks To-Be / target values. The original `#02bfe7` is a
     * decorative cyan that measures **2.19:1** on white — it cannot legally
     * carry text (4.5:1) or even an icon (3:1), yet it was used for both.
     * Darkened to 5.27:1 while keeping the cyan hue so the To-Be signal reads
     * the same.
     *
     * `dark` exists for text on a *tinted* surface. The To-Be caption in
     * `MaturityLevelSelector` sits on `alpha(secondary.main, 0.1)` layered over a
     * row that is itself tinted when selected and/or hovered, so the background
     * shifts with state: `main` measures 4.58:1 on an idle row but only 4.13:1
     * once that row is both selected and hovered. `dark` holds 5.47-6.06:1
     * across every combination. See OBS-30.
     */
    secondary: {
      main: '#00768f',
      light: '#4dd2ed',
      dark: '#00636f',
    },
    success: {
      main: '#2e8540',
      light: '#4caf50',
      dark: '#1e5a2c',
    },
    /**
     * `warning.main` is a decorative amber at **1.74:1** on white. It is not
     * safe for text or icons, so `MuiAlert` below redirects the warning icon to
     * `dark` — MUI would otherwise paint it in `main` at 1.65:1 against the
     * alert's own background.
     *
     * `dark` is the text-bearing token. It was `#c48f00`, which measured
     * **2.89:1** on white and 2.64:1 on the `alpha(warning.main, 0.15)` chip
     * background it was actually painted on. Now 6.92:1 and 6.34:1.
     */
    warning: {
      main: '#fdb81e',
      light: '#ffc94d',
      dark: '#7a5200',
    },
    error: {
      main: '#e31c3d',
      light: '#e94d64',
      dark: '#b0142f',
    },
    /**
     * `info` was never defined, so MUI fell back to its default `#0288d1`, which
     * measures 3.86:1 on white and 3.54:1 on the page background — failing as
     * chip text (`color="info"` chips appear in three places) and failing even
     * the 3:1 non-text minimum as an Alert icon at 3.41:1. Defined explicitly.
     */
    info: {
      main: '#01579b',
      light: '#4d8ecb',
      dark: '#01426f',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#212121',
      secondary: '#5c5c5c',
    },
  },
  typography: {
    fontFamily: '"Source Sans Pro", "Helvetica Neue", Helvetica, Arial, sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    /**
     * WCAG 2.1 AA 2.4.7 (Focus Visible).
     *
     * MUI's ButtonBase sets `outline: 0` and signals keyboard focus with a
     * background tint from `palette.action.focus`. Any component that sets its
     * own `backgroundColor` via `sx` — which this app does in several places,
     * e.g. the AppBar nav buttons — silently wins over that tint, leaving the
     * control with no focus indicator at all. Measured before this override:
     * outline `none`, box-shadow `none`, background `rgba(0,0,0,0.004)`.
     *
     * An outline cannot be clobbered by a background rule, and `currentColor`
     * adapts to context: white on the dark blue AppBar, near-black on light
     * page backgrounds. Because it keys off `:focus-visible` (via MUI's
     * `.Mui-focusVisible`), it is invisible to mouse and touch users.
     */
    MuiButtonBase: {
      styleOverrides: {
        root: {
          '&.Mui-focusVisible': {
            outline: '2px solid currentColor',
            outlineOffset: 2,
          },
        },
      },
    },
    /**
     * Full-bleed rows draw the ring inset so it is not clipped by the sidebar
     * edge or overlapped by the adjacent row.
     */
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-focusVisible': {
            outlineOffset: -2,
          },
        },
      },
    },
    MuiAccordionSummary: {
      styleOverrides: {
        root: {
          '&.Mui-focusVisible': {
            outlineOffset: -2,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          padding: '8px 16px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          },
          /**
           * Contained buttons are the one case where `currentColor` needs an
           * inset ring. Their text colour is `palette[color].contrastText`
           * (white), so a ring drawn *outside* the border box lands on the white
           * page and measures 1.00:1 — invisible. Drawing it inside puts white
           * on the button's own fill instead: 5.14:1 on primary, 4.67:1 on
           * error, both clearing the 3:1 required for non-text contrast.
           */
          '&.Mui-focusVisible': {
            outlineOffset: -4,
          },
        },
      },
    },
    /**
     * Outlined chips paint their text AND border from `palette[color].main`,
     * which is a fill-grade colour. Measured on the default `#f5f5f5` page
     * background: `success.main` 4.23:1 and `warning.main` 1.59:1 for text, and
     * the border misses the 3:1 non-text minimum too. Redirect both to the
     * `.dark` token so any outlined success/warning chip is compliant wherever
     * it is used, rather than fixing call sites one at a time.
     */
    MuiChip: {
      styleOverrides: {
        // MUI has no `outlinedSuccess` / `outlinedWarning` / `outlinedInfo`
        // slot, so target the generated class pairs from `root`. Requiring both
        // classes means filled chips cannot match.
        root: ({ theme: t }) => ({
          '&.MuiChip-outlined.MuiChip-colorSuccess': {
            color: t.palette.success.dark,
            borderColor: t.palette.success.dark,
          },
          '&.MuiChip-outlined.MuiChip-colorWarning': {
            color: t.palette.warning.dark,
            borderColor: t.palette.warning.dark,
          },
          '&.MuiChip-outlined.MuiChip-colorInfo': {
            color: t.palette.info.dark,
            borderColor: t.palette.info.dark,
          },
        }),
      },
    },
    /**
     * A standard `Alert` paints its icon in `palette[severity].main`, which is a
     * fill-grade colour. Measured against MUI's own tinted alert backgrounds,
     * every severity failed the 4.5:1 text minimum and warning and info failed
     * even the 3:1 non-text minimum: warning 1.65:1, info 3.41:1, error 3.98:1,
     * success 4.08:1. Redirected to the `.dark` tokens, which give 5.99-7.26:1.
     */
    MuiAlert: {
      styleOverrides: {
        standardWarning: ({ theme: t }) => ({
          '& .MuiAlert-icon': { color: t.palette.warning.dark },
        }),
        standardInfo: ({ theme: t }) => ({
          '& .MuiAlert-icon': { color: t.palette.info.dark },
        }),
        standardSuccess: ({ theme: t }) => ({
          '& .MuiAlert-icon': { color: t.palette.success.dark },
        }),
        standardError: ({ theme: t }) => ({
          '& .MuiAlert-icon': { color: t.palette.error.dark },
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        },
      },
    },
  },
});

export default theme;
