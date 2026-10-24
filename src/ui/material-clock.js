// Material-style 24-hour dial: touch/mouse/keyboard; confirm/cancel.
const { E, B } = require('../shared/dom');
const { fa, en, pad } = require('../core/dates');
// Material-style Persian time picker; embedded in Obsidian's native TaskModal.
// Pending values do not alter the task until "Confirm" is pressed.
class MaterialClock {
    constructor(plugin, parent, hour, minute, confirm, cancel) {
        this.p = plugin;
        this.id = Math.random().toString(36).slice(2, 11);
        this.root = E(parent, 'div', 'pr-material-clock');
        this.hour = hour;
        this.minute = minute;
        this.phase = 'hour';
        this.drag = null;
        this.confirm = confirm;
        this.cancel = cancel;
        this.render();
    }
    render() {
        const header = E(this.root, 'div', 'pr-material-header');
        const display = E(header, 'div', 'pr-material-display');
        this.hourButton = B(display, '', null, 'pr-material-hour', () => this.setPhase('hour'));
        E(display, 'span', 'pr-material-colon', ':');
        this.minuteButton = B(display, '', null, 'pr-material-minute', () => this.setPhase('minute'));
        B(header, 'زمان فعلی', 'clock-3', 'pr-material-now', () => {
            const now = new Date();
            this.hour = now.getHours();
            this.minute = now.getMinutes();
            this.setPhase('minute');
        });
        this.face = E(this.root, 'div', 'pr-material-face');
        this.face.tabIndex = 0;
        this.face.setAttribute('role', 'slider');
        this.face.setAttribute('aria-orientation', 'horizontal');
        this.face.setAttribute('aria-describedby', 'pr-material-instructions-' + this.id);
        const NS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 240 240');
        svg.setAttribute('class', 'pr-material-svg');
        svg.setAttribute('aria-hidden', 'true');
        this.face.appendChild(svg);
        const makeSVG = (name, cls, attrs) => {
            const x = document.createElementNS(NS, name);
            x.setAttribute('class', cls);
            Object.entries(attrs).forEach(([k, v]) => x.setAttribute(k, String(v)));
            svg.appendChild(x);
            return x;
        };
        makeSVG('circle', 'pr-material-ring-outer', { cx: 120, cy: 120, r: 100 });
        makeSVG('circle', 'pr-material-ring-inner', { cx: 120, cy: 120, r: 67 });
        this.hand = makeSVG('line', 'pr-material-hand', { x1: 120, y1: 120, x2: 120, y2: 33 });
        this.knob = makeSVG('circle', 'pr-material-knob', { cx: 120, cy: 33, r: 15 });
        makeSVG('circle', 'pr-material-center', { cx: 120, cy: 120, r: 4 });
        this.numbers = E(this.face, 'div', 'pr-material-numbers');
        const manual = E(this.root, 'div', 'pr-material-manual');
        const hLabel = E(manual, 'label', 'pr-material-input-label');
        E(hLabel, 'span', '', 'ساعت');
        this.hourInput = E(hLabel, 'input', 'pr-material-input');
        const mLabel = E(manual, 'label', 'pr-material-input-label');
        E(mLabel, 'span', '', 'دقیقه');
        this.minuteInput = E(mLabel, 'input', 'pr-material-input');
        for (const [input, key, max] of [
            [this.hourInput, 'hour', 23],
            [this.minuteInput, 'minute', 59]
        ]) {
            input.type = 'text';
            input.inputMode = 'numeric';
            input.maxLength = 2;
            input.setAttribute('aria-label', key === 'hour' ? 'ساعت از صفر تا بیست‌وسه' : 'دقیقه از صفر تا پنجاه‌ونه');
            input.addEventListener('focus', () => this.setPhase(key));
            input.addEventListener('change', () => {
                const n = Number(en(this.p, input.value.trim()));
                if (Number.isInteger(n) && n >= 0 && n <= max)
                    this[key] = n;
                this.sync();
            });
        }
        this.instructions = E(this.root, 'div', 'pr-material-instructions', 'با لمس صفحه یا کلیدهای جهت‌دار زمان را تنظیم کنید.');
        this.instructions.id = 'pr-material-instructions-' + this.id;
        const actions = E(this.root, 'div', 'pr-material-actions');
        B(actions, 'لغو', null, 'pr-material-cancel', () => this.cancel());
        B(actions, 'تأیید', 'check', 'pr-material-confirm', () => this.accept());
        this.face.addEventListener('pointerdown', e => this.start(e));
        this.face.addEventListener('pointermove', e => this.move(e));
        this.face.addEventListener('pointerup', e => this.end(e, false));
        this.face.addEventListener('pointercancel', e => this.end(e, true));
        this.face.addEventListener('lostpointercapture', () => { this.drag = null; });
        this.face.addEventListener('keydown', e => this.keyDown(e));
        this.sync();
    }
    setPhase(phase) {
        if (this.drag !== null)
            return;
        this.phase = phase;
        this.sync();
    }
    point(e) {
        const rect = this.face.getBoundingClientRect();
        // Normalizing both axes prevents distortion at mobile zoom levels.
        const x = (e.clientX - rect.left) * 240 / rect.width - 120;
        const y = (e.clientY - rect.top) * 240 / rect.height - 120;
        return { radius: Math.hypot(x, y), angle: (Math.atan2(x, -y) + Math.PI * 2) % (Math.PI * 2) };
    }
    applyPoint(e) {
        const { radius, angle } = this.point(e);
        if (radius < 14)
            return;
        if (this.phase === 'hour') {
            const index = Math.round(angle * 12 / (2 * Math.PI)) % 12;
            const outer = radius >= 74;
            this.hour = outer ? (index === 0 ? 12 : index) : (index === 0 ? 0 : index + 12);
        }
        else {
            this.minute = Math.round(angle * 60 / (2 * Math.PI)) % 60;
        }
        this.sync();
    }
    start(e) {
        if (this.drag !== null || (e.pointerType === 'mouse' && e.button !== 0))
            return;
        e.preventDefault();
        this.drag = e.pointerId;
        this.backup = { hour: this.hour, minute: this.minute, phase: this.phase };
        try {
            this.face.setPointerCapture(e.pointerId);
        }
        catch { }
        this.applyPoint(e);
    }
    move(e) {
        if (this.drag !== e.pointerId)
            return;
        e.preventDefault();
        this.applyPoint(e);
    }
    end(e, cancelled) {
        if (this.drag !== e.pointerId)
            return;
        e.preventDefault();
        if (!cancelled)
            this.applyPoint(e);
        this.drag = null;
        try {
            if (this.face.hasPointerCapture(e.pointerId))
                this.face.releasePointerCapture(e.pointerId);
        }
        catch { }
        if (cancelled) {
            this.hour = this.backup.hour;
            this.minute = this.backup.minute;
            this.phase = this.backup.phase;
            this.sync();
        }
        else if (this.phase === 'hour') {
            this.setPhase('minute');
        }
        this.face.focus({ preventScroll: true });
    }
    keyDown(e) {
        const keys = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', 'Enter', 'Escape'];
        if (!keys.includes(e.key))
            return;
        e.preventDefault();
        if (e.key === 'Escape')
            return this.cancel();
        if (e.key === 'Enter')
            return this.phase === 'hour' ? this.setPhase('minute') : this.accept();
        const max = this.phase === 'hour' ? 24 : 60;
        const current = this[this.phase];
        let next = current;
        if (e.key === 'Home')
            next = 0;
        else if (e.key === 'End')
            next = max - 1;
        else {
            const step = e.key.startsWith('Page') ? 5 : 1;
            const forward = ['ArrowRight', 'ArrowUp', 'PageUp'].includes(e.key);
            next = (current + (forward ? step : -step) + max) % max;
        }
        this[this.phase] = next;
        this.sync();
    }
    accept() {
        // Only this callback commits pending time changes to TaskModal.
        this.confirm(this.hour, this.minute);
    }
    renderNumbers() {
        this.numbers.replaceChildren();
        const hourMode = this.phase === 'hour';
        const entries = hourMode
            ? [
                ...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, index: (i + 1) % 12, r: 101 })),
                ...Array.from({ length: 12 }, (_, i) => ({ value: (i + 13) % 24, index: (i + 1) % 12, r: 66 }))
            ]
            : Array.from({ length: 12 }, (_, i) => ({ value: i * 5, index: i, r: 101 }));
        for (const entry of entries) {
            const angle = entry.index * Math.PI / 6;
            const label = E(this.numbers, 'span', 'pr-material-number', fa(this.p, pad(entry.value)));
            label.style.left = `${50 + Math.sin(angle) * entry.r * 100 / 240}%`;
            label.style.top = `${50 - Math.cos(angle) * entry.r * 100 / 240}%`;
            if (hourMode && this.hour === entry.value || !hourMode && this.minute === entry.value)
                label.classList.add('is-selected');
            if (hourMode && entry.r === 66)
                label.classList.add('is-inner');
        }
    }
    sync() {
        this.hourButton.textContent = fa(this.p, pad(this.hour));
        this.minuteButton.textContent = fa(this.p, pad(this.minute));
        this.hourButton.classList.toggle('is-active', this.phase === 'hour');
        this.minuteButton.classList.toggle('is-active', this.phase === 'minute');
        this.hourButton.setAttribute('aria-pressed', String(this.phase === 'hour'));
        this.minuteButton.setAttribute('aria-pressed', String(this.phase === 'minute'));
        this.hourInput.value = fa(this.p, pad(this.hour));
        this.minuteInput.value = fa(this.p, pad(this.minute));
        const hourMode = this.phase === 'hour';
        const value = hourMode ? this.hour : this.minute;
        const angle = hourMode ? (value % 12) * Math.PI / 6 : value * Math.PI / 30;
        const distance = hourMode ? (value === 0 || value > 12 ? 66 : 101) : 101;
        this.hand.setAttribute('x2', String(120 + Math.sin(angle) * distance));
        this.hand.setAttribute('y2', String(120 - Math.cos(angle) * distance));
        this.knob.setAttribute('cx', String(120 + Math.sin(angle) * distance));
        this.knob.setAttribute('cy', String(120 - Math.cos(angle) * distance));
        this.face.setAttribute('aria-label', hourMode ? 'انتخاب ساعت، حلقه بیرونی ۱ تا ۱۲ و حلقه داخلی ۱۳ تا ۰۰' : 'انتخاب دقیقه از صفر تا پنجاه‌ونه');
        this.face.setAttribute('aria-valuemin', '0');
        this.face.setAttribute('aria-valuemax', hourMode ? '23' : '59');
        this.face.setAttribute('aria-valuenow', String(value));
        this.face.setAttribute('aria-valuetext', fa(this.p, pad(value)));
        this.renderNumbers();
    }
    destroy() {
        if (this.drag !== null) {
            try {
                if (this.face.hasPointerCapture(this.drag))
                    this.face.releasePointerCapture(this.drag);
            }
            catch { }
        }
        this.drag = null;
        this.root.remove();
    }
}
module.exports = { MaterialClock };
