/**
 * Design Tokens — Type-Safe Exports
 *
 * Shared token configuration and types for all samples.
 * CSS is generated at build time from config.ts
 *
 * Usage in samples:
 *   import { ColorTokens } from '@/tokens'
 *   type MyColor = ColorTokens
 */

export type { TokenConfig, ColorTokens, SpacingTokens, FontSizeTokens, RadiusTokens, TransitionTokens } from './config.js';

export { tokenConfig } from './config.js';
