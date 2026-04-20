#!/usr/bin/env node
/**
 * preinstall.js — Render build compatibility
 *
 * render.yaml explicitly sets buildCommand: "npm install && npm run build:render"
 * and startCommand: "npm run serve:render". When render.yaml is present, Render
 * does NOT auto-detect package.json fields — render.yaml takes precedence.
 *
 * Therefore "main": "expo-router/entry" must stay so Metro finds the entry point
 * during `npx expo export --platform web`. Removing it broke the bundler.
 *
 * This script is now a no-op kept for documentation purposes.
 */

const path = require('path');
const fs = require('fs');

console.log('[preinstall] render.yaml governs buildCommand — "main" field stays intact for Metro');
const pkgPath = path.resolve(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
console.log('[preinstall] main field =', pkg.main || '(none)');
