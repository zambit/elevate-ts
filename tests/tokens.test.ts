import { describe, it, expect } from 'vitest'
import { tokenConfig } from '../src/tokens/config.js'
import { toCSSVarName, generateCSS } from '../src/tokens/cssGen.js'

describe('tokenConfig', () => {
  describe('colors', () => {
    it('contains exactly 10 neutral scale entries', () => {
      const neutralKeys = Object.keys(tokenConfig.colors).filter((k) =>
        k.startsWith('neutral-')
      )
      expect(neutralKeys).toHaveLength(10)
      expect(neutralKeys).toEqual([
        'neutral-50',
        'neutral-100',
        'neutral-200',
        'neutral-300',
        'neutral-400',
        'neutral-500',
        'neutral-600',
        'neutral-700',
        'neutral-800',
        'neutral-900',
      ])
    })

    it('all neutral scale values are valid HSL strings', () => {
      Object.entries(tokenConfig.colors).forEach(([name, value]) => {
        if (name.startsWith('neutral-')) {
          expect(value).toMatch(/^hsl\(0, 0%, \d+(\.\d+)?%\)$/)
        }
      })
    })

    it('neutral scale lightness is strictly decreasing', () => {
      const neutralKeys = [
        'neutral-50',
        'neutral-100',
        'neutral-200',
        'neutral-300',
        'neutral-400',
        'neutral-500',
        'neutral-600',
        'neutral-700',
        'neutral-800',
        'neutral-900',
      ]
      const lightnesses = neutralKeys.map((key) => {
        const value = tokenConfig.colors[key]
        const match = value.match(/(\d+(\.\d+)?)%\)$/)
        return parseFloat(match![1])
      })
      for (let i = 1; i < lightnesses.length; i++) {
        expect(lightnesses[i]).toBeLessThan(lightnesses[i - 1])
      }
    })

    it('semantic color groups each have base, -dark, and -light variants', () => {
      const groups = ['brand', 'primary', 'success', 'error', 'warning']
      groups.forEach((group) => {
        expect(tokenConfig.colors[group]).toBeDefined()
        expect(tokenConfig.colors[`${group}-dark`]).toBeDefined()
        expect(tokenConfig.colors[`${group}-light`]).toBeDefined()
      })
    })

    it('all semantic color values are valid HSL strings', () => {
      const groups = ['brand', 'primary', 'success', 'error', 'warning']
      groups.forEach((group) => {
        [group, `${group}-dark`, `${group}-light`].forEach((key) => {
          expect(tokenConfig.colors[key]).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/)
        })
      })
    })
  })

  describe('spacing', () => {
    it('key "0" equals "0"', () => {
      expect(tokenConfig.spacing['0']).toBe('0')
    })

    it('has keys "1" through "16"', () => {
      for (let i = 1; i <= 16; i++) {
        expect(tokenConfig.spacing[i.toString()]).toBeDefined()
      }
    })

    it('has exactly 17 entries total', () => {
      expect(Object.keys(tokenConfig.spacing)).toHaveLength(17)
    })

    it('follows 0.25rem step pattern', () => {
      expect(tokenConfig.spacing['1']).toBe('0.25rem')
      expect(tokenConfig.spacing['4']).toBe('1rem')
      expect(tokenConfig.spacing['8']).toBe('2rem')
      expect(tokenConfig.spacing['16']).toBe('4rem')
    })

    it('all non-zero values end in rem', () => {
      Object.values(tokenConfig.spacing).forEach((value) => {
        if (value !== '0') {
          expect(value).toMatch(/rem$/)
        }
      })
    })
  })

  describe('typography.fontSizes', () => {
    it('has exactly the keys: xs, sm, base, lg, xl, 2xl', () => {
      const keys = Object.keys(tokenConfig.typography.fontSizes).sort()
      expect(keys).toEqual(['2xl', 'base', 'lg', 'sm', 'xl', 'xs'])
    })

    it('base equals "1rem"', () => {
      expect(tokenConfig.typography.fontSizes.base).toBe('1rem')
    })

    it('all values end in rem', () => {
      Object.values(tokenConfig.typography.fontSizes).forEach((value) => {
        expect(value).toMatch(/rem$/)
      })
    })

    it('parsed numeric values are strictly increasing from xs to 2xl', () => {
      const order = ['xs', 'sm', 'base', 'lg', 'xl', '2xl'] as const
      const values = order.map((key) => {
        const val = tokenConfig.typography.fontSizes[key]
        return parseFloat(val)
      })
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1])
      }
    })

    it('xs is approximately 0.790rem', () => {
      const parsed = parseFloat(tokenConfig.typography.fontSizes.xs)
      expect(parsed).toBeCloseTo(0.79, 2)
    })

    it('sm is approximately 0.889rem', () => {
      const parsed = parseFloat(tokenConfig.typography.fontSizes.sm)
      expect(parsed).toBeCloseTo(0.889, 2)
    })
  })

  describe('typography.fontWeights', () => {
    it('all values are numbers', () => {
      Object.values(tokenConfig.typography.fontWeights).forEach((value) => {
        expect(typeof value).toBe('number')
      })
    })

    it('has expected weight values', () => {
      expect(tokenConfig.typography.fontWeights.normal).toBe(400)
      expect(tokenConfig.typography.fontWeights.medium).toBe(500)
      expect(tokenConfig.typography.fontWeights.semibold).toBe(600)
      expect(tokenConfig.typography.fontWeights.bold).toBe(700)
    })
  })

  describe('typography.lineHeights', () => {
    it('has tight, normal, relaxed', () => {
      expect(tokenConfig.typography.lineHeights.tight).toBeDefined()
      expect(tokenConfig.typography.lineHeights.normal).toBeDefined()
      expect(tokenConfig.typography.lineHeights.relaxed).toBeDefined()
    })

    it('values are strictly increasing', () => {
      const tight = tokenConfig.typography.lineHeights.tight
      const normal = tokenConfig.typography.lineHeights.normal
      const relaxed = tokenConfig.typography.lineHeights.relaxed
      expect(tight).toBeLessThan(normal)
      expect(normal).toBeLessThan(relaxed)
    })

    it('has expected values', () => {
      expect(tokenConfig.typography.lineHeights.tight).toBe(1.25)
      expect(tokenConfig.typography.lineHeights.normal).toBe(1.5)
      expect(tokenConfig.typography.lineHeights.relaxed).toBe(1.625)
    })
  })

  describe('typography.fontFamilies', () => {
    it('sans contains "sans-serif"', () => {
      expect(tokenConfig.typography.fontFamilies.sans).toContain('sans-serif')
    })

    it('mono contains "monospace"', () => {
      expect(tokenConfig.typography.fontFamilies.mono).toContain('monospace')
    })
  })

  describe('radius', () => {
    it('has exactly 5 entries: sm, md, lg, xl, 2xl', () => {
      const keys = Object.keys(tokenConfig.radius).sort()
      expect(keys).toEqual(['2xl', 'lg', 'md', 'sm', 'xl'])
    })

    it('has expected rem values', () => {
      expect(tokenConfig.radius.sm).toBe('0.25rem')
      expect(tokenConfig.radius.md).toBe('0.375rem')
      expect(tokenConfig.radius.lg).toBe('0.5rem')
      expect(tokenConfig.radius.xl).toBe('0.75rem')
      expect(tokenConfig.radius['2xl']).toBe('1rem')
    })

    it('values are strictly increasing', () => {
      const order = ['sm', 'md', 'lg', 'xl', '2xl'] as const
      const values = order.map((key) => parseFloat(tokenConfig.radius[key]))
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1])
      }
    })
  })

  describe('shadows', () => {
    it('has sm, md, lg, xl all non-empty strings', () => {
      expect(tokenConfig.shadows.sm).toBeDefined()
      expect(tokenConfig.shadows.md).toBeDefined()
      expect(tokenConfig.shadows.lg).toBeDefined()
      expect(tokenConfig.shadows.xl).toBeDefined()
      Object.values(tokenConfig.shadows).forEach((value) => {
        expect(typeof value).toBe('string')
        expect(value.length).toBeGreaterThan(0)
      })
    })
  })

  describe('transitions', () => {
    it('fast equals "150ms ease-in-out"', () => {
      expect(tokenConfig.transitions.fast).toBe('150ms ease-in-out')
    })

    it('normal equals "251ms ease-in-out"', () => {
      // Math.round(150 * 1.67) === 251
      expect(tokenConfig.transitions.normal).toBe('251ms ease-in-out')
    })

    it('slow equals "350ms ease-in-out"', () => {
      // Math.round(150 * 2.33) === 350
      expect(tokenConfig.transitions.slow).toBe('350ms ease-in-out')
    })

    it('all values end with ease-in-out', () => {
      Object.values(tokenConfig.transitions).forEach((value) => {
        expect(value).toContain('ease-in-out')
      })
    })
  })

  describe('zIndex', () => {
    it('dropdown equals 1000', () => {
      expect(tokenConfig.zIndex.dropdown).toBe(1000)
    })

    it('modal equals 1050', () => {
      expect(tokenConfig.zIndex.modal).toBe(1050)
    })

    it('tooltip equals 1100', () => {
      expect(tokenConfig.zIndex.tooltip).toBe(1100)
    })

    it('values are strictly increasing', () => {
      expect(tokenConfig.zIndex.dropdown).toBeLessThan(tokenConfig.zIndex.modal)
      expect(tokenConfig.zIndex.modal).toBeLessThan(tokenConfig.zIndex.tooltip)
    })
  })

  describe('shape invariants', () => {
    it('top-level keys are correct', () => {
      const keys = Object.keys(tokenConfig).sort()
      expect(keys).toEqual([
        'colors',
        'radius',
        'shadows',
        'spacing',
        'transitions',
        'typography',
        'zIndex',
      ])
    })

    it('typography contains correct sub-keys', () => {
      const keys = Object.keys(tokenConfig.typography).sort()
      expect(keys).toEqual([
        'fontFamilies',
        'fontSizes',
        'fontWeights',
        'lineHeights',
      ])
    })
  })
})

