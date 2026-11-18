// genera src/skill_testi.js dalle skill in ./skills (licenza MIT, vedi skills/LICENSE)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
const out = {};
for (const f of readdirSync(new URL('./skills/', import.meta.url))) if (f.endsWith('.md')) out[f.slice(0, -3)] = readFileSync(new URL('./skills/' + f, import.meta.url), 'utf8').trim();
writeFileSync(new URL('./src/skill_testi.js', import.meta.url), '// generato da gen-skill.mjs: non modificare a mano\nexport const SKILL = ' + JSON.stringify(out) + ';\n');
console.log(Object.keys(out).length, 'skill');
