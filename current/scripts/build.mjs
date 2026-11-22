import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

// Only dist is generated. HTML, scripts, fonts and product photos live in public.
rmSync('dist', {recursive: true, force: true});
mkdirSync('dist/server', {recursive: true});
cpSync('public', 'dist/client', {recursive: true});
cpSync('worker/index.js', 'dist/server/index.js');
const config = JSON.parse(readFileSync('wrangler.json', 'utf8'));
config.main = 'index.js';
config.assets.directory = '../client';
writeFileSync('dist/server/wrangler.json', JSON.stringify(config, null, 2) + '\n');
