const { Modal, Notice } = require('obsidian');
const { E, I, B } = require('../shared/dom');
const { TASK } = require('../core/constants');
const { dateFa, clockFa, fromISO, iso, fa } = require('../core/dates');
const { reminderKey } = require('../core/reminders');
const { updateTaskPreservingText } = require('../core/tasks');
const { watchKeyboard } = require('./keyboard-viewport');

// One compact card at a time, including when several reminders become due.
class ReminderAlert extends Modal {
    constructor(p, items, preview = false) {
        super(p.app); this.p = p; this.items = [...items]; this.preview = preview;
        this.minutes = Number(p.settings.snoozeMinutes) || 10; this.busy = false;
    }
    enqueue(items) {
        const known = new Set(this.items.map(reminderKey));
        for (const item of items) if (!known.has(reminderKey(item))) {
            this.items.push(item); known.add(reminderKey(item));
        }
        if (this.body && !this.busy) this.renderItems();
    }
    onOpen() {
        this.modalEl.addClass('pr-modal', 'pr-alert-modal');
        this.modalEl.setAttribute('role', 'alertdialog');
        this.modalEl.setAttribute('aria-label', 'هشدار یادآوری');
        const root = this.contentEl;
        root.replaceChildren();
        const head = E(root, 'div', 'pr-modal-header');
        I(head, 'bell-ring');
        const title = E(head, 'div');
        E(title, 'strong', '', this.preview ? 'پیش‌نمایش هشدار' : 'وقت این کار رسیده');
        this.count = E(title, 'small'); this.count.setAttribute('aria-live', 'polite');
        this.body = E(root, 'div', 'pr-modal-body pr-alert-body');
        const footer = E(root, 'div', 'pr-modal-footer pr-alert-footer');
        if (!this.preview) {
            const label = E(footer, 'label', 'pr-alert-snooze-label');
            E(label, 'span', '', 'یادآوری مجدد');
            const select = E(label, 'select', 'pr-select');
            select.setAttribute('aria-label', 'مدت تعویق یادآوری');
            for (const minutes of [5, 10, 15, 30, 60]) {
                E(select, 'option', '', fa(this.p, minutes) + ' دقیقه').value = String(minutes);
            }
            select.value = String(this.minutes);
            select.addEventListener('change', () => { this.minutes = Number(select.value); });
        }
        B(footer, this.preview ? 'متوجه شدم' : 'بستن', null, 'pr-cancel-btn', () => this.close());
        this.renderItems();
        this.stopWatching = watchKeyboard(this, this.body);
    }
    renderItems() {
        this.body.replaceChildren();
        this.count.textContent = this.preview ? 'نمایش آزمایشی' : fa(this.p, this.items.length) + ' یادآوری';
        const item = this.items[0];
        if (!item) return;
        const row = E(this.body, 'article', 'pr-alert-item');
        E(row, 'h3', '', item.title || 'بدون عنوان');
        const date = fromISO(item.at);
        if (date) {
            const time = E(row, 'div', 'pr-alert-meta');
            I(time, 'calendar-clock'); E(time, 'span', '', dateFa(this.p, date) + ' · ' + clockFa(this.p, date));
        }
        if (item.place) {
            const place = E(row, 'div', 'pr-alert-meta');
            I(place, 'map-pin'); E(place, 'span', '', item.place);
        }
        if (!this.preview) {
            const actions = E(row, 'div', 'pr-alert-actions');
            B(actions, 'انجام شد', 'check', 'pr-save-btn', () => this.run(item, raw => raw.replace(TASK,
                (_, prefix, checked, gap, text) => prefix + 'x' + gap + text)));
            B(actions, 'بعداً', 'clock-3', 'pr-quiet-btn', () => this.snooze(item));
            const link = B(row, item.path?.split('/').pop() || 'بازکردن یادداشت', 'file-text', 'pr-alert-note', async () => {
                if (this.busy) return;
                await this.p.openFile(item); this.close();
            });
            link.title = item.path;
            link.setAttribute('aria-label', 'بازکردن یادداشت ' + (item.path || ''));
            if (this.items.length > 1) B(row, 'یادآوری بعدی', 'chevron-left', 'pr-alert-next', () => {
                if (this.busy) return;
                this.items.shift(); this.renderItems();
            });
        }
    }
    async snooze(item) {
        const date = new Date(Date.now() + this.minutes * 60000);
        if (date.getSeconds() || date.getMilliseconds()) date.setMinutes(date.getMinutes() + 1);
        date.setSeconds(0, 0);
        await this.run(item, old => updateTaskPreservingText(this.p, old, { ...item, at: iso(date) }));
    }
    async run(item, transform) {
        if (this.busy || this.preview) return;
        this.busy = true;
        this.body.querySelectorAll('button').forEach(button => { button.disabled = true; });
        try {
            if (await this.p.change(item, transform)) this.items = this.items.filter(task => reminderKey(task) !== reminderKey(item));
        } catch (error) {
            console.error('[Persian Reminder alert]', error); new Notice('امکان به‌روزرسانی کار وجود نداشت');
        } finally {
            this.busy = false;
            if (this.items.length) this.renderItems();
            else this.close();
        }
    }
    onClose() {
        this.stopWatching?.();
        if (this.p.alertModal === this) this.p.alertModal = null;
    }
}
module.exports = { ReminderAlert };
