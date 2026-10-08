#!/usr/bin/env node
// Ustawia wersję gry: node tools/bump.js 0.7.0
// - js/version.js            -> DD.VERSION
// - index.html               -> ?v=<wersja> przy lokalnych plikach .js i .css
// Wpis do CHANGELOG.md dodajesz ręcznie (sekcja [Unreleased] -> [<wersja>] - data).
const fs = require('fs');
const path = require('path');
const v = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(v || '')) { console.error('Użycie: node tools/bump.js X.Y.Z'); process.exit(1); }
const root = path.join(__dirname, '..');
const vf = path.join(root, 'js/version.js');
fs.writeFileSync(vf, fs.readFileSync(vf, 'utf8').replace(/DD\.VERSION = '[^']*'/, `DD.VERSION = '${v}'`));
const hf = path.join(root, 'index.html');
let html = fs.readFileSync(hf, 'utf8');
html = html.replace(/((?:src|href)="(?:js|css)\/[^"?]+\.(?:js|css))(\?v=[^"]*)?"/g, `$1?v=${v}"`);
fs.writeFileSync(hf, html);
console.log('Wersja ustawiona na', v);
