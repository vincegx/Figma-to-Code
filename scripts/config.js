/**
 * Transform Configuration
 *
 * Simple configuration for enabling/disabling transforms
 * and setting transform-specific options
 */

export const defaultConfig = {
  // Enable/disable individual transforms
  'font-detection': {
    enabled: true,
    usePostScriptName: true,  // Use fontPostScriptName for accurate weight
    useTextStyleId: true      // Use textStyleId for design system styles
  },
  'auto-layout': {
    enabled: false,  // NEW - Disabled by default for testing
    fixMissingGap: true,
    fixMissingAlignments: true,
    fixSizing: true
  },
  'ast-cleaning': {
    enabled: true
  },
  'svg-icon-fixes': {
    enabled: true
  },
  'post-fixes': {
    enabled: true,
    fixShadows: true,         // Fix shadow order, spread, visibility
    fixTextTransform: true    // Add text-transform from textCase
  },
  'position-fixes': {
    enabled: false,  // NEW - Disabled by default for testing
    convertAbsoluteToRelative: true,
    skipOverlays: true
  },
  'stroke-alignment': {
    enabled: false,  // NEW - Disabled by default for testing
    useBoxShadowForInside: true,
    useOutlineForOutside: true
  },
  'css-vars': {
    enabled: true
  },
  'tailwind-optimizer': {
    enabled: true
  },

  // Global options
  continueOnError: false  // Stop on first error or continue
}
