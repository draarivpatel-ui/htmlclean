// Generate CommonJS modules from src/*.mjs with a small, dependency-free
// transform. The library uses only static import/export syntax that this
// transform handles. Run: node scripts/build-cjs.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'src');
const cjsDir = join(root, 'cjs');
mkdirSync(cjsDir, { recursive: true });

const MODULES = ['entities', 'tokenizer', 'sanitize', 'index'];

function transform(source) {
  const exportAssignments = [];
  let out = source;

  out = out.replace(/import\s*\{([^}]*)\}\s*from\s*'(\.\/[^']+\.mjs)';/g, (full, names, spec) => {
    const bindings = names.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
      const parts = s.split(/\s+as\s+/);
      return parts.length === 2 ? `${parts[1]}: ${parts[0]}` : s;
    });
    return `const { ${bindings.join(', ')} } = require('${spec.replace(/\.mjs$/, '.cjs')}');`;
  });
  out = out.replace(/export\s*\{([^}]*)\}\s*from\s*'(\.\/[^']+\.mjs)';/g, (full, names, spec) => {
    const local = `__reexport_${spec.replace(/[^\w]/g, '_')}`;
    const lines = [`const ${local} = require('${spec.replace(/\.mjs$/, '.cjs')}');`];
    for (const raw of names.split(',').map((s) => s.trim()).filter(Boolean)) {
      const parts = raw.split(/\s+as\s+/);
      const source = parts[0];
      const exported = parts[1] || source;
      lines.push(`Object.defineProperty(exports, ${JSON.stringify(exported)}, { enumerable: true, get: () => ${local}.${source} });`);
    }
    return lines.join('\n');
  });
  out = out.replace(/export\s*\{([^}]*)\};/g, (full, names) => {
    const lines = [];
    for (const raw of names.split(',').map((s) => s.trim()).filter(Boolean)) {
      const parts = raw.split(/\s+as\s+/);
      const local = parts[0];
      const exported = parts[1] || local;
      exportAssignments.push([exported, local]);
      if (exported !== local) lines.push(`Object.defineProperty(exports, ${JSON.stringify(exported)}, { enumerable: true, get: () => ${local} });`);
    }
    return lines.join('\n');
  });
  out = out.replace(/export\s+(const|let|function|async\s+function|class)\s+([A-Za-z_$][\w$]*)/g, (full, kind, name) => {
    exportAssignments.push([name, name]);
    return `${kind} ${name}`;
  });
  out = out.replace(/export\s+default\s+([A-Za-z_$][\w$]*);/g, (full, name) => {
    exportAssignments.push(['default', name]);
    return '';
  });

  const seen = new Set();
  for (const [exported, local] of exportAssignments) {
    if (seen.has(exported)) continue;
    seen.add(exported);
    if (exported !== 'default') out += `\nexports.${exported} = ${local};`;
  }
  return `${out}\n`;
}

for (const name of MODULES) {
  writeFileSync(join(cjsDir, `${name}.cjs`), transform(readFileSync(join(srcDir, `${name}.mjs`), 'utf8')));
}
console.log(`Generated ${MODULES.length} CommonJS modules in cjs/`);
