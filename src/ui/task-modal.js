// Add/edit reminder modal; date tab and time tab.
const { Modal, Notice } = require('obsidian');
const { E, I, B } = require('../shared/dom');
const { fromISO, iso, dateFa, clockFa } = require('../core/dates');
const { updateTaskPreservingText } = require('../core/tasks');
const { Calendar } = require('./calendar');
const { MaterialClock } = require('./material-clock');
class TaskModal extends Modal {
    constructor(p, item = null, initial = null, tab = 'date') { super(p.app); this.p = p; this.item = item; this.date = item?.at ? fromISO(item.at) : (initial ? new Date(initial) : new Date(Date.now() + 3600000)); if (!this.date)
        this.date = new Date(); this.hour = this.date.getHours(); this.minute = this.date.getMinutes(); this.tab = tab; this.destination = item?.path || p.destination(); }
    onOpen() {
        this.modalEl.addClass('pr-modal');
        const root = this.contentEl;
        root.replaceChildren();
        const header = E(root, 'div', 'pr-modal-header');
        I(header, this.item ? 'calendar-clock' : 'plus-circle');
        E(header, 'strong', '', this.item ? 'ویرایش کار و یادآوری' : 'افزودن کار');
        const field = (label, value, placeholder) => { const wrap = E(root, 'label', 'pr-field'); E(wrap, 'span', '', label); const input = E(wrap, 'input', 'pr-input'); input.value = value || ''; input.placeholder = placeholder || ''; return input; };
        this.titleInput = field('عنوان کار', this.item?.title || '', 'عنوان کار');
        if (!this.item) {
            this.pathInput = field('یادداشت مقصد', this.destination, 'کارها.md');
        }
        const tabs = E(root, 'div', 'pr-modal-tabs');
        this.tabDate = B(tabs, 'تاریخ', 'calendar-days', 'pr-modal-tab', () => this.switchTab('date'));
        this.tabTime = B(tabs, 'ساعت', 'clock-3', 'pr-modal-tab', () => this.switchTab('time'));
        this.panel = E(root, 'div', 'pr-picker-panel');
        this.switchTab(this.tab);
        const details = E(root, 'details', 'pr-details');
        const summary = E(details, 'summary', '', 'مکان و هشتگ‌ها (اختیاری)');
        const inner = E(details, 'div', 'pr-detail-fields');
        const other = (label, value, placeholder) => { const box = E(inner, 'label', 'pr-field'); E(box, 'span', '', label); const input = E(box, 'input', 'pr-input'); input.value = value || ''; input.placeholder = placeholder; return input; };
        this.placeInput = other('مکان', this.item?.place, 'مثلاً مدرسه');
        this.tagsInput = other('هشتگ‌ها', this.item?.tags.join(' '), 'مهم ضروری');
        this.summary = E(root, 'div', 'pr-selected-datetime');
        this.updateSummary();
        const actions = E(root, 'div', 'pr-modal-actions');
        if (this.item)
            B(actions, 'حذف یادآوری', 'trash-2', 'pr-danger-btn', async () => { if (await this.p.remove(this.item)) {
                new Notice('یادآوری حذف شد');
                this.close();
            } });
        E(actions, 'span', 'pr-spacer');
        B(actions, 'انصراف', null, 'pr-cancel-btn', () => this.close());
        B(actions, 'ذخیره', 'check', 'pr-save-btn', () => this.save());
    }
    switchTab(tab) { if (this.timePicker) {
        this.timePicker.destroy();
        this.timePicker = null;
    } this.tab = tab; this.tabDate.classList.toggle('is-active', tab === 'date'); this.tabTime.classList.toggle('is-active', tab === 'time'); this.panel.replaceChildren(); if (tab === 'date') {
        new Calendar(this.p, this.panel, this.date, d => { this.date = d; this.updateSummary(); });
    }
    else {
        this.timePicker = new MaterialClock(this.p, this.panel, this.hour, this.minute, (h, m) => { this.hour = h; this.minute = m; this.updateSummary(); this.switchTab('date'); }, () => this.switchTab('date'));
    } }
    onClose() { this.timePicker?.destroy(); this.timePicker = null; }
    updateSummary() { if (!this.summary)
        return; const d = new Date(this.date); d.setHours(this.hour, this.minute, 0, 0); this.summary.textContent = dateFa(this.p, d) + '  •  ' + clockFa(this.p, d); }
    async save() { const title = this.titleInput.value.trim(); if (!title) {
        new Notice('عنوان کار را وارد کنید');
        return;
    } const d = new Date(this.date); d.setHours(this.hour, this.minute, 0, 0); if (d.getHours() !== this.hour || d.getMinutes() !== this.minute) {
        new Notice('ساعت معتبر نیست');
        return;
    } const tags = [...new Set(this.tagsInput.value.split(/[\s،,]+/).map(x => x.replace(/^#/, '')))].filter(Boolean); if (tags.some(x => !/^[\p{L}\p{N}_-]+$/u.test(x))) {
        new Notice('هشتگ نامعتبر است');
        return;
    } const values = { title, tags, place: this.placeInput.value, at: iso(d) }; const ok = this.item ? await this.p.change(this.item, old => updateTaskPreservingText(this.p, old, values)) : await this.p.add(this.pathInput.value, values); if (ok) {
        new Notice(this.item ? 'کار به‌روزرسانی شد' : 'کار اضافه شد');
        this.close();
    } }
}
module.exports = { TaskModal };
