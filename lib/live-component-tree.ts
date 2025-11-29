/**
 * Build component tree from actual rendered DOM
 * Only shows components that are currently visible on the page
 */

export interface LiveComponentNode {
  name: string;
  type: 'component' | 'element';
  children: LiveComponentNode[];
  depth: number;
}

/**
 * Get fiber from DOM element
 */
function getFiberFromElement(element: Element): any {
  const keys = Object.keys(element);
  const fiberKey = keys.find(
    key => key.startsWith('__reactFiber') || key.startsWith('__reactInternalInstance')
  );
  if (fiberKey) {
    return (element as any)[fiberKey];
  }
  return (element as any)._reactInternals || (element as any)._reactInternalFiber;
}

/**
 * Get component name from fiber
 */
function getComponentName(fiber: any): string {
  if (!fiber.type) return 'Unknown';

  if (typeof fiber.type === 'function') {
    return fiber.type.displayName || fiber.type.name || 'Anonymous';
  }

  if (typeof fiber.type === 'string') {
    return fiber.type;
  }

  return String(fiber.type);
}

/**
 * Walk up fiber tree to find all component ancestors
 */
function getComponentPath(fiber: any): string[] {
  const path: string[] = [];
  let current = fiber;

  while (current) {
    const name = getComponentName(current);
    const isComponent = typeof current.type === 'function';

    // Include ALL React components for now, filter later
    if (isComponent && /^[A-Z]/.test(name)) {
      path.unshift(name);
    }

    current = current.return;
  }

  return path;
}

/**
 * Find the index of the first user component (skip framework)
 */
function findUserComponentStart(path: string[]): number {
  const frameworkComponents = [
    'Root', 'ServerRoot', 'SWRConfig', 'ConditionalLayout',
    'ScrollAndFocusHandler', 'InnerScrollAndFocusHandler',
    'Provider', 'Consumer', 'Context', 'Suspense', 'Fragment',
    'Portal', 'Boundary', 'Router', 'Head', 'Script',
    'HotReload', 'Overlay', 'Updater'
  ];

  for (let i = 0; i < path.length; i++) {
    const name = path[i];
    const isFramework = frameworkComponents.some(fw => name.includes(fw)) ||
                       name.startsWith('_') ||
                       name === 'Unknown' ||
                       name === 'Anonymous';

    if (!isFramework) {
      return i;
    }
  }

  return -1;
}

/**
 * Build a tree structure from component paths
 */
function buildTreeFromPaths(paths: string[][]): LiveComponentNode[] {
  if (paths.length === 0) return [];

  const root: LiveComponentNode = {
    name: '__ROOT__',
    type: 'component',
    children: [],
    depth: -1,
  };

  for (const path of paths) {
    if (path.length === 0) continue;

    let currentNode = root;

    for (let i = 0; i < path.length; i++) {
      const componentName = path[i];

      // Find or create child
      let childNode = currentNode.children.find(c => c.name === componentName);

      if (!childNode) {
        childNode = {
          name: componentName,
          type: 'component',
          children: [],
          depth: i,
        };
        currentNode.children.push(childNode);
      }

      currentNode = childNode;
    }
  }

  // Return root's children (skip the synthetic root)
  return root.children;
}

/**
 * Get live component tree from rendered DOM
 */
export function getLiveComponentTree(containerElement: Element): LiveComponentNode[] {
  console.log('🔍 Building live component tree from DOM...');

  // Get all DOM elements in the container
  const allElements = containerElement.querySelectorAll('*');

  console.log(`📊 Found ${allElements.length} DOM elements`);

  // Get component paths for each element
  const componentPaths: string[][] = [];
  const seenPaths = new Set<string>();

  allElements.forEach((element) => {
    const fiber = getFiberFromElement(element);
    if (fiber) {
      const fullPath = getComponentPath(fiber);

      // Find where user components start
      const startIndex = findUserComponentStart(fullPath);

      if (startIndex >= 0) {
        // Trim framework components from the beginning
        const path = fullPath.slice(startIndex);
        const pathKey = path.join(' > ');

        // Only add unique paths
        if (path.length > 0 && !seenPaths.has(pathKey)) {
          seenPaths.add(pathKey);
          componentPaths.push(path);
          console.log('📍 Component path:', pathKey);
        }
      }
    }
  });

  console.log(`✅ Found ${componentPaths.length} unique component paths`);

  // Build tree from paths
  const tree = buildTreeFromPaths(componentPaths);

  console.log('🌳 Built component tree:', tree);

  // Skip the outermost container component (ComponentSandboxClient)
  // and return its children instead
  if (tree.length === 1 && tree[0].children.length > 0) {
    console.log(`⏭️  Skipping root container: ${tree[0].name}`);
    return tree[0].children;
  }

  return tree;
}

/**
 * Flatten tree for rendering
 */
export function flattenLiveTree(
  nodes: LiveComponentNode[],
  depth = 0
): Array<{ node: LiveComponentNode; depth: number }> {
  const result: Array<{ node: LiveComponentNode; depth: number }> = [];

  for (const node of nodes) {
    result.push({ node, depth });
    if (node.children.length > 0) {
      result.push(...flattenLiveTree(node.children, depth + 1));
    }
  }

  return result;
}
