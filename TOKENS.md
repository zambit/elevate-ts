# Design Tokens System

This is a **shared, workspace-level design token system** used by all elevate-ts samples.

## Why This Approach?

All samples use identical design tokens generated at build time:

✅ **Single source of truth** — All tokens defined in one place (src/tokens/config.ts) ✅ **Consistency guaranteed** — All samples have identical styling ✅ **Immutable CSS** — Pre-calculated values,
zero runtime `calc()` overhead ✅ **Type-safe** — TypeScript types for token names (IDE autocomplete) ✅ **Zero duplication** — Don't repeat token logic across 7 samples

## File Structure

```bash
src/tokens/
├── config.ts           # Token definitions (shared by all samples)
├── generateCSS.ts      # Generator script (runs at build time)
└── index.ts            # Type exports
```

**Generated in each sample:**

```bash
samples/[category]/[name]/src/styles/tokens.css  # AUTO-GENERATED (gitignored)
```

## How It Works

### 1. Define Tokens Once

All token values are defined in `src/tokens/config.ts`:

```typescript
export const tokenConfig = {
  colors: {
    /* ... */
  },
  spacing: generateSpacing(), // Base 0.25rem × multipliers
  typography: {
    /* ... */
  }
  // etc.
};
```

### 2. Generate CSS Automatically

The build process generates immutable CSS for all samples:

```bash
npm run generate:tokens    # Generate tokens.css in all samples
npm run build              # Automatically runs generate:tokens first
```

**Output:**

```css
/* Identical in every sample */
:root {
  --color-primary: hsl(217, 91%, 60%);
  --spacing-1: 0.25rem;
  --spacing-2: 0.5rem;
  /* ... 118 lines total ... */
}
```

### 3. Samples Use Shared Tokens

Each sample imports the same CSS:

```typescript
// src/App.svelte (or any sample)
import './styles/tokens.css'; // Same for all samples
```

Then uses the tokens:

```css
button {
  background-color: var(--color-primary);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-lg);
  transition: background-color var(--transition-fast);
}
```

## Token Categories

### Colors

**Brand + Semantic colors + neutral scale (50-900):**

```typescript
colors: {
  // Brand color — customize this when your brand identity is finalized
  'brand': 'hsl(260, 85%, 55%)',        // Purple (customizable)
  'brand-dark': 'hsl(260, 85%, 35%)',
  'brand-light': 'hsl(260, 85%, 92%)',

  // Functional semantic colors
  'primary': 'hsl(217, 91%, 60%)',      // Blue (fallback)
  'success': 'hsl(142, 71%, 45%)',      // Green
  'error': 'hsl(0, 91%, 71%)',          // Red
  'warning': 'hsl(38, 92%, 50%)',       // Orange

  // Neutral scale (10 steps: 50 = lightest, 900 = darkest)
  'neutral-50': 'hsl(0, 0%, 97.5%)',
  'neutral-900': 'hsl(0, 0%, 6%)',
}
```

**Brand Color Strategy:**

The `brand` color is your **primary customization point**:

- Use `var(--color-brand)` for main CTAs, headers, logo elements
- Use `var(--color-brand-dark)` for hover/active states
- Use `var(--color-brand-light)` for backgrounds or subtle accents
- The default purple is neutral enough to work until you finalize branding
- When you decide on elevate-ts branding, just change the hue in `config.ts`
- All samples regenerate automatically — zero code changes needed

**Functional colors** (`primary`, `success`, `error`, `warning`) remain stable for UI feedback and are independent of brand identity.

### Spacing

Linear scale: base (0.25rem) × multipliers (1-16):

```css
--spacing-0: 0 --spacing-1: 0.25rem --spacing-2: 0.5rem --spacing-4: 1rem --spacing-8: 2rem --spacing-16: 4rem;
```

### Font Sizes

Modular scale using 1.125 ratio (perfect fifth):

```css
--font-size-xs: 0.79rem --font-size-sm: 0.889rem --font-size-base: 1rem --font-size-lg: 1.125rem --font-size-xl: 1.266rem --font-size-2xl: 1.424rem;
```

### Other Categories

- **Font families**: sans, mono
- **Font weights**: normal (400), medium (500), semibold (600), bold (700)
- **Line heights**: tight, normal, relaxed
- **Border radius**: sm, md, lg, xl, 2xl (0.25rem - 1rem)
- **Shadows**: sm, md, lg, xl
- **Transitions**: fast (150ms), normal (250ms), slow (350ms)
- **Z-index**: dropdown (1000), modal (1050), tooltip (1100)

