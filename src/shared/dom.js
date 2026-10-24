// DOM helpers shared by every Obsidian UI view.
const { setIcon } = require('obsidian');
function E(parent, tag, cls = '', text) { const n = document.createElement(tag); if (cls)
    n.className = cls; if (text !== undefined)
    n.textContent = String(text); parent.appendChild(n); return n; }
function I(parent, name, cls = '') { const n = E(parent, 'span', cls); setIcon(n, name); return n; }
function B(parent, label, glyph, cls, fn) { const b = E(parent, 'button', cls); b.type = 'button'; if (glyph)
    I(b, glyph); if (label)
    E(b, 'span', '', label); if (fn)
    b.addEventListener('click', fn); return b; }
module.exports = { E, I, B };