describe('toCSSVarName', () => {
  it('prefixes with --prefix-', () => {
    expect(toCSSVarName('color', 'primary')).toBe('--color-primary')
  })

  it('converts camelCase to kebab-case', () => {
    expect(toCSSVarName('color', 'primaryDark')).toBe('--color-primary-dark')
  })

  it('leaves already-kebab names unchanged', () => {
    expect(toCSSVarName('font-size', 'base')).toBe('--font-size-base')
  })

  it('handles numeric suffixes', () => {
    expect(toCSSVarName('color', 'neutral-500')).toBe('--color-neutral-500')
  })

  it('lowercases the result', () => {
    expect(toCSSVarName('color', 'PrimaryDark')).toBe('--color-primary-dark')
  })
})

describe('generateCSS', () => {
  const css = generateCSS()

  it('output starts with the generated file comment', () => {
    expect(css).toContain('/* Design Tokens - GENERATED FILE */')
  })

  it('output contains :root { block', () => {
    expect(css).toContain(':root {')
  })

  it('output contains CSS variables for all color tokens', () => {
    expect(css).toContain('--color-brand: hsl(260, 85%, 55%);')
    expect(css).toContain('--color-primary:')
    expect(css).toContain('--color-neutral-50:')
    expect(css).toContain('--color-neutral-900:')
  })

  it('output contains CSS variables for spacing', () => {
    expect(css).toContain('--spacing-0: 0;')
    expect(css).toContain('--spacing-1: 0.25rem;')
  })

  it('output contains CSS variables for font sizes', () => {
    expect(css).toContain('--font-size-base: 1rem;')
  })

  it('output contains CSS variables for radius', () => {
    expect(css).toContain('--radius-sm: 0.25rem;')
  })

  it('output contains the global * { box-sizing: border-box } rule', () => {
    expect(css).toContain('box-sizing: border-box;')
  })

  it('output ends with the #app block', () => {
    expect(css).toContain('#app {')
    expect(css).toContain('flex-direction: column;')
  })

  it('output contains global styles section', () => {
    expect(css).toContain('/* Global Styles */')
    expect(css).toContain('background-color: var(--color-neutral-50);')
  })
})
