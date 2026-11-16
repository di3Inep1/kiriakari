/* Assemble the static game without publishing source docs, tests or previews. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
const files = ['index.html', 'style.css', 'scenery.js', 'furniture.js', 'maps.js', 'movement.js', 'core.js', 'data.js', 'exploration.js', 'world.js', 'audio.js', 'lighting.js', 'game.js'];
fs.mkdirSync(out, { recursive: true });
for (const name of files) fs.copyFileSync(path.join(root, name), path.join(out, name));
fs.cpSync(path.join(root, 'assets'), path.join(out, 'assets'), { recursive: true });
fs.writeFileSync(path.join(out, '.nojekyll'), '');
// All game URLs must remain relative so /kiriakari/ works on GitHub Pages.
for (const name of files) {
  const text = fs.readFileSync(path.join(out, name), 'utf8');
  for (const match of text.matchAll(/assets\/[a-zA-Z0-9._-]+\.(?:png|webp|jpg|mp3|ogg)/g)) {
    if (!fs.existsSync(path.join(out, match[0]))) throw new Error(`Missing asset in ${name}: ${match[0]}`);
  }
  if (/(?:src|href)=["']\/(?!\/)|url\(["']?\/(?!\/)/.test(text)) throw new Error(`Absolute site path in ${name}`);
}
console.log('GitHub Pages game assembled in dist/; relative asset paths verified.');
