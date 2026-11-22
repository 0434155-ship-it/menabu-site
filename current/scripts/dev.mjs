import { spawn } from 'node:child_process';

// The Sites preview uses Vite-style flags. Wrangler calls its host flag --ip.
const args = process.argv.slice(2).filter(arg => arg !== '--strictPort').map(arg => arg === '--host' ? '--ip' : arg);
if (!args.includes('--ip')) args.push('--ip', '0.0.0.0');
if (!args.includes('--port')) args.push('--port', process.env.PORT || '4173');
const child = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'dev', '--local', '--inspector-port', '0', ...args], {stdio: 'inherit'});
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('exit', code => { process.exitCode = code ?? 1; });
