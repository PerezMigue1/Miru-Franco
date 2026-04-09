const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '..', 'src', 'app');
const privadaDir = path.join(appDir, '(screens)', '(privada)');

const foldersToMove = ['perfil', 'cliente', 'subir-imagenes'];

/** Rechaza nombres que puedan confundir join/resolve (.., separadores, null). */
function assertSafeEntryName(name) {
  if (typeof name !== 'string' || name.length === 0) {
    throw new Error('Nombre de entrada inválido');
  }
  if (name === '.' || name === '..') {
    throw new Error(`Nombre de entrada no permitido: ${name}`);
  }
  if (name.includes('\0') || name.includes('/') || name.includes('\\')) {
    throw new Error(`Nombre de entrada no permitido: ${name}`);
  }
}

/**
 * Une parent + segment y comprueba que el resultado quede bajo parent (mitiga path traversal).
 */
function safeJoin(parent, segment) {
  assertSafeEntryName(segment);
  const resolvedParent = path.resolve(parent);
  const joined = path.join(resolvedParent, segment);
  const resolvedChild = path.resolve(joined);
  const rel = path.relative(resolvedParent, resolvedChild);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Ruta fuera del directorio permitido: ${segment}`);
  }
  return joined;
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const e of entries) {
    const s = safeJoin(src, e.name);
    const d = safeJoin(dest, e.name);
    if (e.isDirectory()) copyDirSync(s, d);
    else fs.copyFileSync(s, d);
  }
}

// Add 2 "../" to every relative import (route groups (screens)+(privada) add 2 segments).
function fixImportsInFile(filePath) {
  const resolved = path.resolve(filePath);
  const allowedRoot = path.resolve(privadaDir);
  const rel = path.relative(allowedRoot, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Archivo fuera del árbol permitido: ${filePath}`);
  }

  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/from '(\.\.\/)+/g, (match) => {
    const count = (match.match(/\.\.\//g) || []).length;
    return "from '" + '../'.repeat(count + 2);
  });
  fs.writeFileSync(filePath, content);
}

function fixImportsRecursive(dir) {
  const resolvedDir = path.resolve(dir);
  const allowedRoot = path.resolve(privadaDir);
  const relBase = path.relative(allowedRoot, resolvedDir);
  if (relBase.startsWith('..') || path.isAbsolute(relBase)) {
    throw new Error(`Directorio fuera del árbol permitido: ${dir}`);
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = safeJoin(dir, e.name);
    if (e.isDirectory()) fixImportsRecursive(p);
    else if (e.name.endsWith('.tsx') || e.name.endsWith('.ts')) fixImportsInFile(p);
  }
}

function rmDirSync(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = safeJoin(dir, e.name);
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
