const { Modal, Notice } = require('obsidian');
const { E, I, B } = require('../shared/dom');
const { fromISO, iso, dateFa, clockFa } = require('../core/dates');
const { updateTaskPreservingText } = require('../core/tasks');
const { Calendar } = require('./calendar');
const { MaterialClock } = require('./material-clock');
const { watchKeyboard } = require('./keyboard-viewport');

class TaskModal extends Modal {
    constructor(p, item = null, initial = null, tab = 'date') {
        super(p.app);
        this.p = p;
        this.item = item;
        this.date = item?.at ? fromISO(item.at) : new Date(Date.now() + 3600000);
        if (!this.date) this.date = new Date();
        this.hour = this.date.getHours();
        this.minute = this.date.getMinutes();
        if (initial) {
            const day = new Date(initial);
            // The panel supplies a day, not midnight as the reminder time.
            this.date = new Date(day.getFullYear(), day.getMonth(), day.getDate(), this.hour, this.minute);
        }
        this.tab = tab;
        this.useDaily = !item && !!initial;
        this.destination = item?.path || p.destination();
        this.saving = false;
    }
    onOpen() {
        this.modalEl.addClass('pr-modal');
        this.modalEl.setAttribute('aria-label', this.item ? 'ویرایش کار و یادآوری' : 'افزودن کار');
        const root = this.contentEl;
        root.replaceChildren();
        const header = E(root, 'div', 'pr-modal-header');
        I(header, this.item ? 'calendar-clock' : 'plus-circle');
        const heading = E(header, 'div');
        E(heading, 'strong', '', this.item ? 'ویرایش یادآوری' : 'یک کار تازه');
        E(heading, 'small', '', 'جزئیات، روز و ساعت را مشخص کنید');
        this.body = E(root, 'div', 'pr-modal-body');
        const field = (parent, label, value, placeholder) => {
            const wrap = E(parent, 'label', 'pr-field');
            E(wrap, 'span', '', label);
            const input = E(wrap, 'input', 'pr-input');
            input.type = 'text';
            input.value = value || '';
            input.placeholder = placeholder || '';
            input.autocomplete = 'off';
            input.dir = 'auto';
            return input;
        };
        this.titleInput = field(this.body, 'عنوان کار', this.item?.title, 'چه کاری می‌خواهید انجام دهید؟');
        const details = E(this.body, 'details', 'pr-details');
        details.open = !!(this.item?.place || this.item?.tags.length);
        E(details, 'summary', '', 'مکان و هشتگ‌ها');
        const inner = E(details, 'div', 'pr-detail-fields');
        this.placeInput = field(inner, 'مکان', this.item?.place, 'مثلاً مدرسه');
        this.tagsInput = field(inner, 'هشتگ‌ها', this.item?.tags.join(' '), '#مهم #مدرسه');
        this.tagsInput.spellcheck = false;
        E(inner, 'small', 'pr-field-hint', 'هشتگ‌ها را با فاصله یا ویرگول جدا کنید.');
        const tabs = E(this.body, 'div', 'pr-modal-tabs');
        tabs.setAttribute('role', 'tablist');
        tabs.setAttribute('aria-label', 'انتخاب تاریخ و ساعت');
        this.tabDate = B(tabs, 'انتخاب روز', 'calendar-days', 'pr-modal-tab', () => this.switchTab('date'));
        this.tabTime = B(tabs, 'انتخاب ساعت', 'clock-3', 'pr-modal-tab', () => this.switchTab('time'));
        this.panel = E(this.body, 'div', 'pr-picker-panel');
        this.panel.setAttribute('role', 'tabpanel');
        this.switchTab(this.tab);
        if (!this.item) {
            const destination = E(this.body, 'div', 'pr-destination-field');
            const toggle = E(destination, 'label', 'pr-daily-toggle');
            this.dailyToggle = E(toggle, 'input');
            this.dailyToggle.type = 'checkbox';
            this.dailyToggle.checked = this.useDaily;
            E(toggle, 'span', '', 'ذخیره در یادداشت روز انتخاب‌شده');
            this.pathInput = field(destination, 'یادداشت مقصد', this.destination, 'کارها.md');
            this.pathInput.classList.add('pr-path-input');
            this.dailyToggle.addEventListener('change', () => {
                if (!this.useDaily) this.destination = this.pathInput.value;
                this.useDaily = this.dailyToggle.checked;
                this.updateDestination();
            });
            this.pathHint = E(destination, 'small', 'pr-field-hint');
            this.updateDestination();
        }
        const footer = E(root, 'div', 'pr-modal-footer');
        this.summary = E(footer, 'div', 'pr-selected-datetime');
        this.updateSummary();
        const actions = E(footer, 'div', 'pr-modal-actions');
        if (this.item) this.deleteButton = B(actions, 'حذف یادآوری', 'trash-2', 'pr-danger-btn', async () => {
            if (this.saving) return;
            this.setSaving(true);
            try {
                if (await this.p.remove(this.item)) { new Notice('یادآوری حذف شد'); this.close(); }
            } finally { this.setSaving(false); }
        });
        E(actions, 'span', 'pr-spacer');
        B(actions, 'انصراف', null, 'pr-cancel-btn', () => this.close());
        this.saveButton = B(actions, 'ذخیره', 'check', 'pr-save-btn', () => this.save());
        this.stopWatching = watchKeyboard(this, this.body);
    }
    updateDestination() {
        if (!this.pathInput) return;
        this.pathInput.readOnly = this.useDaily;
        try {
            this.pathInput.value = this.useDaily ? this.p.dailyDestination(this.date) : this.destination;
            this.pathHint.textContent = this.useDaily
                ? 'با تغییر روز، مقصد هم تغییر می‌کند. قالب نام و پوشه در تنظیمات افزونه است.'
                : 'مسیر یک یادداشت داخل ولت؛ یادداشت جدید در صورت نیاز ساخته می‌شود.';
            this.pathInput.removeAttribute('aria-invalid');
        } catch (error) {
            this.pathHint.textContent = error.message;
            this.pathInput.setAttribute('aria-invalid', 'true');
        }
    }
    switchTab(tab, discardTime = false) {
        if (this.timePicker && !discardTime) {
            this.hour = this.timePicker.hour;
            this.minute = this.timePicker.minute;
        }
        this.timePicker?.destroy();
        this.timePicker = null;
        this.tab = tab;
        for (const [button, active] of [[this.tabDate, tab === 'date'], [this.tabTime, tab === 'time']]) {
            button.classList.toggle('is-active', active);
            button.setAttribute('role', 'tab');
            button.setAttribute('aria-selected', String(active));
        }
        this.panel.replaceChildren();
        if (tab === 'date') new Calendar(this.p, this.panel, this.date, day => {
            this.date = day;
            this.updateSummary();
            this.updateDestination();
        });
        else this.timePicker = new MaterialClock(this.p, this.panel, this.hour, this.minute, (hour, minute) => {
            this.hour = hour;
            this.minute = minute;
            this.updateSummary();
            this.switchTab('date');
        }, () => this.switchTab('date', true));
    }
    onClose() {
        this.stopWatching?.();
        this.timePicker?.destroy();
        this.timePicker = null;
    }
    updateSummary() {
        if (!this.summary) return;
        const day = new Date(this.date);
        day.setHours(this.hour, this.minute, 0, 0);
        this.summary.textContent = dateFa(this.p, day) + '  •  ' + clockFa(this.p, day);
    }
    setSaving(value) {
        this.saving = value;
        if (this.saveButton) this.saveButton.disabled = value;
        if (this.deleteButton) this.deleteButton.disabled = value;
    }
    async save() {
        if (this.saving) return;
        const title = this.titleInput.value.trim();
        if (!title) { new Notice('عنوان کار را وارد کنید'); this.titleInput.focus(); return; }
        // The main Save action also commits the currently open clock.
        if (this.timePicker) {
            if (!this.timePicker.readInputs()) return;
            this.hour = this.timePicker.hour;
            this.minute = this.timePicker.minute;
        }
        const day = new Date(this.date);
        day.setHours(this.hour, this.minute, 0, 0);
        if (day.getHours() !== this.hour || day.getMinutes() !== this.minute) {
            new Notice('ساعت معتبر نیست'); return;
        }
        const tags = [...new Set(this.tagsInput.value.split(/[\s،,]+/).map(x => x.replace(/^#/, '')))].filter(Boolean);
        if (tags.some(x => !/^[\p{L}\p{N}_-]+$/u.test(x))) {
            new Notice('هشتگ نامعتبر است'); this.tagsInput.closest('details').open = true; this.tagsInput.focus(); return;
        }
        this.setSaving(true);
        try {
            const values = { title, tags, place: this.placeInput.value, at: iso(day) };
            const ok = this.item
                ? await this.p.change(this.item, old => updateTaskPreservingText(this.p, old, values))
                : await this.p.add(this.pathInput.value, values, { daily: this.useDaily });
            if (ok) { new Notice(this.item ? 'کار به‌روزرسانی شد' : 'کار اضافه شد'); this.close(); }
        } catch (error) {
            console.error('[Persian Reminder save]', error);
            new Notice('ذخیره نشد: ' + error.message);
        } finally { this.setSaving(false); }
    }
}
module.exports = { TaskModal };
