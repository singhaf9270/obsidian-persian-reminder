// Parse, serialize and style task *rows*, without changing hashtag styling.
const { TASK, STAMP, OLD, PLACE, TAG } = require('./constants');
const { pad, iso, dateKey, fromISO, jalali, fromJ, en } = require('./dates');
function cssColor(str) { return /^#[\da-f]{6}$/i.test(str || '') ? str : '#159f9b'; }
function parseTask(p, raw) {
    const m = TASK.exec(raw);
    if (!m)
        return null;
    const body = m[4], all = [...body.matchAll(STAMP)], stamp = all.at(-1), old = OLD.exec(body);
    let date = null, marker = null;
    if (stamp) {
        const j = stamp[1];
        const [y, mo, d, h, mi] = stamp.slice(2).map(value => en(p, value));
        if (+h < 24 && +mi < 60) {
            if (j) {
                date = fromJ(p, +y, +mo, +d);
                if (date) {
                    date.setHours(+h, +mi, 0, 0);
                    if (date.getHours() !== +h || date.getMinutes() !== +mi)
                        date = null;
                }
            }
            else
                date = fromISO(`${y}-${mo}-${d}T${h}:${mi}`);
        }
        const from = m[1].length + m[2].length + m[3].length + stamp.index;
        marker = { from, to: from + stamp[0].length, raw: stamp[0] };
    }
    else if (old) {
        date = fromISO(old[2]);
        const from = raw.indexOf(old[0]);
        marker = { from, to: from + old[0].length, raw: old[0] };
    }
    const matches = [...body.matchAll(PLACE)];
    let place = matches.at(-1)?.[1] || '';
    if (!place && old) {
        try {
            place = decodeURIComponent(old[3].trim());
        }
        catch {
            place = old[3].trim();
        }
    }
    const tags = [...new Set([...body.matchAll(TAG)].map(x => x[1]))];
    const title = body.replace(STAMP, '').replace(OLD, '').replace(PLACE, '').replace(TAG, ' ').replace(/\s+/g, ' ').trim();
    return { raw, title, tags, place, at: date ? iso(date) : null, done: m[2].toLowerCase() === 'x', marker };
}
function buildTask(p, old, data) {
    const m = old ? TASK.exec(old) : null, prefix = m ? m[1] + m[2] + m[3] : '- [ ] ', d = fromISO(data.at);
    if (!d)
        throw new Error('زمان نامعتبر');
    let stamp;
    if (p.settings.dateFormat === 'jalali') {
        const j = jalali(p, d);
        if (!j)
            throw new Error('تقویم شمسی فعال نیست');
        stamp = `(@j:${j.jy}-${pad(j.jm)}-${pad(j.jd)} ${pad(d.getHours())}:${pad(d.getMinutes())})`;
    }
    else
        stamp = `(@${dateKey(d)} ${pad(d.getHours())}:${pad(d.getMinutes())})`;
    const tags = [...new Set(data.tags.map(t => t.replace(/^#/, '')))].filter(t => /^[\p{L}\p{N}_-]+$/u.test(t));
    const place = (data.place || '').trim().replace(/[\]\r\n]/g, '');
    return prefix + [data.title.trim().replace(/[\r\n]/g, ' '), ...tags.map(t => '#' + t), place ? `📍[${place}]` : null, stamp].filter(Boolean).join(' ');
}
// Preserve the original Markdown when only the reminder date/time changes.
function updateTaskPreservingText(p, previous, data) {
    const parsed = parseTask(p, previous);
    if (!parsed)
        throw new Error('تسک پیدا نشد');
    const normalizedTags = [...new Set(data.tags.map(x => x.replace(/^#/, '')))];
    const unchanged = parsed.title === data.title.trim() &&
        parsed.place === (data.place || '').trim() &&
        parsed.tags.length === normalizedTags.length &&
        parsed.tags.every(tag => normalizedTags.includes(tag));
    if (!unchanged)
        return buildTask(p, previous, data);
    const generated = buildTask(p, null, data);
    const stamp = [...generated.matchAll(STAMP)].at(-1)?.[0];
    if (!stamp)
        throw new Error('زمان یادآوری تولید نشد');
    if (!parsed.marker)
        return previous.trimEnd() + ' ' + stamp;
    const { from, to, raw } = parsed.marker;
    if (raw.startsWith('<!--')) {
        const needsPlace = parsed.place && !PLACE.test(previous);
        PLACE.lastIndex = 0;
        const location = needsPlace ? ` 📍[${parsed.place}]` : '';
        return previous.slice(0, from).trimEnd() + location + ' ' + stamp + previous.slice(to);
    }
    return previous.slice(0, from) + stamp + previous.slice(to);
}
function status(p, item) { if (item.done)
    return 'done'; const d = fromISO(item.at); if (!d)
    return 'invalid'; const delta = d.getTime() - Date.now(); if (delta < 0)
    return 'overdue'; if (delta <= p.settings.soonHours * 3600000)
    return 'soon'; if (dateKey(d) === dateKey(new Date()))
    return 'today'; return 'future'; }
function tagColor(p, item) { for (const t of Object.keys(p.settings.tagColors)) {
    if (item.tags.includes(t))
        return cssColor(p.settings.tagColors[t]);
} return null; }
function paintTask(p, el, item) { const color = tagColor(p, item); if (color) {
    el.classList.add('pr-colored-task');
    el.style.setProperty('--pr-task-color', color);
    el.style.setProperty('--pr-card-color', color);
} el.classList.add('pr-style-' + p.settings.taskStyle); }
module.exports = { cssColor, parseTask, buildTask, updateTaskPreservingText, status, tagColor, paintTask };
