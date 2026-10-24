const { ItemView } = require('obsidian');
const { SIDE } = require('../core/constants');
const { E, B } = require('../shared/dom');
const { fa, dateKey } = require('../core/dates');
const { status } = require('../core/tasks');
const { empty, taskCard } = require('../ui/task-card');
const { panelHeader, stats, dayPicker, searchField, matchesQuery } = require('../ui/view-parts');

class Sidebar extends ItemView {
    constructor(leaf, p) {
        super(leaf);
        this.p = p;
        this.day = new Date();
        this.filter = 'all';
        this.query = '';
    }
    getViewType() { return SIDE; }
    getDisplayText() { return 'یادآوری‌ها'; }
    getIcon() { return 'alarm-clock'; }
    async onOpen() { this.render(); }
    render() {
        const root = this.contentEl, p = this.p;
        root.replaceChildren();
        root.classList.add('pr-root', 'pr-sidebar');
        panelHeader(root, 'یادآوری‌ها', 'برای روزتان جا باز کنید', () => p.create(this.day),
            { icon: 'layout-dashboard', label: 'بازکردن داشبورد', action: () => p.dashboard() });
        this.stats = stats(root, p, true);
        this.picker = dayPicker(root, p, this.day, day => {
            this.day = day;
            this.filter = 'day';
            this.updateTabs();
            this.list();
        }, true);
        searchField(root, this.query, query => { this.query = query; this.list(); });
        this.tabs = E(root, 'div', 'pr-sidebar-tabs');
        this.tabs.setAttribute('role', 'group');
        this.tabs.setAttribute('aria-label', 'فیلتر کارها');
        this.buttons = new Map();
        for (const [key, label] of [['day', 'این روز'], ['all', 'همهٔ فعال'], ['soon', 'نزدیک'], ['overdue', 'گذشته'], ['done', 'انجام‌شده']]) {
            this.buttons.set(key, B(this.tabs, label, null, 'pr-sidebar-tab', () => {
                this.filter = key; this.updateTabs(); this.list();
            }));
        }
        this.updateTabs();
        this.counter = E(root, 'div', 'pr-counter');
        this.container = E(root, 'div', 'pr-sidebar-list');
        this.list();
    }
    updateTabs() {
        for (const [key, button] of this.buttons || []) {
            button.classList.toggle('is-active', key === this.filter);
            button.setAttribute('aria-pressed', String(key === this.filter));
        }
    }
    refresh() {
        if (!this.container) return;
        this.stats?.update();
        this.picker?.refresh();
        this.list();
    }
    list() {
        if (!this.container) return;
        const scroll = this.container.scrollTop;
        this.container.replaceChildren();
        const filtered = this.p.items().filter(item => {
            const matches = this.filter === 'done' ? item.done : !item.done && (
                this.filter === 'all' ||
                this.filter === 'day' && item.at?.slice(0, 10) === dateKey(this.day) ||
                this.filter === status(this.p, item));
            return matches && matchesQuery(item, this.query);
        });
        this.counter.textContent = fa(this.p, filtered.length) + ' کار' + (this.filter === 'day' ? ' برای روز انتخاب‌شده' : ' در این فهرست');
        if (!filtered.length) empty(this.container, this.query ? 'کاری با این عبارت پیدا نشد' : 'هنوز کاری اینجا ندارید');
        else filtered.forEach(item => taskCard(this.p, this.container, item, true));
        this.container.scrollTop = scroll;
    }
}
module.exports = { Sidebar };
