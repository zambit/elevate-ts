/**
 * Design Token CSS Generation — Pure Functions
 *
 * Extracted pure functions for CSS generation.
 * These can be imported and tested without side effects.
 */

import { tokenConfig } from './config.js'

/**
 * Convert token names from camelCase/kebab-case to CSS variable names.
 * Examples:
 *   primaryDark -> primary-dark
 *   colorNeutral500 -> color-neutral-500
 */
export function toCSSVarName(prefix: string, name: string): string {
  // Insert hyphens before capital letters, convert to lowercase
  const kebab = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
  return `--${prefix}-${kebab}`
}

/**
 * Generate CSS custom properties from token config.
 */
export function generateCSS(): string {
  const lines: string[] = [
    '/* Design Tokens - GENERATED FILE */',
    '/* Do not edit manually. Update src/tokens/config.ts in workspace root and run: npm run generate:tokens */',
    '/* This file is auto-generated at build time for immutability */',
    '',
    ':root {'
  ]

  // ========================================================================
  // COLORS
  // ========================================================================
  lines.push('  /* Colors */')
  Object.entries(tokenConfig.colors).forEach(([name, value]) => {
    const varName = toCSSVarName('color', name)
    lines.push(`  ${varName}: ${value};`)
  })
  lines.push('')

  // ========================================================================
  // TYPOGRAPHY
  // ========================================================================
  lines.push('  /* Typography */')

  // Font families
  Object.entries(tokenConfig.typography.fontFamilies).forEach(([name, value]) => {
    const varName = toCSSVarName('font', name)
    lines.push(`  ${varName}: ${value};`)
  })
  lines.push('')

  // Font sizes
  Object.entries(tokenConfig.typography.fontSizes).forEach(([name, value]) => {
    const varName = toCSSVarName('font-size', name)
    lines.push(`  ${varName}: ${value};`)
  })
  lines.push('')

  // Font weights
  Object.entries(tokenConfig.typography.fontWeights).forEach(([name, value]) => {
    const varName = toCSSVarName('font-weight', name)
    lines.push(`  ${varName}: ${value};`)
  })
  lines.push('')

  // Line heights
  Object.entries(tokenConfig.typography.lineHeights).forEach(([name, value]) => {
    const varName = toCSSVarName('line-height', name)
    lines.push(`  ${varName}: ${value};`)
  })
  lines.push('')

  // ========================================================================
  // SPACING
  // ========================================================================
  lines.push('  /* Spacing */')
  Object.entries(tokenConfig.spacing).forEach(([name, value]) => {
    const varName = toCSSVarName('spacing', name)
    lines.push(`  ${varName}: ${value};`)
  })
  lines.push('')

  // ========================================================================
  // BORDER RADIUS
  // ========================================================================
  lines.push('  /* Border Radius */')
  Object.entries(tokenConfig.radius).forEach(([name, value]) => {
    const varName = toCSSVarName('radius', name)
    lines.push(`  ${varName}: ${value};`)
  })
  lines.push('')

  // ========================================================================
  // SHADOWS
  // ========================================================================
  lines.push('  /* Shadows */')
  Object.entries(tokenConfig.shadows).forEach(([name, value]) => {
    const varName = toCSSVarName('shadow', name)
    lines.push(`  ${varName}: ${value};`)
  })
  lines.push('')

  // ========================================================================
  // TRANSITIONS
  // ========================================================================
  lines.push('  /* Transitions */')
  Object.entries(tokenConfig.transitions).forEach(([name, value]) => {
    const varName = toCSSVarName('transition', name)
    lines.push(`  ${varName}: ${value};`)
  })
  lines.push('')

  // ========================================================================
  // Z-INDEX
  // ========================================================================
  lines.push('  /* Z-Index */')
  Object.entries(tokenConfig.zIndex).forEach(([name, value]) => {
    const varName = toCSSVarName('z', name)
    lines.push(`  ${varName}: ${value};`)
  })

  lines.push('}')
  lines.push('')

  // ========================================================================
  // GLOBAL STYLES
  // ========================================================================
  lines.push('/* Global Styles */')
  lines.push('* {')
  lines.push('  box-sizing: border-box;')
  lines.push('}')
  lines.push('')
  lines.push('html {')
  lines.push('  font-family: var(--font-sans);')
  lines.push('  font-size: 16px;')
  lines.push('  -webkit-font-smoothing: antialiased;')
  lines.push('  -moz-osx-font-smoothing: grayscale;')
  lines.push('}')
  lines.push('')
  lines.push('body {')
  lines.push('  margin: 0;')
  lines.push('  padding: 0;')
  lines.push('  background-color: var(--color-neutral-50);')
  lines.push('  color: var(--color-neutral-900);')
  lines.push('  font-size: var(--font-size-base);')
  lines.push('  line-height: var(--line-height-normal);')
  lines.push('}')
  lines.push('')
  lines.push('#app {')
  lines.push('  min-height: 100vh;')
  lines.push('  display: flex;')
  lines.push('  flex-direction: column;')
  lines.push('}')

  return lines.join('\n')
}
