// Exporte le script vocal (src/voice-script.ts) en JSON pour la génération audio.
// Usage : npm run voice:script  → voicegen/script.json
import { VOICE_ITEMS } from '../src/voice-script';
import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('voicegen', { recursive: true });
writeFileSync('voicegen/script.json', JSON.stringify(VOICE_ITEMS, null, 2));
console.log(`${VOICE_ITEMS.length} entrées → voicegen/script.json`);
