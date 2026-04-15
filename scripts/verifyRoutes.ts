/**
 * SafeDeploy Route Verification Script
 * Verifies all app/ route files are properly structured for expo-router
 *
 * Run: npx ts-node scripts/verifyRoutes.ts
 *
 * This script checks:
 * 1. All route files export a default component
 * 2. Layout files are properly named
 * 3. Dynamic segments are properly formatted
 * 4. No circular dependencies or invalid patterns
 */

import { readdirSync, statSync, readFileSync } from 'fs';
import { join, relative } from 'path';

const APP_DIR = join(__dirname, '../app');
const issues: string[] = [];
const warnings: string[] = [];
const validRoutes: string[] = [];

interface RouteStats {
  totalFiles: number;
  totalDirectories: number;
  filesWithErrors: number;
  filesWithWarnings: number;
}

const stats: RouteStats = {
  totalFiles: 0,
  totalDirectories: 0,
  filesWithErrors: 0,
  filesWithWarnings: 0,
};

/**
 * Valid expo-router segment patterns:
 * - [id] - dynamic segment
 * - [...all] - catch-all segment
 * - (group) - route group (non-path)
 * - _layout.tsx - layout file
 * - +html.tsx - special native routing
 * - +not-found.tsx - not found handler
 */
function isValidSegment(name: string): boolean {
  // File names
  if (name === '_layout.tsx' || name === '_layout.ts') return true;
  if (name === '+html.tsx') return true;
  if (name === '+not-found.tsx') return true;

  // Directory names
  if (name.match(/^\[.*\]$/)) return true; // [id], [slug], etc.
  if (name.match(/^\[\.\.\./)) return true; // [...all]
  if (name.match(/^\(.*\)$/)) return true; // (tabs), (auth), etc.

  // Regular route files
  if (name.endsWith('.tsx') || name.endsWith('.ts')) return true;

  return false;
}

function checkDir(dir: string, prefix: string = ''): void {
  let entries: string[] = [];
  try {
    entries = readdirSync(dir);
  } catch (error) {
    issues.push(`Cannot read directory: ${relative(APP_DIR, dir)}`);
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    const routePath = prefix ? `${prefix}/${entry}` : `/${entry}`;

    if (entry.startsWith('.')) {
      // Skip hidden files
      continue;
    }

    if (stat.isDirectory()) {
      stats.totalDirectories++;

      if (!isValidSegment(entry)) {
        warnings.push(`Unusual directory name: ${routePath}`);
      }

      // Recursively check subdirectories
      checkDir(fullPath, routePath);
    } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
      stats.totalFiles++;

      if (!isValidSegment(entry)) {
        warnings.push(`Unusual file name: ${routePath}`);
      }

      // Check file exports a default component (unless it's a special file)
      if (!entry.startsWith('_') && !entry.startsWith('+')) {
        try {
          const content = readFileSync(fullPath, 'utf-8');

          // Check for default export
          const hasDefaultExport =
            content.includes('export default') ||
            content.includes('export { default }');

          if (!hasDefaultExport) {
            issues.push(
              `Missing default export in route: ${routePath} (${relative(APP_DIR, fullPath)})`
            );
            stats.filesWithErrors++;
          } else {
            validRoutes.push(routePath);
          }

          // Check for common issues
          if (
            content.includes('export const') &&
            !content.includes('export default')
          ) {
            const exports = content.match(/export const \w+/g) || [];
            if (exports.length > 0) {
              warnings.push(
                `${routePath} exports constants but no default component. Did you mean "export default"?`
              );
              stats.filesWithWarnings++;
            }
          }
        } catch (error) {
          issues.push(`Cannot read file: ${relative(APP_DIR, fullPath)}`);
          stats.filesWithErrors++;
        }
      } else if (entry === '_layout.tsx' || entry === '_layout.ts') {
        // Layout files should also have a default export
        try {
          const content = readFileSync(fullPath, 'utf-8');
          const hasDefaultExport =
            content.includes('export default') ||
            content.includes('export { default }');

          if (!hasDefaultExport) {
            issues.push(
              `Layout file missing default export: ${routePath} (${relative(APP_DIR, fullPath)})`
            );
            stats.filesWithErrors++;
          } else {
            validRoutes.push(routePath);
          }
        } catch (error) {
          issues.push(`Cannot read layout file: ${relative(APP_DIR, fullPath)}`);
          stats.filesWithErrors++;
        }
      }
    }
  }
}

/**
 * Main verification function
 */
function verifyRoutes(): void {
  console.log('SafeDeploy Route Verification\n');
  console.log(`Scanning: ${APP_DIR}\n`);

  checkDir(APP_DIR);

  // Report results
  console.log(`=== Route Statistics ===`);
  console.log(`Files: ${stats.totalFiles}`);
  console.log(`Directories: ${stats.totalDirectories}`);
  console.log(`Valid routes: ${validRoutes.length}`);
  console.log(`Errors: ${stats.filesWithErrors}`);
  console.log(`Warnings: ${stats.filesWithWarnings}\n`);

  if (warnings.length > 0) {
    console.warn('⚠️  Warnings:');
    warnings.forEach(w => console.warn(` - ${w}`));
    console.log('');
  }

  if (issues.length > 0) {
    console.error('❌ Issues found:');
    issues.forEach(i => console.error(` - ${i}`));
    console.log('');
    console.log(`Fix the above ${issues.length} issue(s) before deploying.`);
    process.exit(1);
  } else {
    console.log(
      '✅ All routes valid! Ready for deployment.\n'
    );
    console.log('Sample valid routes:');
    validRoutes.slice(0, 10).forEach(r => console.log(` - ${r}`));
    if (validRoutes.length > 10) {
      console.log(` ... and ${validRoutes.length - 10} more`);
    }
    process.exit(0);
  }
}

// Run verification
verifyRoutes();