## Modifying Tokens

### Customize Your Brand Color

When you finalize elevate-ts branding, change the brand color (no code changes needed in samples):

1. **Edit** `src/tokens/config.ts`

   ```typescript
   export const tokenConfig = {
     colors: {
       // Change just the hue, keep saturation/lightness consistent
       brand: 'hsl(45, 85%, 55%)', // Your brand color
       'brand-dark': 'hsl(45, 85%, 35%)',
       'brand-light': 'hsl(45, 85%, 92%)'
       // ... other colors stay the same
     }
   };
   ```

2. **Run generator**

   ```bash
   npm run generate:tokens
   ```

3. **All samples update automatically** — No code changes in samples needed

### Add or Update Other Tokens

1. **Edit** `src/tokens/config.ts`

   ```typescript
   export const tokenConfig = {
     colors: {
       brand: 'hsl(260, 85%, 55%)', // Brand
       primary: 'hsl(220, 100%, 50%)', // Change existing
       'custom-new': 'hsl(180, 75%, 60%)' // Add new
     }
   };
   ```

2. **Run generator**

   ```bash
   npm run generate:tokens
   ```

3. **Use immediately** — All samples have updated tokens

### Adjust a Scale Globally

Change one base value, all derived values update:

```typescript
function generateSpacing() {
  const base = 0.25; // ← Change here, all 16 spacing values update
  return {
    /* ... */
  };
}

function generateFontSizes() {
  const base = 1;
  const ratio = 1.125; // ← Change ratio for larger/smaller steps
  return {
    /* ... */
  };
}
```

## Usage in Samples

### Import CSS

Every sample imports the shared tokens:

```typescript
// src/App.svelte, src/index.ts, or wherever styles are loaded
import './styles/tokens.css';
```

### Use in CSS

```css
.button {
  background-color: var(--color-primary);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-lg);
  transition: background-color var(--transition-fast);
}
```

### Use in TypeScript (Optional)

Get IDE autocomplete for token names:

```typescript
import { ColorTokens, SpacingTokens } from '@/tokens';

type MyColor = ColorTokens;
// Type: 'primary' | 'error' | 'neutral-50' | ...

type MySpacing = SpacingTokens;
// Type: '0' | '1' | '2' | ... | '16'
```

## Sample .gitignore

All samples gitignore the generated file:

```bash
# Generated files
src/styles/tokens.css
```

This is already configured in each sample's `.gitignore`.

## Build Integration

The root `package.json` has:

```json
{
  "scripts": {
    "generate:tokens": "node --import tsx src/tokens/generateCSS.ts",
    "build": "pnpm generate:tokens && tsc && tsc -p tsconfig.esm.json"
  }
}
```

**Automatic generation:**

- `npm run build` — generates tokens before TypeScript
- Each sample's `npm run build` — uses vite which has tokens already generated
- `npm run generate:tokens` — regenerate all samples manually

## Extending the System

### Add a New Token Category

```typescript
// In src/tokens/config.ts
export const tokenConfig = {
  // ... existing ...

  custom: {
    value1: '...',
    value2: '...'
  }
};
```

Generator automatically outputs:

```css
--custom-value1: ...;
--custom-value2: ...;
```

### Export New Types

```typescript
// In src/tokens/index.ts
export type CustomTokens = keyof typeof tokenConfig.custom;
```

Now components can use:

```typescript
import { CustomTokens } from '@/tokens';
type MyCustom = CustomTokens;
```

## Troubleshooting

### Tokens are outdated in a sample

**Solution:** Regenerate

```bash
npm run generate:tokens
```

Or it will regenerate automatically on next `npm run build`.

### Build fails with "tokens.css not found"

**Reason:** Generator hasn't run yet.

**Solution:** Run generator manually

```bash
npm run generate:tokens
```

Or it will run automatically on `npm run build`.

### Changes to config.ts don't appear immediately

**Reason:** Samples cache the CSS.

**Solution:** Regenerate

```bash
npm run generate:tokens
```

## See Also

- [`src/tokens/config.ts`](./src/tokens/config.ts) — Token definitions
- [`src/tokens/generateCSS.ts`](./src/tokens/generateCSS.ts) — Generator script
- Sample README files (each sample has a README explaining its monad pattern)
