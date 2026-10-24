// Exercise viewport changes, focus scrolling, fallbacks and cleanup without a browser.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const tick = () => new Promise(resolve => setTimeout(resolve, 20));

(async () => {
    const win = new EventTarget();
    win.innerHeight = 844;
    win.matchMedia = () => ({ matches: true });
    win.setTimeout = setTimeout; win.clearTimeout = clearTimeout;
    win.requestAnimationFrame = callback => setTimeout(callback, 0);
    win.cancelAnimationFrame = clearTimeout;
    const viewport = win.visualViewport = new EventTarget();
    viewport.height = 844; viewport.offsetTop = 0;
    const properties = new Map(), classes = new Set();
    const doc = { defaultView: win, activeElement: null };
    const scroller = new EventTarget();
    scroller.scrollTop = 0;
    scroller.contains = element => element === input;
    scroller.getBoundingClientRect = () => ({ top: 90 + viewport.offsetTop, bottom: viewport.offsetTop + viewport.height - 110 });
    const input = {
        matches: selector => selector === 'input,textarea,select',
        getBoundingClientRect: () => ({ top: viewport.offsetTop + 400 - scroller.scrollTop, bottom: viewport.offsetTop + 444 - scroller.scrollTop })
    };
    const modal = { modalEl: {
        ownerDocument: doc,
        style: { setProperty: (key, value) => properties.set(key, value), removeProperty: key => properties.delete(key) },
        classList: { toggle: (key, active) => active ? classes.add(key) : classes.delete(key) }
    } };
    const mod = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../src/ui/keyboard-viewport.js'), 'utf8'), {
        module: mod, require: () => ({ Platform: { isMobile: true } })
    });
    const off = mod.exports.watchKeyboard(modal, scroller);
    assert.equal(properties.get('--pr-visible-height'), '844px');
    assert(classes.has('pr-mobile-modal'));
    doc.activeElement = input;
    scroller.dispatchEvent(new Event('focusin'));
    viewport.height = 410; viewport.dispatchEvent(new Event('resize'));
    await tick();
    assert.equal(properties.get('--pr-visible-height'), '410px');
    assert(input.getBoundingClientRect().bottom < scroller.getBoundingClientRect().bottom);
    viewport.height = 330; viewport.offsetTop = 34;
    viewport.dispatchEvent(new Event('scroll'));
    await tick();
    assert.equal(properties.get('--pr-visible-top'), '34px');
    assert(input.getBoundingClientRect().bottom < scroller.getBoundingClientRect().bottom);
    // Input changes also reveal a field if another WebView interaction scrolled it away.
    scroller.scrollTop = 0;
    scroller.dispatchEvent(new Event('input'));
    await tick();
    assert(input.getBoundingClientRect().bottom < scroller.getBoundingClientRect().bottom);
    off();
    assert.equal(properties.size, 0);
    viewport.height = 500; viewport.dispatchEvent(new Event('resize'));
    scroller.dispatchEvent(new Event('focusin'));
    await new Promise(resolve => setTimeout(resolve, 320));
    assert.equal(properties.size, 0, 'closed dialogs must have no live viewport handlers or delayed callbacks');
    // Older hosts without VisualViewport still use the window resize dimensions.
    win.visualViewport = undefined;
    doc.activeElement = null;
    const fallbackOff = mod.exports.watchKeyboard(modal, scroller);
    win.innerHeight = 380; win.dispatchEvent(new Event('resize'));
    await tick();
    assert.equal(properties.get('--pr-visible-height'), '380px');
    fallbackOff();
    console.log('OK: keyboard resize/offset, focused input reveal, input events, fallback dimensions and complete event/timer cleanup.');
})().catch(error => { console.error(error); process.exitCode = 1; });
