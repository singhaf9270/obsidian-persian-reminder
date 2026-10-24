// Dashboard: daily tasks on the right, calendar on the left, saved filters.
const { ItemView } = require('obsidian');
const { DASH } = require('../core/constants');
const { E, I, B } = require('../shared/dom');
const { fa, dateKey, dateFa } = require('../core/dates');
const { status } = require('../core/tasks');
const { empty, taskCard } = require('../ui/task-card');
const { Calendar } = require('../ui/calendar');
class Dashboard extends ItemView {
    constructor(leaf, p) { super(leaf); this.p = p; this.day = new Date(); this.activePinned = null; }
    getViewType() { return DASH; }
    getDisplayText() { return 'داشبورد یادآوری'; }
    getIcon() { return 'layout-dashboard'; }
    async onOpen() { this.render(); }
    render() {
        const p = this.p, root = this.contentEl;
        root.replaceChildren();
        root.classList.add('pr-root', 'pr-dashboard', 'pr-panel-' + p.settings.panelStyle);
        const head = E(root, 'div', 'pr-dashboard-head');
        const heading = E(head, 'div');
        E(heading, 'h2', '', 'داشبورد یادآوری');
        E(heading, 'p', '', 'تقویم، کارهای روزانه و فیلترهای منتخب');
        B(head, 'افزودن کار', 'plus', 'pr-add', () => p.create(this.day));
        const items = p.items();
        const counts = [['فعال', items.filter(x => !x.done).length, 'list-todo'], ['امروز', items.filter(x => !x.done && x.at.slice(0, 10) === dateKey(new Date())).length, 'sun'], ['نزدیک', items.filter(x => status(p, x) === 'soon').length, 'timer'], ['انجام‌شده', items.filter(x => x.done).length, 'check-circle']];
        const stats = E(root, 'div', 'pr-stats');
        counts.forEach(([name, n, glyph]) => { const stat = E(stats, 'div', 'pr-stat'); I(stat, glyph); E(stat, 'strong', '', fa(p, n)); E(stat, 'span', '', name); });
        const cols = E(root, 'div', 'pr-dashboard-columns');
        this.dayColumn = E(cols, 'section', 'pr-dashboard-day');
        const calSection = E(cols, 'section', 'pr-dashboard-calendar');
        E(calSection, 'h3', '', 'تقویم یادآوری‌ها');
        const cal = E(calSection, 'div', 'pr-calendar-host');
        new Calendar(p, cal, this.day, d => { this.day = d; this.renderDay(); }, true);
        this.renderDay();
        this.pinnedWrap = E(root, 'section', 'pr-pinned-section');
        this.renderPinned();
    }
    renderDay() { if (!this.dayColumn)
        return; const p = this.p; this.dayColumn.replaceChildren(); const head = E(this.dayColumn, 'div', 'pr-section-head'); E(head, 'h3', '', 'کارهای ' + dateFa(p, this.day)); B(head, 'افزودن', 'plus', 'pr-quiet-btn', () => p.create(this.day)); const wrap = E(this.dayColumn, 'div', 'pr-day-list'); const filtered = p.items().filter(x => !x.done && x.at.slice(0, 10) === dateKey(this.day)); if (!filtered.length)
        empty(wrap, 'برای این روز کاری ثبت نشده');
    else
        filtered.forEach(x => taskCard(p, wrap, x)); }
    renderPinned() {
        const p = this.p, root = this.pinnedWrap;
        if (!root)
            return;
        root.replaceChildren();
        const heading = E(root, 'div', 'pr-section-head');
        E(heading, 'h3', '', 'فیلترهای منتخب');
        E(heading, 'span', 'pr-muted', 'بر اساس هشتگ یا مکان');
        const form = E(root, 'div', 'pr-filter-form');
        const type = E(form, 'select', 'pr-select');
        [['tag', 'هشتگ'], ['place', 'مکان']].forEach(([value, label]) => { const opt = E(type, 'option', '', label); opt.value = value; });
        const input = E(form, 'input', 'pr-input');
        input.placeholder = 'مثلاً مهم یا مدرسه';
        B(form, 'افزودن', 'plus', 'pr-add', async () => { const value = (type.value === 'tag' ? input.value.trim().replace(/^#/, '') : input.value.trim()); if (!value)
            return; const filter = { type: type.value, value }; if (!p.settings.pinned.some(f => f.type === filter.type && f.value === filter.value)) {
            p.settings.pinned.push(filter);
            await p.persist();
        } input.value = ''; this.activePinned = filter; this.renderPinned(); });
        const chips = E(root, 'div', 'pr-filter-chips');
        B(chips, 'همه کارهای فعال', null, 'pr-filter-chip' + (!this.activePinned ? ' is-active' : ''), () => { this.activePinned = null; this.renderPinned(); });
        p.settings.pinned.forEach(f => { const chip = E(chips, 'span', 'pr-saved-filter'); B(chip, (f.type === 'tag' ? '#' : '📍 ') + f.value, null, 'pr-filter-chip' + (this.activePinned?.type === f.type && this.activePinned?.value === f.value ? ' is-active' : ''), () => { this.activePinned = f; this.renderPinned(); }); const remove = B(chip, '', 'x', 'pr-remove-filter', async () => { p.settings.pinned = p.settings.pinned.filter(x => !(x.type === f.type && x.value === f.value)); if (this.activePinned?.type === f.type && this.activePinned?.value === f.value)
            this.activePinned = null; await p.persist(); this.renderPinned(); }); remove.title = 'حذف فیلتر'; });
        const list = E(root, 'div', 'pr-pinned-list');
        let items = p.items().filter(x => !x.done);
        if (this.activePinned) {
            const f = this.activePinned;
            items = items.filter(x => f.type === 'tag' ? x.tags.includes(f.value) : x.place.toLowerCase().includes(f.value.toLowerCase()));
        }
        if (!items.length)
            empty(list, 'کاری مطابق این فیلتر وجود ندارد');
        else
            items.slice(0, 40).forEach(item => taskCard(p, list, item));
    }
}
module.exports = { Dashboard };
