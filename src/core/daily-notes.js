// Resolve the selected day's note without consulting the active editor.
const { moment } = require('obsidian');
const { jalali, pad, en } = require('./dates');

function dailyOptions(p) {
    // Daily notes has no public settings API. Treat its optional configuration
    // as a convenience and fall back to this plugin's explicit settings.
    const core = p.settings.dailyUseCore
        ? p.app.internalPlugins?.plugins?.['daily-notes']?.instance?.options : null;
    return {
        folder: core ? (core.folder || '') : (p.settings.dailyFolder || ''),
        format: core ? (core.format || 'YYYY-MM-DD') : (p.settings.dailyFormat || 'YYYY-MM-DD'),
        calendar: core ? 'gregorian' : (p.settings.dailyCalendar || 'gregorian'),
        heading: normalizeHeading(p.settings.dailyHeading),
        source: core ? 'obsidian' : 'custom'
    };
}

function normalizeHeading(value) {
    const text = String(value ?? '').replace(/[\r\n]/g, ' ').trim();
    return !text || /^#{1,6}\s+\S/.test(text) ? text : '## ' + text;
}

function notePath(value) {
    const text = String(value || '').trim().replace(/\\/g, '/');
    if (!text || text.startsWith('/') || /[\u0000-\u001f<>:"|?*]/.test(text))
        throw new Error('مسیر یادداشت معتبر نیست');
    const parts = text.split('/').filter(Boolean);
    if (parts.some(part => part === '.' || part === '..'))
        throw new Error('مسیر یادداشت باید داخل ولت باشد');
    const path = parts.join('/');
    return /\.md$/i.test(path) ? path : path + '.md';
}

function dailyNotePath(p, date) {
    if (!(date instanceof Date) || !Number.isFinite(date.getTime()))
        throw new Error('تاریخ یادداشت معتبر نیست');
    const options = dailyOptions(p);
    let filename;
    if (options.calendar === 'gregorian' && typeof moment === 'function') {
        filename = moment(date).locale('en').format(options.format);
    } else {
        const j = options.calendar === 'jalali' ? jalali(p, date) : null;
        if (options.calendar === 'jalali' && !j)
            throw new Error('برای نام‌گذاری شمسی، افزونه Persian Calendar را فعال کنید');
        const year = j ? j.jy : date.getFullYear();
        const month = j ? j.jm : date.getMonth() + 1;
        const day = j ? j.jd : date.getDate();
        const values = { YYYY: String(year), YY: String(year).slice(-2), MM: pad(month), M: String(month), DD: pad(day), D: String(day) };
        filename = options.format.replace(/\[([^\]]*)\]|j?(YYYY|YY|MM|DD|M|D)/g,
            (_, literal, token) => literal !== undefined ? literal : values[token]);
    }
    // Store ASCII digits for paths, even when the host's locale is Persian.
    filename = en(p, filename).trim();
    if (!filename) throw new Error('قالب نام یادداشت خالی است');
    const folder = String(options.folder).trim().replace(/^\/+|\/+$/g, '');
    return notePath([folder, filename].filter(Boolean).join('/'));
}

function appendLine(source, line) {
    const sep = source.includes('\r\n') ? '\r\n' : '\n';
    return source + (source && !source.endsWith('\n') ? sep : '') + line + sep;
}

function insertDailyTask(source, line, heading) {
    heading = normalizeHeading(heading);
    if (!heading) return appendLine(source, line);
    const sep = source.includes('\r\n') ? '\r\n' : '\n';
    const lines = source.split(/\r?\n/);
    const level = heading.match(/^#+/)[0].length;
    let start = -1, end = lines.length, fence = null;
    let frontmatter = lines[0]?.replace(/^\uFEFF/, '').trim() === '---';
    for (let i = 0; i < lines.length; i++) {
        const text = lines[i];
        if (frontmatter) {
            if (i > 0 && /^(---|\.\.\.)\s*$/.test(text)) frontmatter = false;
            continue;
        }
        const marker = /^ {0,3}(`{3,}|~{3,})/.exec(text)?.[1];
        if (marker) {
            if (!fence) fence = marker;
            else if (marker[0] === fence[0] && marker.length >= fence.length &&
                /^ {0,3}(`+|~+)\s*$/.test(text)) fence = null;
            continue;
        }
        if (fence) continue;
        const h = /^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/.exec(text);
        if (!h) continue;
        if (start < 0 && h[1].length === level && h[2] === heading.replace(/^#+\s+/, '')) start = i;
        else if (start >= 0 && h[1].length <= level) { end = i; break; }
    }
    if (start < 0) {
        const prefix = source && !source.endsWith('\n') ? sep : '';
        const gap = source && !source.endsWith(sep + sep) ? sep : '';
        return source + prefix + gap + heading + sep + line + sep;
    }
    let insert = end;
    while (insert > start + 1 && !lines[insert - 1].trim()) insert--;
    lines.splice(insert, 0, line);
    return lines.join(sep) + (lines.at(-1) === '' ? '' : sep);
}

module.exports = { dailyOptions, dailyNotePath, normalizeHeading, notePath, appendLine, insertDailyTask };

async function createDailyFromTemplate(p, target) {
    const { TFile } = require('obsidian');
    const plugin = p.app.plugins.getPlugin('templater-obsidian');
    const engine = plugin?.templater;
    if (typeof engine?.create_new_note_from_template !== 'function')
        throw new Error('افزونه Templater را فعال کنید یا گزینهٔ قالب Templater را خاموش کنید');
    const path = p.settings.dailyTemplatePath;
    const template = path ? p.app.vault.getAbstractFileByPath(path) : null;
    if (!(template instanceof TFile) || template.extension !== 'md')
        throw new Error('در تنظیمات یادداشت روز، یک قالب معتبر Templater انتخاب کنید');
    if (template.path === target) throw new Error('قالب و یادداشت مقصد باید مسیر متفاوتی داشته باشند');
    const slash = target.lastIndexOf('/');
    const folder = slash < 0 ? p.app.vault.getRoot() : target.slice(0, slash);
    const name = target.slice(slash + 1).replace(/\.md$/i, '');
    // Await the native Templater pipeline, including parsing and completion
    // hooks, before inserting any task. Never write raw <% ... %> commands.
    const file = await engine.create_new_note_from_template(template, folder, name, false);
    if (!(file instanceof TFile)) throw new Error('Templater نتوانست یادداشت روز را بسازد؛ تنظیمات قالب را بررسی کنید');
    if (file.path !== target) throw new Error('قالب Templater مسیر یادداشت را تغییر داده است؛ دستور تغییر نام یا پوشه را در قالب روزانه اصلاح کنید');
    return file;
}
module.exports.createDailyFromTemplate = createDailyFromTemplate;

// Serialize writes for the same day: Templater's filename de-duplication must
// never create a second daily note when two panels add tasks concurrently.
const noteWrites = new WeakMap();
async function withNoteWrite(p, target, write) {
    let queue = noteWrites.get(p);
    if (!queue) { queue = new Map(); noteWrites.set(p, queue); }
    const previous = queue.get(target) || Promise.resolve();
    const pending = previous.catch(() => {}).then(write);
    queue.set(target, pending);
    try { return await pending; }
    finally { if (queue.get(target) === pending) queue.delete(target); }
}
module.exports.withNoteWrite = withNoteWrite;
