// Compact Jalali calendar and dashboard date-count markers.
const { E, B } = require('../shared/dom');
const { jalali, fa, fromJ, monthDays, dateKey } = require('../core/dates');
class Calendar {
    constructor(p, parent, date, onChange, counts = false) { this.p = p; this.parent = parent; this.selected = new Date(date); this.onChange = onChange; this.counts = counts; const j = jalali(p, date); this.y = j.jy; this.m = j.jm; this.draw(); }
    move(n) { this.m += n; if (this.m < 1) {
        this.m = 12;
        this.y--;
    } if (this.m > 12) {
        this.m = 1;
        this.y++;
    } this.draw(); }
    draw() {
        const p = this.p, a = p.api();
        this.parent.replaceChildren();
        if (!a)
            return;
        const head = E(this.parent, 'div', 'pr-calendar-head');
        B(head, '', 'chevron-right', 'pr-icon', () => this.move(-1));
        E(head, 'strong', '', a.jalaliMonthName(this.m) + ' ' + fa(p, this.y));
        B(head, '', 'chevron-left', 'pr-icon', () => this.move(1));
        B(head, 'امروز', null, 'pr-today', () => { this.selected = new Date(); const j = jalali(p, this.selected); this.y = j.jy; this.m = j.jm; this.onChange(new Date(this.selected)); this.draw(); });
        const grid = E(this.parent, 'div', 'pr-calendar-grid');
        ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].forEach(x => E(grid, 'span', 'pr-weekday', x));
        const first = fromJ(p, this.y, this.m, 1);
        if (!first)
            return;
        for (let i = 0; i < (first.getDay() + 1) % 7; i++)
            E(grid, 'span', 'pr-day-blank');
        const count = monthDays(p, this.y, this.m);
        const tallies = new Map();
        if (this.counts)
            for (const task of p.items()) {
                if (task.done)
                    continue;
                const key = task.at?.slice(0, 10);
                if (key)
                    tallies.set(key, (tallies.get(key) || 0) + 1);
            }
        for (let day = 1; day <= count; day++) {
            const d = fromJ(p, this.y, this.m, day);
            if (!d)
                continue;
            const k = dateKey(d), total = tallies.get(k) || 0;
            const cell = B(grid, fa(p, day), null, 'pr-calendar-day', () => { this.selected = d; this.onChange(new Date(d)); this.draw(); });
            if (k === dateKey(new Date()))
                cell.classList.add('is-today');
            if (k === dateKey(this.selected))
                cell.classList.add('is-selected');
            if (total) {
                cell.classList.add('has-tasks');
                const indicator = E(cell, 'span', 'pr-calendar-count', total > 1 ? fa(p, total) : '');
                indicator.setAttribute('aria-label', fa(p, total) + ' یادآوری');
            }
            cell.setAttribute('aria-label', `${day} ${a.jalaliMonthName(this.m)}`);
        }
    }
}
module.exports = { Calendar };
