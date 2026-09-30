import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire('/usr/share/nodejs/');
const babel = require('@babel/core');
const presetTypescript = require('@babel/preset-typescript');
const presetReact = require('@babel/preset-react');

export async function resolve(specifier, context, nextResolve) {
  if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    !/\.(m?js|tsx?|json)$/.test(specifier) &&
    context.parentURL
  ) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const baseCandidate = path.resolve(parentDir, specifier);

    const candidates = [
      `${baseCandidate}.ts`,
      `${baseCandidate}.tsx`,
      path.join(baseCandidate, 'index.ts'),
      path.join(baseCandidate, 'index.tsx'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return nextResolve(pathToFileURL(candidate).href, context);
      }
    }
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.ts') || url.endsWith('.tsx')) {
    const filePath = fileURLToPath(url);
    const rawSource = await fs.promises.readFile(filePath, 'utf-8');

    const transformed = await babel.transformAsync(rawSource, {
      filename: filePath,
      presets: [
        [presetTypescript, { isTSX: url.endsWith('.tsx'), allExtensions: true }],
        ...(url.endsWith('.tsx') ? [[presetReact, { runtime: 'classic' }]] : []),
      ],
      sourceMaps: 'inline',
      retainLines: true,
    });

    return {
      format: 'module',
      shortCircuit: true,
      source: transformed.code,
    };
  }

  return nextLoad(url, context);
}
