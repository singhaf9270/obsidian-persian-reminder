// Shared surfaces keep the sidebar and dashboard visually and behaviorally aligned.
const { E, I, B } = require('../shared/dom');
const { fa, dateFa, dateKey } = require('../core/dates');
const { status } = require('../core/tasks');
const { Calendar } = require('./calendar');

function panelHeader(parent, title, subtitle, action, secondary) {
    const head = E(parent, 'header', 'pr-view-header');
    const brand = E(head, 'div', 'pr-view-brand');
    I(brand, 'calendar-clock', 'pr-brand-icon');
    const text = E(brand, 'div', 'pr-view-heading');
    E(text, 'h2', '', title);
    E(text, 'p', '', subtitle);
    const controls = E(head, 'div', 'pr-view-controls');
    B(controls, 'کار جدید', 'plus', 'pr-add', action);
    if (secondary) {
        const button = B(controls, '', secondary.icon, 'pr-icon', secondary.action);
        button.title = secondary.label;
        button.setAttribute('aria-label', secondary.label);
    }
}

function stats(parent, p, compact = false) {
    const root = E(parent, 'div', 'pr-stats' + (compact ? ' is-compact' : ''));
    const update = () => {
        root.replaceChildren();
        const tasks = p.items(), today = dateKey(new Date());
        const rows = [
            ['فعال', tasks.filter(x => !x.done).length, 'list-todo', 'active'],
            ['امروز', tasks.filter(x => !x.done && x.at?.slice(0, 10) === today).length, 'sun', 'today'],
            ['گذشته', tasks.filter(x => status(p, x) === 'overdue').length, 'timer', 'overdue'],
            ['انجام‌شده', tasks.filter(x => x.done).length, 'check-check', 'done']
        ];
        for (const [label, count, icon, key] of rows) {
            const card = E(root, 'div', 'pr-stat pr-stat-' + key);
            I(card, icon);
            E(card, 'strong', '', fa(p, count));
            E(card, 'span', '', label);
        }
    };
    update();
    return { update };
}

function dayPicker(parent, p, day, onChange, compact = false) {
    const root = E(parent, 'section', 'pr-day-picker' + (compact ? ' is-compact' : ''));
    const bar = E(root, 'div', 'pr-day-navigation');
    const previous = B(bar, '', 'chevron-right', 'pr-icon', () => shift(-1));
    previous.setAttribute('aria-label', 'روز قبل');
    const label = E(bar, 'div', 'pr-day-label');
    E(label, 'small', '', 'روز انتخاب‌شده');
    const title = E(label, 'strong');
    title.setAttribute('aria-live', 'polite');
    const next = B(bar, '', 'chevron-left', 'pr-icon', () => shift(1));
    next.setAttribute('aria-label', 'روز بعد');
    B(bar, 'امروز', null, 'pr-quiet-btn', () => select(new Date()));
    let calendar = null;
    const calendarBox = E(root, 'details', 'pr-view-calendar-toggle');
    calendarBox.open = !compact;
    E(calendarBox, 'summary', '', 'انتخاب از تقویم');
    const host = E(calendarBox, 'div', 'pr-calendar-host');
    const destination = E(root, 'div', 'pr-day-destination');
    I(destination, 'file-text');
    const path = E(destination, 'span');
    function select(value) {
        day = new Date(value);
        update();
        onChange(new Date(day));
    }
    function shift(delta) {
        const value = new Date(day);
        value.setDate(value.getDate() + delta);
        select(value);
    }
    function update() {
        title.textContent = dateFa(p, day);
        try { path.textContent = p.dailyDestination(day); }
        catch (error) { path.textContent = error.message; }
        path.title = path.textContent;
        if (p.api()) {
            const { jalali } = require('../core/dates');
            const j = jalali(p, day);
            if (j && calendar) {
                calendar.selected = new Date(day);
                calendar.y = j.jy;
                calendar.m = j.jm;
                calendar.draw();
            } else if (j) calendar = new Calendar(p, host, day, select, true);
        } else {
            host.textContent = 'برای نمایش تقویم، Persian Calendar را فعال کنید.';
        }
    }
    update();
    return {
        update,
        refresh() {
            title.textContent = dateFa(p, day);
            try { path.textContent = p.dailyDestination(day); }
            catch (error) { path.textContent = error.message; }
            if (calendar) calendar.draw();
            else update();
        }
    };
}

function searchField(parent, value, onInput) {
    const wrap = E(parent, 'label', 'pr-search-field');
    I(wrap, 'search');
    const input = E(wrap, 'input', 'pr-search');
    input.type = 'search';
    input.placeholder = 'جست‌وجوی کار، هشتگ یا مکان…';
    input.setAttribute('aria-label', 'جست‌وجوی یادآوری‌ها');
    input.value = value;
    input.addEventListener('input', () => onInput(input.value));
    return input;
}
function matchesQuery(item, query) {
    const text = query.trim().toLocaleLowerCase();
    return !text || [item.title, item.place, item.path, ...item.tags].join(' ').toLocaleLowerCase().includes(text);
}
module.exports = { panelHeader, stats, dayPicker, searchField, matchesQuery };
