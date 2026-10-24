const { ItemView, Notice } = require('obsidian');
const { DASH } = require('../core/constants');
const { E, B } = require('../shared/dom');
const { fa, dateKey, dateFa } = require('../core/dates');
const { empty, taskCard } = require('../ui/task-card');
const { panelHeader, stats, dayPicker, searchField, matchesQuery } = require('../ui/view-parts');

class Dashboard extends ItemView {
    constructor(leaf, p) { super(leaf); this.p = p; this.day = new Date(); this.activePinned = null; this.query = ''; }
    getViewType() { return DASH; }
    getDisplayText() { return 'داشبورد یادآوری'; }
    getIcon() { return 'layout-dashboard'; }
    async onOpen() { this.render(); }
    render() {
        const p = this.p, root = this.contentEl;
        root.replaceChildren();
        root.classList.add('pr-root', 'pr-dashboard');
        panelHeader(root, 'داشبورد یادآوری', 'یک نگاه روشن به روز و کارها', () => p.create(this.day),
            { icon: 'panel-right', label: 'بازکردن سایدبار', action: () => p.sidebar() });
        this.stats = stats(root, p);
        const columns = E(root, 'div', 'pr-dashboard-columns');
        this.dayColumn = E(columns, 'section', 'pr-dashboard-day');
        const calendar = E(columns, 'section', 'pr-dashboard-calendar');
        E(calendar, 'h3', '', 'تقویم و یادداشت روز');
        this.picker = dayPicker(calendar, p, this.day, day => { this.day = day; this.renderDay(); });
        this.renderDay();
        this.pinnedWrap = E(root, 'section', 'pr-pinned-section');
        this.renderPinned();
    }
    refresh() {
        if (!this.dayColumn) return;
        this.stats?.update();
        this.picker?.refresh();
        this.renderDay();
        this.renderPinnedResults();
    }
    renderDay() {
        if (!this.dayColumn) return;
        const scroll = this.dayColumn.querySelector('.pr-day-list')?.scrollTop || 0;
        this.dayColumn.replaceChildren();
        const head = E(this.dayColumn, 'div', 'pr-section-head');
        const text = E(head, 'div');
        E(text, 'small', 'pr-eyebrow', 'برنامهٔ روز');
        E(text, 'h3', '', dateFa(this.p, this.day));
        B(head, 'افزودن', 'plus', 'pr-quiet-btn', () => this.p.create(this.day));
        const filtered = this.p.items().filter(x => !x.done && x.at?.slice(0, 10) === dateKey(this.day));
        E(this.dayColumn, 'p', 'pr-day-caption', fa(this.p, filtered.length) + ' کار فعال برای این روز');
        const list = E(this.dayColumn, 'div', 'pr-day-list');
        if (!filtered.length) {
            empty(list, 'روزتان هنوز خالی است');
            B(list, 'اولین کار این روز', 'plus', 'pr-quiet-btn pr-empty-add', () => this.p.create(this.day));
        } else filtered.forEach(item => taskCard(this.p, list, item));
        list.scrollTop = scroll;
    }
    renderPinned() {
        const p = this.p, root = this.pinnedWrap;
        root.replaceChildren();
        const heading = E(root, 'div', 'pr-section-head');
        E(heading, 'h3', '', 'همهٔ کارها و فیلترهای منتخب');
        E(heading, 'span', 'pr-muted', 'هشتگ و مکان');
        searchField(root, this.query, query => { this.query = query; this.renderPinnedResults(); });
        const form = E(root, 'div', 'pr-filter-form');
        const type = E(form, 'select', 'pr-select');
        type.setAttribute('aria-label', 'نوع فیلتر منتخب');
        for (const [value, label] of [['tag', 'هشتگ'], ['place', 'مکان']]) E(type, 'option', '', label).value = value;
        const input = E(form, 'input', 'pr-input');
        input.placeholder = 'یک فیلتر برای دفعات بعد ذخیره کنید…';
        input.setAttribute('aria-label', 'هشتگ یا مکان فیلتر');
        const add = async () => {
            const value = type.value === 'tag' ? input.value.trim().replace(/^#/, '') : input.value.trim();
            if (!value) return;
            if (type.value === 'tag' && !/^[\p{L}\p{N}_-]+$/u.test(value)) {
                new Notice('یک هشتگ معتبر وارد کنید'); return;
            }
            const filter = { type: type.value, value };
            if (!p.settings.pinned.some(f => f.type === filter.type && f.value === filter.value)) {
                p.settings.pinned.push(filter); await p.persist();
            }
            input.value = '';
            this.activePinned = filter;
            this.renderPinnedResults();
        };
        B(form, 'ذخیرهٔ فیلتر', 'plus', 'pr-quiet-btn', add);
        input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.isComposing) add(); });
        this.chips = E(root, 'div', 'pr-filter-chips');
        this.pinnedCount = E(root, 'div', 'pr-counter');
        this.pinnedList = E(root, 'div', 'pr-pinned-list');
        this.renderPinnedResults();
    }
    renderPinnedResults() {
        if (!this.pinnedList) return;
        const p = this.p;
        this.chips.replaceChildren();
        const all = B(this.chips, 'همهٔ فعال', null, 'pr-filter-chip' + (!this.activePinned ? ' is-active' : ''), () => {
            this.activePinned = null; this.renderPinnedResults();
        });
        all.setAttribute('aria-pressed', String(!this.activePinned));
        for (const filter of p.settings.pinned) {
            const active = this.activePinned?.type === filter.type && this.activePinned?.value === filter.value;
            const chip = E(this.chips, 'span', 'pr-saved-filter');
            const button = B(chip, (filter.type === 'tag' ? '#' : '📍 ') + filter.value, null,
                'pr-filter-chip' + (active ? ' is-active' : ''), () => { this.activePinned = filter; this.renderPinnedResults(); });
            button.setAttribute('aria-pressed', String(active));
            const remove = B(chip, '', 'x', 'pr-remove-filter', async () => {
                p.settings.pinned = p.settings.pinned.filter(x => !(x.type === filter.type && x.value === filter.value));
                if (active) this.activePinned = null;
                await p.persist(); this.renderPinnedResults();
            });
            remove.setAttribute('aria-label', 'حذف فیلتر ' + filter.value);
        }
        let tasks = p.items().filter(x => !x.done && matchesQuery(x, this.query));
        if (this.activePinned) {
            const filter = this.activePinned;
            tasks = tasks.filter(x => filter.type === 'tag' ? x.tags.includes(filter.value) : x.place.toLowerCase().includes(filter.value.toLowerCase()));
        }
        this.pinnedCount.textContent = fa(p, tasks.length) + ' کار';
        this.pinnedList.replaceChildren();
        if (!tasks.length) empty(this.pinnedList, 'کاری مطابق این فیلتر پیدا نشد');
        else tasks.forEach(item => taskCard(p, this.pinnedList, item));
    }
}
module.exports = { Dashboard };
