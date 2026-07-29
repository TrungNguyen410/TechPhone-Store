import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const stylesDir = dirname(fileURLToPath(import.meta.url));
const implementationFiles = ['main.css', 'admin.css', 'responsive.css', 'redesign.css'];

const readStyle = (file) => readFileSync(resolve(stylesDir, file), 'utf8');

describe('locked frontend design system', () => {
  it('keeps raw color values inside tokens.css only', () => {
    for (const file of implementationFiles) {
      expect(readStyle(file), file).not.toMatch(
        /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(/i,
      );
    }
  });

  it('uses font tokens outside tokens.css', () => {
    for (const file of implementationFiles) {
      const declarations = readStyle(file).match(/font-family\s*:[^;]+;/gi) || [];
      expect(declarations, file).toEqual(
        declarations.filter((declaration) => declaration.includes('var(--font-')),
      );
    }
  });

  it('clips horizontal overflow without creating a hidden root scroll container', () => {
    const css = implementationFiles.map(readStyle).join('\n');
    expect(css).toMatch(/html\s*(?:,[^{]+)?\{[^}]*overflow-x:\s*clip/s);
    expect(css).toMatch(/body\s*(?:,[^{]+)?\{[^}]*overflow-x:\s*clip/s);
    expect(css).not.toMatch(/overflow-x:\s*hidden/);
  });

  it('uses mobile-safe dynamic viewport units', () => {
    const css = implementationFiles.map(readStyle).join('\n');
    expect(css).not.toMatch(/100vw|\b\d+(?:\.\d+)?vh\b/);
  });
});
