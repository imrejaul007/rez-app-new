#!/usr/bin/env node
/**
 * preinstall.js — Render build compatibility
 *
 * Render auto-detects "main" in package.json and overrides render.yaml,
 * running node expo-router/entry as a web server (which fails since
 * expo-router is not a Node.js server).
 *
 * Vercel uses GitHub Actions (not Render's auto-detect) so it does not
 * set $RENDER — the "main" field stays intact for Vercel's build.
 *
 * On Render ($RENDER is set): remove "main" so render.yaml is respected.
 * On Vercel / elsewhere ($RENDER not set): leave package.json untouched.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

if (!process.env.RENDER) {
  // Not a Render build — leave "main" field for Vercel / local dev
  process.exit(0);
}

const pkgPath = path.resolve(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

if (!pkg.main) {
  // "main" already absent — nothing to do
  process.exit(0);
}

delete pkg.main;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log('[preinstall] Render detected — removed "main" field so render.yaml is respected');
