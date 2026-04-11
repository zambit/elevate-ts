/**
 * Design Token Configuration
 *
 * Single source of truth for all design tokens across all samples.
 * This config is processed at build time to generate tokens.css in each sample.
 */

export interface TokenConfig {
  colors: Record<string, string>;
  typography: {
    fontFamilies: Record<string, string>;
    fontSizes: Record<string, string>;
    fontWeights: Record<string, number>;
    lineHeights: Record<string, number>;
  };
  spacing: Record<string, string>;
  radius: Record<string, string>;
  shadows: Record<string, string>;
  transitions: Record<string, string>;
  zIndex: Record<string, number>;
}

// ============================================================================
// COLOR GENERATION
// ============================================================================

/**
 * Generate neutral color scale using HSL adjustments.
 * Base: 50% lightness, no saturation (pure gray)
 */
function generateNeutralScale(): Record<string, string> {
  const colors: Record<string, string> = {};

  // Neutral scale: 50 (lightest) to 900 (darkest)
  // Each step adjusts lightness by ~5%
  const steps = [
    { name: '50', lightness: 97.5 },
    { name: '100', lightness: 95 },
    { name: '200', lightness: 90 },
    { name: '300', lightness: 83 },
    { name: '400', lightness: 60 },
    { name: '500', lightness: 42 },
    { name: '600', lightness: 32 },
    { name: '700', lightness: 21 },
    { name: '800', lightness: 12 },
    { name: '900', lightness: 6 }
  ];

  steps.forEach(({ name, lightness }) => {
    colors[`neutral-${name}`] = `hsl(0, 0%, ${lightness}%)`;
  });

  return colors;
}

/**
 * Generate semantic color scales using HSL.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateColorScale(name: string, hue: number, baseSaturation: number): Record<string, string> {
  const colors: Record<string, string> = {};

  const steps = [
    { suffix: '', lightness: 95 },
    { suffix: '-dark', lightness: 47 },
    { suffix: '-light', lightness: 93 }
  ];

  steps.forEach(({ suffix, lightness }) => {
    colors[`${name}${suffix}`] = `hsl(${hue}, ${baseSaturation}%, ${lightness}%)`;
  });

  return colors;
}

// ============================================================================
// SPACING GENERATION
// ============================================================================

function generateSpacing(): Record<string, string> {
  const base = 0.25; // rem
  const spacing: Record<string, string> = {
    '0': '0'
  };

  // Linear scale: 1-16
  for (let i = 1; i <= 16; i++) {
    spacing[i.toString()] = `${base * i}rem`;
  }

  return spacing;
}

// ============================================================================
// FONT SIZE GENERATION (MODULAR SCALE)
// ============================================================================

function generateFontSizes(): Record<string, string> {
  const base = 1; // 1rem = 16px
  const ratio = 1.125; // 12.5% step (perfect fifth in music)

  return {
    xs: `${(base / (ratio * ratio)).toFixed(3)}rem`, // ~0.704rem
    sm: `${(base / ratio).toFixed(3)}rem`, // ~0.889rem
    base: `${base}rem`, // 1rem
    lg: `${(base * ratio).toFixed(3)}rem`, // ~1.125rem
    xl: `${(base * ratio * ratio).toFixed(3)}rem`, // ~1.266rem
    '2xl': `${(base * ratio * ratio * ratio).toFixed(3)}rem` // ~1.424rem
  };
}

// ============================================================================
// BORDER RADIUS GENERATION
// ============================================================================

function generateRadius(): Record<string, string> {
  const base = 0.25; // rem
  return {
    sm: `${base}rem`,
    md: `${base * 1.5}rem`,
    lg: `${base * 2}rem`,
    xl: `${base * 3}rem`,
    '2xl': `${base * 4}rem`
  };
}

// ============================================================================
// TRANSITION GENERATION
// ============================================================================

function generateTransitions(): Record<string, string> {
  const base = 150; // ms
  return {
    fast: `${base}ms ease-in-out`,
    normal: `${Math.round(base * 1.67)}ms ease-in-out`, // ~250ms
    slow: `${Math.round(base * 2.33)}ms ease-in-out` // ~350ms
  };
}

// ============================================================================
// MAIN CONFIG
// ============================================================================

export const tokenConfig: TokenConfig = {
  colors: {
    // Brand color — customize this when brand identity is finalized
    brand: 'hsl(260, 85%, 55%)',
    'brand-dark': 'hsl(260, 85%, 35%)',
    'brand-light': 'hsl(260, 85%, 92%)',

    // Semantic colors
    primary: 'hsl(217, 91%, 60%)',
    'primary-dark': 'hsl(217, 91%, 31%)',
    'primary-light': 'hsl(217, 100%, 87%)',

    success: 'hsl(142, 71%, 45%)',
    'success-dark': 'hsl(142, 77%, 36%)',
    'success-light': 'hsl(142, 71%, 82%)',

    error: 'hsl(0, 91%, 71%)',
    'error-dark': 'hsl(0, 91%, 48%)',
    'error-light': 'hsl(0, 91%, 95%)',

    warning: 'hsl(38, 92%, 50%)',
    'warning-dark': 'hsl(38, 92%, 48%)',
    'warning-light': 'hsl(38, 100%, 92%)',

    // Neutral scale
    ...generateNeutralScale()
  },

  typography: {
    fontFamilies: {
      sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
      mono: "'Menlo', 'Monaco', 'Courier New', monospace"
    },
    fontSizes: generateFontSizes(),
    fontWeights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },
    lineHeights: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.625
    }
  },

  spacing: generateSpacing(),

  radius: generateRadius(),

  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  },

  transitions: generateTransitions(),

  zIndex: {
    dropdown: 1000,
    modal: 1050,
    tooltip: 1100
  }
};

// ============================================================================
// TYPE EXPORTS FOR TYPESCRIPT
// ============================================================================

/**
 * Extract all color token names as a union type.
 * Useful for component props: type ColorName = ColorTokens
 */
export type ColorTokens = keyof typeof tokenConfig.colors;

/**
 * Extract all spacing token names as a union type.
 */
export type SpacingTokens = keyof typeof tokenConfig.spacing;

/**
 * Extract all font size names as a union type.
 */
export type FontSizeTokens = keyof typeof tokenConfig.typography.fontSizes;

/**
 * Extract all radius names as a union type.
 */
export type RadiusTokens = keyof typeof tokenConfig.radius;

/**
 * Extract all transition names as a union type.
 */
export type TransitionTokens = keyof typeof tokenConfig.transitions;
