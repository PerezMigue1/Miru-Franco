const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '..', 'src', 'app');
const privadaDir = path.join(appDir, '(screens)', '(privada)');

const foldersToMove = ['perfil', 'cliente', 'subir-imagenes'];

function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) copyDirSync(s, d);
    else fs.copyFileSync(s, d);
  }
}

// Add 2 "../" to every relative import (route groups (screens)+(privada) add 2 segments).
function fixImportsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/from '(\.\.\/)+/g, (match) => {
    const count = (match.match(/\.\.\//g) || []).length;
    return "from '" + '../'.repeat(count + 2);
  });
  fs.writeFileSync(filePath, content);
}

function fixImportsRecursive(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) fixImportsRecursive(p);
    else if (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) fixImportsInFile(p);
  }
}

function rmDirSync(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) rmDirSync(p);
    else fs.unlinkSync(p);
  }
  fs.rmdirSync(dir);
}

if (!fs.existsSync(privadaDir)) fs.mkdirSync(privadaDir, { recursive: true });

// Remove existing so we copy fresh and fix once
for (const folder of foldersToMove) {
  const dest = path.join(privadaDir, folder);
  if (fs.existsSync(dest)) rmDirSync(dest);
}

for (const folder of foldersToMove) {
  const src = path.join(appDir, folder);
  if (!fs.existsSync(src)) continue;
  const dest = path.join(privadaDir, folder);
  copyDirSync(src, dest);
  console.log('Copied', folder);
}

fixImportsRecursive(privadaDir);
console.log('Fixed imports');
