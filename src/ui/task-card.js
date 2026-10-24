// Task cards shared by sidebar/dashboard + remaining-time badges.
const { E, I, B } = require('../shared/dom');
const { TASK } = require('../core/constants');
const { fromISO, fa, dateFa, clockFa } = require('../core/dates');
const { status, paintTask } = require('../core/tasks');
function empty(parent, message) { const box = E(parent, 'div', 'pr-empty'); I(box, 'calendar-check'); E(box, 'span', '', message); }
function taskCard(p, parent, item, compact = false) {
    const st = status(p, item), box = E(parent, 'article', 'pr-task-card pr-due-' + st + (compact ? ' is-compact' : ''));
    paintTask(p, box, item);
    const body = E(box, 'div', 'pr-card-main'), title = E(body, 'div', 'pr-card-heading');
    const check = E(title, 'input', 'pr-check');
    check.type = 'checkbox';
    check.checked = item.done;
    check.setAttribute('aria-label', 'انجام کار');
    check.addEventListener('change', async () => { const ok = await p.change(item, raw => raw.replace(TASK, (_, a, c, b, rest) => a + (check.checked ? 'x' : ' ') + b + rest)); if (!ok)
        check.checked = !check.checked; });
    const name = E(title, 'span', 'pr-title', item.title || 'بدون عنوان');
    name.addEventListener('click', () => p.openFile(item));
    const date = fromISO(item.at), meta = E(body, 'div', 'pr-card-meta');
    if (date) {
        const chip = B(meta, dateFa(p, date) + ' · ' + clockFa(p, date), 'calendar-clock', 'pr-card-date', () => p.edit(item, 'time'));
        chip.title = 'تغییر تاریخ و ساعت';
    }
    const when = fromISO(item.at);
    if (when) {
        const remaining = E(meta, 'span', 'pr-remaining');
        let label, kind = '';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const target = new Date(when);
        target.setHours(0, 0, 0, 0);
        const days = Math.round((Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
        if (item.done) {
            label = 'انجام‌شده';
            kind = 'is-done';
        }
        else if (when.getTime() < Date.now()) {
            label = 'زمان گذشته';
            kind = 'is-overdue';
        }
        else if (days === 0) {
            label = 'امروز';
            kind = 'is-today';
        }
        else if (days === 1) {
            label = 'فردا';
            kind = 'is-tomorrow';
        }
        else {
            label = fa(p, days) + ' روز دیگر';
        }
      if (kind) remaining.classList.add(kind);
remaining.textContent = label;
    }
    if (item.place) {
        const m = E(meta, 'span', 'pr-location');
        I(m, 'map-pin');
        E(m, 'span', '', item.place);
    }
    if (item.tags.length)
        { const tags = E(body, 'div', 'pr-plain-tags'); for (const tag of item.tags) E(tags, 'a', 'tag', '#' + tag); }
    const footer = E(body, 'div', 'pr-note-path');
    I(footer, 'file-text');
    E(footer, 'span', '', item.path.split('/').pop());
    const controls = E(box, 'div', 'pr-card-actions');
    const timeBtn = B(controls, '', 'clock-3', 'pr-card-action', () => p.edit(item, 'time'));
    timeBtn.title = 'اصلاح زمان';
    const editBtn = B(controls, '', 'pencil', 'pr-card-action', () => p.edit(item));
    editBtn.title = 'ویرایش کار';
    return box;
}
module.exports = { empty, taskCard };
