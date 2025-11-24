/**
 * Theme configuration aligned with CMS Design System
 * Reference: https://design.cms.gov/foundation/theme-colors/?theme=core
 */
export const theme = {
  colors: {
    // Primary colors
    primary: '#0071bc', // CMS primary blue
    primaryDarker: '#205493', // Darker blue for hover states
    primaryDarkest: '#112e51', // Darkest blue for active states

    // Secondary colors
    secondary: '#02bfe7', // CMS secondary blue
    secondaryDarker: '#00a6d2', // Darker secondary blue
    secondaryDarkest: '#046b99', // Darkest secondary blue

    // Neutral colors
    base: '#212121', // Base text color
    muted: '#5b616b', // Muted text color

    // Background colors
    background: '#f1f1f1', // Light gray background
    backgroundDark: '#d6d7d9', // Darker gray background

    // Status colors
    success: '#2e8540', // Green for success states
    warning: '#fdb81e', // Yellow for warning states
    error: '#e31c3d', // Red for error states

    // Focus color
    focus: '#3e94cf', // Blue for focus states

    // White and black
    white: '#ffffff',
    black: '#000000',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  breakpoints: {
    mobile: '480px',
    tablet: '768px',
    desktop: '1024px',
    widescreen: '1200px',
  },
  typography: {
    fontFamily: '"Open Sans", sans-serif', // CMS Design System uses Open Sans
    fontSize: {
      small: '14px',
      base: '16px',
      large: '18px',
      heading: {
        h1: '32px',
        h2: '24px',
        h3: '20px',
        h4: '18px',
      },
    },
  },
};

export default theme;
