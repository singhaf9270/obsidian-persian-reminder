const { Platform } = require('obsidian');

// Fit to the visible WebView, including the on-screen keyboard. Only the form
// scrolls; the title, selected date and save controls remain outside the scroller.
function watchKeyboard(modal, scroller) {
    const doc = modal.modalEl.ownerDocument;
    const win = doc.defaultView;
    const viewport = win.visualViewport;
    const listeners = [], timers = new Set();
    let frame = 0, closed = false;
    const listen = (target, event, fn) => {
        target?.addEventListener(event, fn);
        listeners.push(() => target?.removeEventListener(event, fn));
    };
    const reveal = () => {
        const input = doc.activeElement;
        if (!scroller.contains(input) || !input.matches('input,textarea,select')) return;
        const bounds = scroller.getBoundingClientRect();
        const field = input.getBoundingClientRect();
        const gap = 16;
        if (field.bottom > bounds.bottom - gap)
            scroller.scrollTop += field.bottom - bounds.bottom + gap;
        else if (field.top < bounds.top + gap)
            scroller.scrollTop -= bounds.top + gap - field.top;
    };
    const update = () => {
        frame = 0;
        if (closed) return;
        const mobile = Platform.isMobile || win.matchMedia('(max-width: 600px)').matches;
        const height = viewport?.height || win.innerHeight;
        modal.modalEl.classList.toggle('pr-mobile-modal', mobile);
        modal.modalEl.classList.toggle('pr-short-modal', mobile && height < 480);
        if (mobile) {
            modal.modalEl.style.setProperty('--pr-visible-height', `${height}px`);
            modal.modalEl.style.setProperty('--pr-visible-top', `${viewport?.offsetTop || 0}px`);
        }
        reveal();
    };
    const schedule = () => {
        if (!closed && !frame) frame = win.requestAnimationFrame(update);
    };
    const focus = () => {
        schedule();
        // Keyboard animations finish after focusin in iOS and Android WebViews.
        for (const delay of [100, 300]) {
            const timer = win.setTimeout(() => { timers.delete(timer); schedule(); }, delay);
            timers.add(timer);
        }
    };
    listen(viewport, 'resize', schedule);
    listen(viewport, 'scroll', schedule);
    listen(win, 'resize', schedule);
    listen(scroller, 'focusin', focus);
    listen(scroller, 'input', schedule);
    listen(scroller, 'toggle', schedule);
    update();
    return () => {
        closed = true;
        listeners.forEach(off => off());
        timers.forEach(timer => win.clearTimeout(timer));
        if (frame) win.cancelAnimationFrame(frame);
        modal.modalEl.style.removeProperty('--pr-visible-height');
        modal.modalEl.style.removeProperty('--pr-visible-top');
    };
}
module.exports = { watchKeyboard };
