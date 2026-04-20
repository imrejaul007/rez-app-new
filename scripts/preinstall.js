#!/usr/bin/env node
/**
 * preinstall.js — Render build compatibility
 *
 * On Render ($RENDER is set): remove "main" so Render does not auto-detect
 * a Node.js entry point (expo-router/entry is a Metro virtual module, not a
 * Node server). The render.yaml startCommand serves static dist/ files instead.
 *
 * On Vercel / elsewhere ($RENDER not set): "main" stays so Metro finds the
 * expo-router entry point during web bundling.
 */

const path = require('path');
const fs = require('fs');

const pkgPath = path.resolve(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

if (!process.env.RENDER) {
  console.log('[preinstall] Not Render — "main" field stays intact for Metro');
  console.log('[preinstall] main field =', pkg.main || '(none)');
  process.exit(0);
}

if (!pkg.main) {
  console.log('[preinstall] Render detected — "main" already absent, nothing to do');
  process.exit(0);
}

delete pkg.main;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('[preinstall] Render detected — removed "main" field so Render does not auto-detect expo-router/entry as a Node.js server');
