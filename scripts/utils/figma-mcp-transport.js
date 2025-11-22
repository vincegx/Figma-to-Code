/**
 * Figma MCP Transport Compatibility Patch
 *
 * Fixes: Figma Desktop sends serverInfo.icons[].sizes as string instead of array
 * SDK expects: array format per MCP spec
 *
 * This patches JSON.parse globally to normalize Figma's response format.
 */

/**
 * Patch JSON.parse to fix Figma serverInfo format before Zod validation
 */
export function patchJSONForFigma() {
  const originalParse = JSON.parse;

  JSON.parse = function (text, reviver) {
    const obj = originalParse.call(this, text, reviver);

    // Patch serverInfo.icons[].sizes if it's a string
    if (obj?.result?.serverInfo?.icons) {
      obj.result.serverInfo.icons = obj.result.serverInfo.icons.map(icon => {
        if (icon?.sizes && typeof icon.sizes === 'string') {
          return { ...icon, sizes: [icon.sizes] };
        }
        return icon;
      });
    }

    return obj;
  };

  // Return function to restore original
  return () => {
    JSON.parse = originalParse;
  };
}
