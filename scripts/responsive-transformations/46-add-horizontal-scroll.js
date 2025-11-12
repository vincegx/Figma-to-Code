import traverse from '@babel/traverse';

const traverseDefault = traverse.default || traverse;

export const meta = {
  name: 'add-horizontal-scroll',
  priority: 41,
  description: 'Add overflow-x-auto to parent containers when children have fixed mobile widths'
};

function extractClassName(jsxElement) {
  const classNameAttr = jsxElement?.openingElement?.attributes.find(
    attr => attr.type === 'JSXAttribute' && attr.name?.name === 'className'
  );

  if (!classNameAttr?.value) return null;

  if (classNameAttr.value.type === 'StringLiteral') {
    return classNameAttr.value.value.trim();
  }

  if (classNameAttr.value.type === 'JSXExpressionContainer' &&
      classNameAttr.value.expression.type === 'StringLiteral') {
    return classNameAttr.value.expression.value.trim();
  }

  return null;
}

function updateClassName(jsxElement, newClassName) {
  const classNameAttr = jsxElement.openingElement.attributes.find(
    attr => attr.type === 'JSXAttribute' && attr.name?.name === 'className'
  );

  if (!classNameAttr) return;

  if (classNameAttr.value.type === 'StringLiteral') {
    classNameAttr.value.value = newClassName;
  } else if (classNameAttr.value.type === 'JSXExpressionContainer' &&
             classNameAttr.value.expression.type === 'StringLiteral') {
    classNameAttr.value.expression.value = newClassName;
  }
}

/**
 * Check if element has flex horizontal layout on mobile
 * (flex without flex-col, or flex-row, and no max-md:flex-col)
 */
function isHorizontalFlexOnMobile(className) {
  if (!className) return false;
  const classes = className.split(/\s+/);

  const hasFlex = classes.includes('flex') || classes.includes('inline-flex');
  const hasFlexCol = classes.some(c => c === 'flex-col' || c === 'flex-col-reverse');
  const hasMobileFlexCol = classes.some(c => c === 'max-md:flex-col' || c === 'max-md:flex-col-reverse');

  // Horizontal if: has flex AND (no flex-col OR mobile overrides to flex-row)
  return hasFlex && (!hasFlexCol || hasMobileFlexCol);
}

/**
 * Check if children have fixed widths on mobile
 */
function hasFixedMobileWidth(className) {
  if (!className) return false;
  return className.split(/\s+/).some(c => c.startsWith('max-md:w-custom-'));
}

/**
 * Check if element won't shrink (has shrink-0 without max-md:shrink-1)
 */
function wontShrinkOnMobile(className) {
  if (!className) return false;
  const classes = className.split(/\s+/);
  return classes.includes('shrink-0') && !classes.includes('max-md:shrink-1');
}

/**
 * Check if parent already has overflow-x
 */
function hasOverflowX(className) {
  if (!className) return false;
  const classes = className.split(/\s+/);
  return classes.some(c =>
    c === 'overflow-x-auto' ||
    c === 'overflow-x-scroll' ||
    c === 'overflow-x-hidden' ||
    c === 'max-md:overflow-x-auto' ||
    c === 'max-md:overflow-x-scroll'
  );
}

export function execute(context) {
  const { desktopAST } = context;

  let parentsUpdated = 0;
  let totalOverflowAdded = 0;

  // Map to track parents that need overflow
  const parentsNeedingOverflow = new Map();

  // PASS 1: Identify children with fixed mobile widths
  traverseDefault(desktopAST, {
    JSXElement(path) {
      const className = extractClassName(path.node);

      // Check if this child has fixed mobile width and won't shrink
      if (hasFixedMobileWidth(className) && wontShrinkOnMobile(className)) {
        // Find parent JSXElement
        let parentPath = path.parentPath;
        while (parentPath && parentPath.node.type !== 'JSXElement') {
          parentPath = parentPath.parentPath;
        }

        if (parentPath && parentPath.node.type === 'JSXElement') {
          const parentNode = parentPath.node;
          const parentClassName = extractClassName(parentNode);

          // Only track if parent is horizontal flex on mobile
          if (isHorizontalFlexOnMobile(parentClassName) && !hasOverflowX(parentClassName)) {
            if (!parentsNeedingOverflow.has(parentNode)) {
              parentsNeedingOverflow.set(parentNode, {
                count: 0,
                path: parentPath
              });
            }
            parentsNeedingOverflow.get(parentNode).count++;
          }
        }
      }
    }
  });

  // PASS 2: Add overflow-x-auto to identified parents
  for (const [parentNode, data] of parentsNeedingOverflow.entries()) {
    // Only add overflow if there are multiple children with fixed widths
    // (single child doesn't need scroll)
    if (data.count >= 2) {
      const currentClassName = extractClassName(parentNode);
      const newClassName = `${currentClassName} max-md:overflow-x-auto`.trim();
      updateClassName(parentNode, newClassName);

      parentsUpdated++;
      totalOverflowAdded++;
    }
  }

  return {
    parentsUpdated,
    totalOverflowAdded,
    candidatesFound: parentsNeedingOverflow.size
  };
}
