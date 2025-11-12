import traverse from '@babel/traverse';

const traverseDefault = traverse.default || traverse;

export const meta = {
  name: 'detect-class-conflicts',
  priority: 30,
  description: 'Detect mutually exclusive classes (flex-row vs flex-col, items-start vs items-center, etc.)'
};

// Define mutually exclusive class groups
const CONFLICT_GROUPS = {
  flexDirection: ['flex-row', 'flex-col', 'flex-row-reverse', 'flex-col-reverse'],
  alignItems: ['items-start', 'items-center', 'items-end', 'items-baseline', 'items-stretch'],
  justifyContent: ['justify-start', 'justify-center', 'justify-end', 'justify-between', 'justify-around', 'justify-evenly'],
  alignContent: ['content-start', 'content-center', 'content-end', 'content-between', 'content-around', 'content-evenly', 'content-stretch'],
  display: ['block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'inline-grid', 'hidden'],
  position: ['static', 'fixed', 'absolute', 'relative', 'sticky']
};

// Regex patterns for dynamic classes
const DYNAMIC_CONFLICT_PATTERNS = {
  width: /^w-/,
  minWidth: /^min-w-/,
  maxWidth: /^max-w-/,
  height: /^h-/,
  minHeight: /^min-h-/,
  maxHeight: /^max-h-/,
  basis: /^basis-/,
  grow: /^grow/,
  shrink: /^shrink/
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

function normalizeClassName(className) {
  if (!className) return new Set();
  return new Set(className.trim().split(/\s+/).filter(c => c.length > 0));
}

function extractDataName(jsxElement) {
  const dataNameAttr = jsxElement?.openingElement?.attributes.find(
    attr => attr.type === 'JSXAttribute' && attr.name?.name === 'data-name'
  );
  return dataNameAttr?.value?.value || null;
}

function getElementType(jsxElement) {
  return jsxElement?.openingElement?.name?.name || null;
}

function buildElementPath(path) {
  // Find nearest parent with data-name
  let currentPath = path.parentPath;
  while (currentPath) {
    if (currentPath.node.type === 'JSXElement') {
      const parentDataName = extractDataName(currentPath.node);
      if (parentDataName) {
        // Get index among siblings
        const siblings = currentPath.node.children.filter(c => c.type === 'JSXElement');
        const siblingIndex = siblings.indexOf(path.node);
        return `${parentDataName}>[${siblingIndex}]`;
      }
    }
    currentPath = currentPath.parentPath;
  }
  return null;
}

function buildElementIndex(ast) {
  const index = new Map();

  traverseDefault(ast, {
    JSXElement(path) {
      const elementPath = buildElementPath(path);
      if (elementPath) {
        index.set(elementPath, {
          node: path.node,
          className: extractClassName(path.node),
          elementType: getElementType(path.node)
        });
      }
    }
  });

  return index;
}

/**
 * Classes that represent dimensional/layout properties that often differ across breakpoints
 * These are excluded from core similarity calculation
 */
const DIMENSIONAL_PATTERNS = [
  /^w-/,           // width
  /^min-w-/,       // min-width
  /^max-w-/,       // max-width
  /^h-/,           // height
  /^min-h-/,       // min-height
  /^max-h-/,       // max-height
  /^basis-/,       // flex-basis
  /^grow$/,        // flex-grow
  /^grow-/,        // flex-grow-*
  /^shrink$/,      // flex-shrink
  /^shrink-/,      // flex-shrink-*
  /^gap-/,         // gap
  /^p-/,           // padding
  /^px-/,          // padding-x
  /^py-/,          // padding-y
  /^m-/,           // margin
  /^mx-/,          // margin-x
  /^my-/           // margin-y
];

function isDimensionalClass(className) {
  return DIMENSIONAL_PATTERNS.some(pattern => pattern.test(className));
}

function calculateSimilarity(className1, className2) {
  const classes1 = normalizeClassName(className1);
  const classes2 = normalizeClassName(className2);

  if (classes1.size === 0 && classes2.size === 0) return 100;
  if (classes1.size === 0 || classes2.size === 0) return 0;

  // Calculate total similarity
  const intersection = [...classes1].filter(c => classes2.has(c));
  const union = new Set([...classes1, ...classes2]);
  const totalSimilarity = (intersection.length / union.size) * 100;

  // Calculate core similarity (excluding dimensional properties)
  const coreClasses1 = [...classes1].filter(c => !isDimensionalClass(c));
  const coreClasses2 = [...classes2].filter(c => !isDimensionalClass(c));

  if (coreClasses1.length === 0 && coreClasses2.length === 0) {
    // Both have only dimensional classes, use total similarity
    return totalSimilarity;
  }

  const coreSet1 = new Set(coreClasses1);
  const coreSet2 = new Set(coreClasses2);
  const coreIntersection = coreClasses1.filter(c => coreSet2.has(c));
  const coreUnion = new Set([...coreClasses1, ...coreClasses2]);

  if (coreUnion.size === 0) {
    return totalSimilarity;
  }

  const coreSimilarity = (coreIntersection.length / coreUnion.size) * 100;

  // Use the higher of total or core similarity
  // This allows matching elements with same structure but different dimensions
  return Math.max(totalSimilarity, coreSimilarity);
}

function findMatchingElement(ast, dataName, elementPath, desktopClassName, elementType) {
  // Level 1: Match by data-name (most reliable)
  if (dataName) {
    let found = null;
    traverseDefault(ast, {
      JSXElement(path) {
        if (found) return;
        const targetDataName = extractDataName(path.node);
        if (targetDataName === dataName) {
          found = extractClassName(path.node);
        }
      }
    });
    return found;
  }

  // Level 2: Match by position + similarity (for elements without data-name)
  if (elementPath && desktopClassName && elementType) {
    const index = buildElementIndex(ast);
    const candidate = index.get(elementPath);

    if (candidate) {
      // Check element type matches
      if (candidate.elementType === elementType) {
        // Check class similarity
        const similarity = calculateSimilarity(desktopClassName, candidate.className);

        // Require 80% similarity to accept match
        if (similarity >= 80) {
          return candidate.className;
        }
      }
    }
  }

  // Level 3: No match found
  return null;
}

function detectConflictsForElement(mobileClasses, tabletClasses, desktopClasses) {
  const conflicts = [];

  // Check static conflict groups
  for (const [groupName, groupClasses] of Object.entries(CONFLICT_GROUPS)) {
    const mobileMatch = [...mobileClasses].find(c => groupClasses.includes(c));
    const tabletMatch = [...tabletClasses].find(c => groupClasses.includes(c));
    const desktopMatch = [...desktopClasses].find(c => groupClasses.includes(c));

    if (mobileMatch || tabletMatch || desktopMatch) {
      if (mobileMatch !== tabletMatch || tabletMatch !== desktopMatch) {
        conflicts.push({
          group: groupName,
          mobile: mobileMatch || null,
          tablet: tabletMatch || null,
          desktop: desktopMatch || null
        });
      }
    }
  }

  // Check dynamic pattern conflicts
  for (const [patternName, pattern] of Object.entries(DYNAMIC_CONFLICT_PATTERNS)) {
    const mobileMatches = [...mobileClasses].filter(c => pattern.test(c));
    const tabletMatches = [...tabletClasses].filter(c => pattern.test(c));
    const desktopMatches = [...desktopClasses].filter(c => pattern.test(c));

    if (mobileMatches.length > 0 || tabletMatches.length > 0 || desktopMatches.length > 0) {
      const mobileStr = mobileMatches.join(' ');
      const tabletStr = tabletMatches.join(' ');
      const desktopStr = desktopMatches.join(' ');

      if (mobileStr !== tabletStr || tabletStr !== desktopStr) {
        conflicts.push({
          group: patternName,
          mobile: mobileMatches,
          tablet: tabletMatches,
          desktop: desktopMatches
        });
      }
    }
  }

  return conflicts;
}

export function execute(context) {
  const { desktopAST, tabletAST, mobileAST } = context;

  const classConflicts = new Map();
  let totalConflicts = 0;
  let matchedByDataName = 0;
  let matchedByPosition = 0;

  traverseDefault(desktopAST, {
    JSXElement(path) {
      // Extract element info from desktop
      const dataName = extractDataName(path.node);
      const desktopClassName = extractClassName(path.node);
      const elementType = getElementType(path.node);
      const elementPath = buildElementPath(path);

      if (!desktopClassName) return;

      // Try to find matching elements using hybrid strategy
      const tabletClassName = findMatchingElement(
        tabletAST,
        dataName,
        elementPath,
        desktopClassName,
        elementType
      );

      const mobileClassName = findMatchingElement(
        mobileAST,
        dataName,
        elementPath,
        desktopClassName,
        elementType
      );

      if (!tabletClassName || !mobileClassName) return;

      // Track matching strategy
      if (dataName) {
        matchedByDataName++;
      } else if (elementPath) {
        matchedByPosition++;
      }

      const desktopClasses = normalizeClassName(desktopClassName);
      const tabletClasses = normalizeClassName(tabletClassName);
      const mobileClasses = normalizeClassName(mobileClassName);

      const conflicts = detectConflictsForElement(mobileClasses, tabletClasses, desktopClasses);

      if (conflicts.length > 0) {
        // Use data-name if available, otherwise use element path
        const key = dataName || elementPath;
        classConflicts.set(key, conflicts);
        totalConflicts += conflicts.length;
      }
    }
  });

  context.classConflicts = classConflicts;

  return {
    elementsWithConflicts: classConflicts.size,
    totalConflicts,
    matchedByDataName,
    matchedByPosition
  };
}
