// Sidebar filters, search, and completed-task section.
const { ItemView } = require('obsidian');
const { SIDE } = require('../core/constants');
const { E, B } = require('../shared/dom');
const { fa, dateKey } = require('../core/dates');
const { status } = require('../core/tasks');
const { empty, taskCard } = require('../ui/task-card');
class Sidebar extends ItemView {
    constructor(leaf, p) { super(leaf); this.p = p; this.filter = 'all'; this.query = ''; }
    getViewType() { return SIDE; }
    getDisplayText() { return 'یادآوری‌ها'; }
    getIcon() { return 'alarm-clock'; }
    async onOpen() { this.render(); }
    render() { const root = this.contentEl; root.replaceChildren(); root.classList.add('pr-root', 'pr-sidebar', 'pr-panel-' + this.p.settings.panelStyle); const head = E(root, 'div', 'pr-sidebar-head'); E(head, 'h3', '', 'یادآوری‌ها'); B(head, 'افزودن', 'plus', 'pr-add', () => this.p.create()); B(head, '', 'layout-dashboard', 'pr-icon', () => this.p.dashboard()); const query = E(root, 'input', 'pr-search'); query.type = 'search'; query.placeholder = 'جست‌وجوی کار و مکان...'; query.value = this.query; query.addEventListener('input', () => { this.query = query.value; this.list(); }); const tabs = E(root, 'div', 'pr-sidebar-tabs'); [['all', 'فعال'], ['today', 'امروز'], ['soon', 'نزدیک'], ['overdue', 'گذشته'], ['done', 'انجام‌شده']].forEach(([key, label]) => B(tabs, label, null, 'pr-sidebar-tab' + (key === this.filter ? ' is-active' : ''), () => { this.filter = key; this.render(); })); this.counter = E(root, 'div', 'pr-counter'); this.container = E(root, 'div', 'pr-sidebar-list'); this.list(); }
    list() { if (!this.container)
        return; this.container.replaceChildren(); const now = dateKey(new Date()), q = this.query.trim().toLowerCase(); const filtered = this.p.items().filter(item => { const stateName = status(this.p, item); const matches = this.filter === 'done' ? item.done : !item.done && (this.filter === 'all' || this.filter === 'today' && item.at.slice(0, 10) === now || this.filter === stateName); return matches && (!q || [item.title, item.place, item.path, ...item.tags].join(' ').toLowerCase().includes(q)); }); this.counter.textContent = fa(this.p, filtered.length) + ' کار'; if (!filtered.length)
        empty(this.container, 'کاری در این قسمت نیست');
    else
        filtered.forEach(item => taskCard(this.p, this.container, item, true)); }
}
module.exports = { Sidebar };
