/* Generated Persian Reminder bundle. Edit files in src/, not this file. */
'use strict';
const __prNativeRequire = require;
const __prModules = {
"src/main.js": function(module, exports, require) {
// Application entry point: lifecycle, vault index, notifications and commands.
const { Plugin, Notice, MarkdownView, TFile, Platform } = require('obsidian');
const { SIDE, DASH, DEFAULTS, PALETTES, TASK, PLACE } = require("src/core/constants.js");
const { cssColor, parseTask, buildTask, status, paintTask } = require("src/core/tasks.js");
const { fromISO, dateFa, clockFa } = require("src/core/dates.js");
const { E, I } = require("src/shared/dom.js");
const { refreshEffect, editorExtension } = require("src/editor/widgets.js");
const { TaskModal } = require("src/ui/task-modal.js");
const { Sidebar } = require("src/views/sidebar.js");
const { Dashboard } = require("src/views/dashboard.js");
const { SettingsTab } = require("src/settings.js");
module.exports = class PersianReminder extends Plugin {
    async onload() {
        this.settings = { ...DEFAULTS, ...await this.loadData() };
        this.settings.tagColors ||= {};
        this.settings.pinned ||= [];
        this.settings.notified ||= {};
        this.index = new Map();
        this.scanSerial = new Map();
        this.scanTimers = new Map();
        this.applyTheme();
        this.registerView(SIDE, leaf => new Sidebar(leaf, this));
        this.registerView(DASH, leaf => new Dashboard(leaf, this));
        this.registerEditorExtension(editorExtension(this));
        this.addSettingTab(new SettingsTab(this.app, this));
        this.addRibbonIcon('alarm-clock', 'یادآوری‌ها', () => this.sidebar());
        this.addCommand({ id: 'open-sidebar', name: 'بازکردن سایدبار', callback: () => this.sidebar() });
        this.addCommand({ id: 'open-dashboard', name: 'بازکردن داشبورد', callback: () => this.dashboard() });
        this.addCommand({ id: 'new-task', name: 'افزودن کار', callback: () => this.create() });
        this.addCommand({ id: 'edit-current-task', name: 'یادآوری تسک فعلی', editorCallback: (editor, view) => { this.openTask(view.file?.path, editor.getCursor().line, editor.getLine(editor.getCursor().line)); } });
        this.registerMarkdownPostProcessor((element, ctx) => this.reading(element, ctx));
        this.registerEvent(this.app.vault.on('modify', file => { if (file instanceof TFile && file.extension === 'md')
            this.scan(file); }));
        this.registerEvent(this.app.vault.on('create', file => { if (file instanceof TFile && file.extension === 'md')
            this.scan(file); }));
        this.registerEvent(this.app.vault.on('delete', file => { this.index.delete(file.path); this.refresh(); }));
        this.registerEvent(this.app.vault.on('rename', (file, old) => { this.index.delete(old); if (file instanceof TFile && file.extension === 'md')
            this.scan(file); this.refresh(); }));
        this.registerEvent(this.app.workspace.on('editor-change', (editor, view) => { if (!view?.file)
            return; const path = view.file.path; if (this.scanTimers.has(path))
            window.clearTimeout(this.scanTimers.get(path)); this.scanTimers.set(path, window.setTimeout(() => { this.scanTimers.delete(path); this.indexText(path, editor.getValue()); }, 350)); }));
        this.app.workspace.onLayoutReady(async () => { await this.scanAll(); if (!this.api())
            new Notice('برای تقویم شمسی افزونه Persian Calendar را فعال کنید'); await this.notify(); });
        this.registerInterval(window.setInterval(() => { this.notify(); this.refresh(); }, 30000));
    }
    onunload() { for (const timer of this.scanTimers.values())
        window.clearTimeout(timer); this.app.workspace.detachLeavesOfType(SIDE); this.app.workspace.detachLeavesOfType(DASH); ['--pr-accent-color', '--pr-inline-text-color', '--pr-clock-color', '--pr-stamp-color', '--pr-soon-color', '--pr-overdue-color', ...['inline','date','remaining'].flatMap(t => ['a','b','border'].map(k => `--pr-${t}-${k}`))].forEach(v => document.body.style.removeProperty(v)); }
    api() { return this.app.plugins.getPlugin('persian-calendar')?.api || null; }
    async persist() { await this.saveData(this.settings); }
    applyTheme() {
        const pal = PALETTES[this.settings.palette] || PALETTES.lavender;
        const colors = this.settings.badgeColors || {};
        const defaults = DEFAULTS.badgeColors;
        const vars = { '--pr-accent-color':pal.primary, '--pr-inline-text-color':cssColor(this.settings.inlineTextColor || DEFAULTS.inlineTextColor), '--pr-clock-color':pal.primary, '--pr-stamp-color':pal.primary, '--pr-soon-color':'#f59e0b', '--pr-overdue-color':'#ef476f' };
        for (const type of ['inline','date','remaining']) {
            const v = { ...defaults[type], ...(colors[type] || {}) };
            for (const [k, val] of Object.entries(v)) vars[`--pr-${type}-${k}`] = val;
        }
        for (const [key, value] of Object.entries(vars)) document.body.style.setProperty(key, cssColor(value));
        this.refresh(); this.requestEditorUpdate();
    }
    requestEditorUpdate() { for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
        try {
            leaf.view.editor?.cm?.dispatch({ effects: refreshEffect.of(null) });
        }
        catch { }
    } }
    async show(type, right = false) { let leaf = this.app.workspace.getLeavesOfType(type)[0]; if (!leaf) {
        leaf = right ? this.app.workspace.getRightLeaf(true) : this.app.workspace.getLeaf('tab');
        if (!leaf)
            leaf = this.app.workspace.getLeaf('tab');
        await leaf.setViewState({ type, active: true });
    } await this.app.workspace.revealLeaf(leaf); }
    sidebar() { return this.show(SIDE, true); }
    dashboard() { return this.show(DASH); }
    create(date = null) { if (!this.api())
        return new Notice('افزونه Persian Calendar فعال نیست'); new TaskModal(this, null, date).open(); }
    edit(item, tab = 'date') { if (!this.api())
        return new Notice('افزونه Persian Calendar فعال نیست'); new TaskModal(this, item, null, tab).open(); }
    destination() { return this.app.workspace.getActiveFile()?.path || this.settings.defaultNote; }
    editor(path) { return this.app.workspace.getLeavesOfType('markdown').map(l => l.view).find(v => v instanceof MarkdownView && v.file?.path === path) || null; }
    openFromCM(cm, line, raw) { const view = this.app.workspace.getLeavesOfType('markdown').map(l => l.view).find(v => v instanceof MarkdownView && v.editor?.cm === cm); if (view?.file)
        this.openTask(view.file.path, line, raw);
    else
        new Notice('یادداشت باز پیدا نشد'); }
    openTask(path, line, raw) { const item = parseTask(this, raw); if (!item || !path)
        return new Notice('یک تسک انتخاب کنید'); this.edit({ ...item, path, line }); }
    async scanAll() { this.index.clear(); const files = this.app.vault.getMarkdownFiles(); for (let i = 0; i < files.length; i += 10)
        await Promise.all(files.slice(i, i + 10).map(f => this.scan(f, false))); this.refresh(); }
    async scan(file, refresh = true) { if (!(file instanceof TFile) || file.extension !== 'md')
        return; const token = (this.scanSerial.get(file.path) || 0) + 1; this.scanSerial.set(file.path, token); try {
        const open = this.editor(file.path);
        const text = open ? open.editor.getValue() : await this.app.vault.cachedRead(file);
        if (this.scanSerial.get(file.path) === token)
            this.indexText(file.path, text, refresh);
    }
    catch (e) {
        console.error('[Persian Reminder scan]', e);
    } }
    indexText(path, source, refresh = true) { const arr = []; source.split(/\r?\n/).forEach((raw, line) => { const it = parseTask(this, raw); if (it?.at)
        arr.push({ ...it, path, line }); }); this.index.set(path, arr); if (refresh)
        this.refresh(); }
    items() { return [...this.index.values()].flat().sort((a, b) => Number(a.done) - Number(b.done) || a.at.localeCompare(b.at)); }
    refresh() { for (const type of [SIDE, DASH])
        for (const leaf of this.app.workspace.getLeavesOfType(type))
            leaf.view.render?.(); }
    findLine(lines, item) { if (lines[item.line] === item.raw)
        return item.line; const hits = []; lines.forEach((l, i) => { if (l === item.raw)
        hits.push(i); }); return hits.length === 1 ? hits[0] : -1; }
    async change(item, transform) { const file = this.app.vault.getAbstractFileByPath(item.path); if (!(file instanceof TFile))
        return false; const open = this.editor(file.path); try {
        if (open) {
            const editor = open.editor, lines = editor.getValue().split(/\r?\n/), line = this.findLine(lines, item);
            if (line < 0) {
                new Notice('تسک تغییر کرده است؛ پنل را بازخوانی کنید');
                return false;
            }
            const old = editor.getLine(line), next = transform(old);
            editor.replaceRange(next, { line, ch: 0 }, { line, ch: old.length });
            this.indexText(file.path, editor.getValue());
            return true;
        }
        let done = false;
        await this.app.vault.process(file, source => { const lines = source.split(/\r?\n/), n = this.findLine(lines, item); if (n < 0)
            return source; lines[n] = transform(lines[n]); done = true; return lines.join(source.includes('\r\n') ? '\r\n' : '\n'); });
        if (done)
            await this.scan(file);
        else
            new Notice('تسک موردنظر پیدا نشد');
        return done;
    }
    catch (e) {
        console.error(e);
        new Notice('خطا در ذخیره‌سازی');
        return false;
    } }
    async remove(item) { return this.change(item, old => { const parsed = parseTask(this, old), m = TASK.exec(old); if (!m || !parsed)
        return old; return m[1] + m[2] + m[3] + [parsed.title, ...parsed.tags.map(t => '#' + t), parsed.place ? `📍[${parsed.place}]` : null].filter(Boolean).join(' '); }); }
    async add(path, values) { let target = (path || this.settings.defaultNote).trim() || this.settings.defaultNote; if (!target.toLowerCase().endsWith('.md'))
        target += '.md'; const line = buildTask(this, null, values); try {
        let file = this.app.vault.getAbstractFileByPath(target);
        if (!file) {
            const parts = target.split('/');
            for (let i = 1; i < parts.length; i++) {
                const folder = parts.slice(0, i).join('/');
                if (!this.app.vault.getAbstractFileByPath(folder))
                    await this.app.vault.createFolder(folder);
            }
            file = await this.app.vault.create(target, line + '\n');
        }
        else if (!(file instanceof TFile))
            return new Notice('مسیر، فایل Markdown نیست'), false;
        else {
            const view = this.editor(file.path);
            if (view) {
                const ed = view.editor, source = ed.getValue(), sep = source.includes('\r\n') ? '\r\n' : '\n';
                ed.replaceRange((source && !source.endsWith('\n') ? sep : '') + line + sep, ed.offsetToPos(source.length));
                this.indexText(file.path, ed.getValue());
                return true;
            }
            await this.app.vault.process(file, source => { const sep = source.includes('\r\n') ? '\r\n' : '\n'; return source + (source && !source.endsWith('\n') ? sep : '') + line + sep; });
        }
        await this.scan(file);
        return true;
    }
    catch (e) {
        console.error(e);
        new Notice('خطا در افزودن کار: ' + e.message);
        return false;
    } }
    async openFile(item) { const file = this.app.vault.getAbstractFileByPath(item.path); if (!(file instanceof TFile))
        return; const leaf = this.app.workspace.getLeaf('tab'); await leaf.openFile(file); if (leaf.view instanceof MarkdownView) {
        const editor = leaf.view.editor, n = this.findLine(editor.getValue().split(/\r?\n/), item), line = n < 0 ? item.line : n;
        editor.setCursor({ line, ch: 0 });
        editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true);
    } await this.app.workspace.revealLeaf(leaf); }
    async reading(root, ctx) {
        const lis = [...root.querySelectorAll('li.task-list-item')];
        if (!lis.length)
            return;
        const file = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
        if (!(file instanceof TFile))
            return;
        try {
            const text = await this.app.vault.cachedRead(file);
            if (!root.isConnected)
                return;
            const section = ctx.getSectionInfo(root);
            if (!section)
                return;
            const lines = text.split(/\r?\n/), tasks = [];
            for (let i = section.lineStart; i <= Math.min(section.lineEnd, lines.length - 1); i++)
                if (TASK.test(lines[i]))
                    tasks.push({ raw: lines[i], line: i });
            if (tasks.length !== lis.length)
                return;
            lis.forEach((li, i) => {
                if (li.querySelector('.pr-inline-date,.pr-inline-clock'))
                    return;
                const task = tasks[i], item = parseTask(this, task.raw);
                if (!item)
                    return;
                paintTask(this, li, item);
                const b = document.createElement('button');
                b.type = 'button';
                b.className = item.marker ? 'pr-inline-date pr-style-' + this.settings.stampStyle : 'pr-inline-clock';
                if (item.marker) {
                    const d = fromISO(item.at);
                    I(b, 'calendar-clock');
                    E(b, 'span', '', d ? `${dateFa(this, d)} · ${clockFa(this, d)}` : item.marker.raw);
                }
                else
                    I(b, 'alarm-clock');
                const open = e => { e.preventDefault(); e.stopPropagation(); this.openTask(file.path, task.line, task.raw); };
                b.addEventListener('click', e => { if (item.marker || Platform.isMobile || this.settings.clickMode === 'single')
                    open(e); });
                b.addEventListener('dblclick', e => { if (!item.marker && !Platform.isMobile && this.settings.clickMode === 'double')
                    open(e); });
                let replaced = false;
                if (item.marker) {
                    const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT), nodes = [];
                    while (walker.nextNode())
                        nodes.push(walker.currentNode);
                    for (const t of nodes) {
                        if (t.parentElement?.closest('li') !== li || t.parentElement?.closest('code,pre'))
                            continue;
                        const offset = t.textContent.indexOf(item.marker.raw);
                        if (offset < 0)
                            continue;
                        const frag = document.createDocumentFragment();
                        frag.append(document.createTextNode(t.textContent.slice(0, offset)));
                        frag.append(b);
                        frag.append(document.createTextNode(t.textContent.slice(offset + item.marker.raw.length)));
                        t.parentNode.replaceChild(frag, t);
                        replaced = true;
                        break;
                    }
                }
                if (!replaced) {
                    const nested = [...li.children].find(c => c.matches('ul,ol'));
                    if (nested)
                        li.insertBefore(b, nested);
                    else
                        li.append(b);
                }
            });
        }
        catch (e) {
            console.error('[Persian Reminder reading]', e);
        }
    }
    async notify() { let changed = false, now = Date.now(); for (const item of this.items()) {
        if (item.done)
            continue;
        const d = fromISO(item.at);
        if (!d)
            continue;
        const elapsed = now - d.getTime();
        if (elapsed < 0 || elapsed > 86400000)
            continue;
        const key = item.path + '|' + item.raw;
        if (this.settings.notified[key])
            continue;
        this.settings.notified[key] = now;
        changed = true;
        new Notice('⏰ ' + item.title + (item.place ? '\n📍 ' + item.place : ''), 10000);
    } if (changed) {
        this.settings.notified = Object.fromEntries(Object.entries(this.settings.notified).sort((a, b) => b[1] - a[1]).slice(0, 500));
        await this.persist();
    } }
};

},
"src/core/constants.js": function(module, exports, require) {
// Plugin identifiers, task syntax, palettes and default settings.
const SIDE = 'persian-reminder-sidebar', DASH = 'persian-reminder-dashboard';
const TASK = /^(\s*(?:[-*+]|\d+[.)])\s+\[)([ xX])(\]\s*)(.*)$/;
const STAMP = /\(@(j:)?(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})\)/g;
const OLD = /<!--\s*pr:([^|>]+)\|(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})\|([^>]*?)\s*-->/;
const PLACE = /📍\[([^\]\r\n]*)\]/g;
const TAG = /(?:^|\s)#([\p{L}\p{N}_-]+)/gu;

// 12 curated palettes (Tailwind-inspired). primary = clock/accent, secondary = date pill/background.
const PALETTES = {
  lavender: { primary: '#a78bfa', secondary: '#c4b5fd', name: 'یاسی' },
  sky:      { primary: '#60a5fa', secondary: '#93c5fd', name: 'آبی آسمانی' },
  pink:     { primary: '#f472b6', secondary: '#f9a8d4', name: 'صورتی' },
  mint:     { primary: '#34d399', secondary: '#6ee7b7', name: 'نعنایی' },
  peach:    { primary: '#fb923c', secondary: '#fdba74', name: 'هلویی' },
  slate:    { primary: '#94a3b8', secondary: '#cbd5e1', name: 'خاکستری آبی' },
  purple:   { primary: '#c084fc', secondary: '#e9d5ff', name: 'ارغوانی' },
  teal:     { primary: '#2dd4bf', secondary: '#99f6e4', name: 'فیروزه‌ای' },
  rose:     { primary: '#fb7185', secondary: '#fecdd3', name: 'گلبهی' },
  amber:    { primary: '#f59e0b', secondary: '#fcd34d', name: 'کهربایی' },
  indigo:   { primary: '#818cf8', secondary: '#a5b4fc', name: 'نیلی' },
  forest:   { primary: '#4ade80', secondary: '#86efac', name: 'سبز جنگلی' },
};

const DEFAULTS = {
  clickMode: 'double',
  dateFormat: 'jalali',
  palette: 'lavender',
  inlineTextColor: '#182e3a',
  badgeColors: { inline: {a:'#67D5ED',b:'#A5B4FC',border:'#478EBB'}, date:{a:'#93C5FD',b:'#BAE6FD',border:'#548BCB'}, remaining:{a:'#6EE7B7',b:'#A7F3D0',border:'#39A781'} },
  soonHours: 24,
  defaultNote: 'یادآوری‌ها.md',
  dailyFolder: '',        // '' = root; otherwise e.g. 'Daily'
  dailyHeading: '## یادآوری‌ها',
  tagColors: {},
  pinned: [],
  notified: {},
};

module.exports = { SIDE, DASH, TASK, STAMP, OLD, PLACE, TAG, PALETTES, DEFAULTS };
},
"src/core/tasks.js": function(module, exports, require) {
// Parse, serialize and style task *rows*, without changing hashtag styling.
const { TASK, STAMP, OLD, PLACE, TAG } = require("src/core/constants.js");
const { pad, iso, dateKey, fromISO, jalali, fromJ } = require("src/core/dates.js");
function cssColor(str) { return /^#[\da-f]{6}$/i.test(str || '') ? str : '#159f9b'; }
function parseTask(p, raw) {
    const m = TASK.exec(raw);
    if (!m)
        return null;
    const body = m[4], all = [...body.matchAll(STAMP)], stamp = all.at(-1), old = OLD.exec(body);
    let date = null, marker = null;
    if (stamp) {
        const [, j, y, mo, d, h, mi] = stamp;
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
} el.classList.add('pr-style-' + p.settings.taskStyle); }
module.exports = { cssColor, parseTask, buildTask, updateTaskPreservingText, status, tagColor, paintTask };

},
"src/core/dates.js": function(module, exports, require) {
// Date conversions are delegated to the persian-calendar plugin API.
const pad = n => String(n).padStart(2, '0');
function iso(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function dateKey(d) { return iso(d).slice(0, 10); }
function localDateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function fromISO(v) { const m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)$/.exec(v || ''); if (!m)
    return null; const [y, mo, d, h, mi] = m.slice(1).map(Number); const x = new Date(y, mo - 1, d, h, mi); return x.getFullYear() === y && x.getMonth() === mo - 1 && x.getDate() === d && x.getHours() === h && x.getMinutes() === mi ? x : null; }
function fa(p, x) { return p.api()?.toFaNumber?.(String(x)) ?? String(x).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]); }
function en(p, x) { return p.api()?.toEnNumber?.(String(x)) ?? String(x).replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))); }
function jalali(p, d) { return p.api()?.gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate()) ?? null; }
function fromJ(p, y, m, d) { const a = p.api(); if (!a)
    return null; const x = a.jalaliToDate(y, m, d); if (!(x instanceof Date) || isNaN(x.getTime()))
    return null; const j = jalali(p, x); return j && j.jy === y && j.jm === m && j.jd === d ? x : null; }
function dateFa(p, d) { const j = jalali(p, d); return j ? fa(p, `${j.jy}/${pad(j.jm)}/${pad(j.jd)}`) : fa(p, dateKey(d)); }
function clockFa(p, d) { return fa(p, `${pad(d.getHours())}:${pad(d.getMinutes())}`); }
function monthDays(p, y, m) { const first = fromJ(p, y, m, 1), next = m === 12 ? fromJ(p, y + 1, 1, 1) : fromJ(p, y, m + 1, 1); return first && next ? Math.round((Date.UTC(next.getFullYear(), next.getMonth(), next.getDate()) - Date.UTC(first.getFullYear(), first.getMonth(), first.getDate())) / 86400000) : 30; }
module.exports = { pad, iso, dateKey, localDateKey, fromISO, fa, en, jalali, fromJ, dateFa, clockFa, monthDays };
},
"src/shared/dom.js": function(module, exports, require) {
// DOM helpers shared by every Obsidian UI view.
const { setIcon } = require('obsidian');
function E(parent, tag, cls = '', text) { const n = document.createElement(tag); if (cls)
    n.className = cls; if (text !== undefined)
    n.textContent = String(text); parent.appendChild(n); return n; }
function I(parent, name, cls = '') { const n = E(parent, 'span', cls); setIcon(n, name); return n; }
function B(parent, label, glyph, cls, fn) { const b = E(parent, 'button', cls); b.type = 'button'; if (glyph)
    I(b, glyph); if (label)
    E(b, 'span', '', label); if (fn)
    b.addEventListener('click', fn); return b; }
module.exports = { E, I, B };

},
"src/editor/widgets.js": function(module, exports, require) {
// Live Preview widgets and colored-task line decorations.
const { Platform } = require('obsidian');
const { ViewPlugin, Decoration, WidgetType } = require('@codemirror/view');
const { StateEffect } = require('@codemirror/state');
const { E, I } = require("src/shared/dom.js");
const { parseTask, status, tagColor } = require("src/core/tasks.js");
const { dateFa, clockFa, fromISO } = require("src/core/dates.js");
const refreshEffect = StateEffect.define();
// Editor widget: clock for undated tasks; clickable date badge for dated tasks.
class ReminderWidget extends WidgetType {
    constructor(plugin, raw, line, mode) { super(); this.p = plugin; this.raw = raw; this.line = line; this.mode = mode; this.stampStyle = plugin.settings.stampStyle; }
    eq(other) { return this.raw === other.raw && this.line === other.line && this.mode === other.mode && this.stampStyle === other.stampStyle; }
    toDOM(cm) {
        const p = this.p, item = parseTask(p, this.raw), b = document.createElement('button');
        b.type = 'button';
        b.className = this.mode === 'date' ? 'pr-inline-date pr-style-' + p.settings.stampStyle : 'pr-inline-clock';
        if (this.mode === 'date') {
            I(b, 'calendar-clock');
            const d = fromISO(item.at);
            E(b, 'span', '', d ? `${dateFa(p, d)}  ·  ${clockFa(p, d)}` : item.marker.raw);
            b.classList.add('pr-due-' + status(p, item));
            b.title = 'ویرایش یادآوری';
        }
        else {
            I(b, 'alarm-clock');
            b.title = 'افزودن یادآوری';
        }
        const open = e => { e.preventDefault(); e.stopPropagation(); p.openFromCM(cm, this.line, this.raw); };
        b.addEventListener('click', e => { if (this.mode === 'date' || Platform.isMobile || p.settings.clickMode === 'single')
            open(e); });
        b.addEventListener('dblclick', e => { if (this.mode === 'clock' && !Platform.isMobile && p.settings.clickMode === 'double')
            open(e); });
        b.addEventListener('mousedown', e => e.stopPropagation());
        return b;
    }
    ignoreEvent() { return true; }
}
function editorExtension(p) {
    return ViewPlugin.fromClass(class {
        constructor(view) { this.decorations = this.build(view); }
        update(u) { if (u.docChanged || u.viewportChanged || u.selectionSet || u.focusChanged || u.transactions.some(t => t.effects.some(e => e.is(refreshEffect))))
            this.decorations = this.build(u.view); }
        build(view) {
            const ranges = [], seen = new Set();
            for (const r of view.visibleRanges) {
                let n = view.state.doc.lineAt(r.from).number, last = view.state.doc.lineAt(r.to).number;
                for (; n <= last; n++) {
                    if (seen.has(n))
                        continue;
                    seen.add(n);
                    const line = view.state.doc.line(n), item = parseTask(p, line.text);
                    if (!item)
                        continue;
                    const color = tagColor(p, item);
                    if (color)
                        ranges.push(Decoration.line({ attributes: { class: 'pr-task-highlight pr-style-' + p.settings.taskStyle, style: `--pr-task-color:${color};` } }).range(line.from));
                    if (item.marker) {
                        const start = line.from + item.marker.from, end = line.from + item.marker.to;
                        const selection = view.state.selection.ranges.some(s => s.from <= end && s.to >= start && s.from !== s.to || s.head >= start && s.head <= end);
                        if (!selection) {
                            ranges.push(Decoration.replace({ widget: new ReminderWidget(p, line.text, n - 1, 'date') }).range(start, end));
                        }
                    }
                    else
                        ranges.push(Decoration.widget({ widget: new ReminderWidget(p, line.text, n - 1, 'clock'), side: 1 }).range(line.to));
                }
            }
            return Decoration.set(ranges, true);
        }
    }, { decorations: v => v.decorations });
}
module.exports = { refreshEffect, editorExtension };

},
"src/ui/task-modal.js": function(module, exports, require) {
// Add/edit reminder modal; date tab and time tab.
const { Modal, Notice } = require('obsidian');
const { E, I, B } = require("src/shared/dom.js");
const { fromISO, iso, dateFa, clockFa } = require("src/core/dates.js");
const { updateTaskPreservingText } = require("src/core/tasks.js");
const { Calendar } = require("src/ui/calendar.js");
const { MaterialClock } = require("src/ui/material-clock.js");
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

},
"src/ui/calendar.js": function(module, exports, require) {
// Compact Jalali calendar and dashboard date-count markers.
const { E, B } = require("src/shared/dom.js");
const { jalali, fa, fromJ, monthDays, dateKey } = require("src/core/dates.js");
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

},
"src/ui/material-clock.js": function(module, exports, require) {
// Material-style 24-hour dial: touch/mouse/keyboard; confirm/cancel.
const { E, B } = require("src/shared/dom.js");
const { fa, en, pad } = require("src/core/dates.js");
// Material-style Persian time picker; embedded in Obsidian's native TaskModal.
// Pending values do not alter the task until "Confirm" is pressed.
class MaterialClock {
    constructor(plugin, parent, hour, minute, confirm, cancel) {
        this.p = plugin;
        this.id = Math.random().toString(36).slice(2, 11);
        this.root = E(parent, 'div', 'pr-material-clock');
        this.hour = hour;
        this.minute = minute;
        this.phase = 'hour';
        this.drag = null;
        this.confirm = confirm;
        this.cancel = cancel;
        this.render();
    }
    render() {
        const header = E(this.root, 'div', 'pr-material-header');
        const display = E(header, 'div', 'pr-material-display');
        this.hourButton = B(display, '', null, 'pr-material-hour', () => this.setPhase('hour'));
        E(display, 'span', 'pr-material-colon', ':');
        this.minuteButton = B(display, '', null, 'pr-material-minute', () => this.setPhase('minute'));
        B(header, 'زمان فعلی', 'clock-3', 'pr-material-now', () => {
            const now = new Date();
            this.hour = now.getHours();
            this.minute = now.getMinutes();
            this.setPhase('minute');
        });
        this.face = E(this.root, 'div', 'pr-material-face');
        this.face.tabIndex = 0;
        this.face.setAttribute('role', 'slider');
        this.face.setAttribute('aria-orientation', 'horizontal');
        this.face.setAttribute('aria-describedby', 'pr-material-instructions-' + this.id);
        const NS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 240 240');
        svg.setAttribute('class', 'pr-material-svg');
        svg.setAttribute('aria-hidden', 'true');
        this.face.appendChild(svg);
        const makeSVG = (name, cls, attrs) => {
            const x = document.createElementNS(NS, name);
            x.setAttribute('class', cls);
            Object.entries(attrs).forEach(([k, v]) => x.setAttribute(k, String(v)));
            svg.appendChild(x);
            return x;
        };
        makeSVG('circle', 'pr-material-ring-outer', { cx: 120, cy: 120, r: 100 });
        makeSVG('circle', 'pr-material-ring-inner', { cx: 120, cy: 120, r: 67 });
        this.hand = makeSVG('line', 'pr-material-hand', { x1: 120, y1: 120, x2: 120, y2: 33 });
        this.knob = makeSVG('circle', 'pr-material-knob', { cx: 120, cy: 33, r: 15 });
        makeSVG('circle', 'pr-material-center', { cx: 120, cy: 120, r: 4 });
        this.numbers = E(this.face, 'div', 'pr-material-numbers');
        const manual = E(this.root, 'div', 'pr-material-manual');
        const hLabel = E(manual, 'label', 'pr-material-input-label');
        E(hLabel, 'span', '', 'ساعت');
        this.hourInput = E(hLabel, 'input', 'pr-material-input');
        const mLabel = E(manual, 'label', 'pr-material-input-label');
        E(mLabel, 'span', '', 'دقیقه');
        this.minuteInput = E(mLabel, 'input', 'pr-material-input');
        for (const [input, key, max] of [
            [this.hourInput, 'hour', 23],
            [this.minuteInput, 'minute', 59]
        ]) {
            input.type = 'text';
            input.inputMode = 'numeric';
            input.maxLength = 2;
            input.setAttribute('aria-label', key === 'hour' ? 'ساعت از صفر تا بیست‌وسه' : 'دقیقه از صفر تا پنجاه‌ونه');
            input.addEventListener('focus', () => this.setPhase(key));
            input.addEventListener('change', () => {
                const n = Number(en(this.p, input.value.trim()));
                if (Number.isInteger(n) && n >= 0 && n <= max)
                    this[key] = n;
                this.sync();
            });
        }
        this.instructions = E(this.root, 'div', 'pr-material-instructions', 'با لمس صفحه یا کلیدهای جهت‌دار زمان را تنظیم کنید.');
        this.instructions.id = 'pr-material-instructions-' + this.id;
        const actions = E(this.root, 'div', 'pr-material-actions');
        B(actions, 'لغو', null, 'pr-material-cancel', () => this.cancel());
        B(actions, 'تأیید', 'check', 'pr-material-confirm', () => this.accept());
        this.face.addEventListener('pointerdown', e => this.start(e));
        this.face.addEventListener('pointermove', e => this.move(e));
        this.face.addEventListener('pointerup', e => this.end(e, false));
        this.face.addEventListener('pointercancel', e => this.end(e, true));
        this.face.addEventListener('lostpointercapture', () => { this.drag = null; });
        this.face.addEventListener('keydown', e => this.keyDown(e));
        this.sync();
    }
    setPhase(phase) {
        if (this.drag !== null)
            return;
        this.phase = phase;
        this.sync();
    }
    point(e) {
        const rect = this.face.getBoundingClientRect();
        // Normalizing both axes prevents distortion at mobile zoom levels.
        const x = (e.clientX - rect.left) * 240 / rect.width - 120;
        const y = (e.clientY - rect.top) * 240 / rect.height - 120;
        return { radius: Math.hypot(x, y), angle: (Math.atan2(x, -y) + Math.PI * 2) % (Math.PI * 2) };
    }
    applyPoint(e) {
        const { radius, angle } = this.point(e);
        if (radius < 14)
            return;
        if (this.phase === 'hour') {
            const index = Math.round(angle * 12 / (2 * Math.PI)) % 12;
            const outer = radius >= 74;
            this.hour = outer ? (index === 0 ? 12 : index) : (index === 0 ? 0 : index + 12);
        }
        else {
            this.minute = Math.round(angle * 60 / (2 * Math.PI)) % 60;
        }
        this.sync();
    }
    start(e) {
        if (this.drag !== null || (e.pointerType === 'mouse' && e.button !== 0))
            return;
        e.preventDefault();
        this.drag = e.pointerId;
        this.backup = { hour: this.hour, minute: this.minute, phase: this.phase };
        try {
            this.face.setPointerCapture(e.pointerId);
        }
        catch { }
        this.applyPoint(e);
    }
    move(e) {
        if (this.drag !== e.pointerId)
            return;
        e.preventDefault();
        this.applyPoint(e);
    }
    end(e, cancelled) {
        if (this.drag !== e.pointerId)
            return;
        e.preventDefault();
        if (!cancelled)
            this.applyPoint(e);
        this.drag = null;
        try {
            if (this.face.hasPointerCapture(e.pointerId))
                this.face.releasePointerCapture(e.pointerId);
        }
        catch { }
        if (cancelled) {
            this.hour = this.backup.hour;
            this.minute = this.backup.minute;
            this.phase = this.backup.phase;
            this.sync();
        }
        else if (this.phase === 'hour') {
            this.setPhase('minute');
        }
        this.face.focus({ preventScroll: true });
    }
    keyDown(e) {
        const keys = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown', 'Enter', 'Escape'];
        if (!keys.includes(e.key))
            return;
        e.preventDefault();
        if (e.key === 'Escape')
            return this.cancel();
        if (e.key === 'Enter')
            return this.phase === 'hour' ? this.setPhase('minute') : this.accept();
        const max = this.phase === 'hour' ? 24 : 60;
        const current = this[this.phase];
        let next = current;
        if (e.key === 'Home')
            next = 0;
        else if (e.key === 'End')
            next = max - 1;
        else {
            const step = e.key.startsWith('Page') ? 5 : 1;
            const forward = ['ArrowRight', 'ArrowUp', 'PageUp'].includes(e.key);
            next = (current + (forward ? step : -step) + max) % max;
        }
        this[this.phase] = next;
        this.sync();
    }
    accept() {
        // Only this callback commits pending time changes to TaskModal.
        this.confirm(this.hour, this.minute);
    }
    renderNumbers() {
        this.numbers.replaceChildren();
        const hourMode = this.phase === 'hour';
        const entries = hourMode
            ? [
                ...Array.from({ length: 12 }, (_, i) => ({ value: i + 1, index: (i + 1) % 12, r: 101 })),
                ...Array.from({ length: 12 }, (_, i) => ({ value: (i + 13) % 24, index: (i + 1) % 12, r: 66 }))
            ]
            : Array.from({ length: 12 }, (_, i) => ({ value: i * 5, index: i, r: 101 }));
        for (const entry of entries) {
            const angle = entry.index * Math.PI / 6;
            const label = E(this.numbers, 'span', 'pr-material-number', fa(this.p, pad(entry.value)));
            label.style.left = `${50 + Math.sin(angle) * entry.r * 100 / 240}%`;
            label.style.top = `${50 - Math.cos(angle) * entry.r * 100 / 240}%`;
            if (hourMode && this.hour === entry.value || !hourMode && this.minute === entry.value)
                label.classList.add('is-selected');
            if (hourMode && entry.r === 66)
                label.classList.add('is-inner');
        }
    }
    sync() {
        this.hourButton.textContent = fa(this.p, pad(this.hour));
        this.minuteButton.textContent = fa(this.p, pad(this.minute));
        this.hourButton.classList.toggle('is-active', this.phase === 'hour');
        this.minuteButton.classList.toggle('is-active', this.phase === 'minute');
        this.hourButton.setAttribute('aria-pressed', String(this.phase === 'hour'));
        this.minuteButton.setAttribute('aria-pressed', String(this.phase === 'minute'));
        this.hourInput.value = fa(this.p, pad(this.hour));
        this.minuteInput.value = fa(this.p, pad(this.minute));
        const hourMode = this.phase === 'hour';
        const value = hourMode ? this.hour : this.minute;
        const angle = hourMode ? (value % 12) * Math.PI / 6 : value * Math.PI / 30;
        const distance = hourMode ? (value === 0 || value > 12 ? 66 : 101) : 101;
        this.hand.setAttribute('x2', String(120 + Math.sin(angle) * distance));
        this.hand.setAttribute('y2', String(120 - Math.cos(angle) * distance));
        this.knob.setAttribute('cx', String(120 + Math.sin(angle) * distance));
        this.knob.setAttribute('cy', String(120 - Math.cos(angle) * distance));
        this.face.setAttribute('aria-label', hourMode ? 'انتخاب ساعت، حلقه بیرونی ۱ تا ۱۲ و حلقه داخلی ۱۳ تا ۰۰' : 'انتخاب دقیقه از صفر تا پنجاه‌ونه');
        this.face.setAttribute('aria-valuemin', '0');
        this.face.setAttribute('aria-valuemax', hourMode ? '23' : '59');
        this.face.setAttribute('aria-valuenow', String(value));
        this.face.setAttribute('aria-valuetext', fa(this.p, pad(value)));
        this.renderNumbers();
    }
    destroy() {
        if (this.drag !== null) {
            try {
                if (this.face.hasPointerCapture(this.drag))
                    this.face.releasePointerCapture(this.drag);
            }
            catch { }
        }
        this.drag = null;
        this.root.remove();
    }
}
module.exports = { MaterialClock };

},
"src/views/sidebar.js": function(module, exports, require) {
// Sidebar filters, search, and completed-task section.
const { ItemView } = require('obsidian');
const { SIDE } = require("src/core/constants.js");
const { E, B } = require("src/shared/dom.js");
const { fa, dateKey } = require("src/core/dates.js");
const { status } = require("src/core/tasks.js");
const { empty, taskCard } = require("src/ui/task-card.js");
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

},
"src/ui/task-card.js": function(module, exports, require) {
// Task cards shared by sidebar/dashboard + remaining-time badges.
const { E, I, B } = require("src/shared/dom.js");
const { TASK } = require("src/core/constants.js");
const { fromISO, fa, dateFa, clockFa } = require("src/core/dates.js");
const { status, paintTask } = require("src/core/tasks.js");
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

},
"src/views/dashboard.js": function(module, exports, require) {
// Dashboard: daily tasks on the right, calendar on the left, saved filters.
const { ItemView } = require('obsidian');
const { DASH } = require("src/core/constants.js");
const { E, I, B } = require("src/shared/dom.js");
const { fa, dateKey, dateFa } = require("src/core/dates.js");
const { status } = require("src/core/tasks.js");
const { empty, taskCard } = require("src/ui/task-card.js");
const { Calendar } = require("src/ui/calendar.js");
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

},
"src/settings.js": function(module, exports, require) {
// Settings: palette swatches, tag-to-task coloring, daily-note folder, notification window.
const { PluginSettingTab, Setting, Notice } = require('obsidian');
const { PALETTES, DEFAULTS } = require("src/core/constants.js");
const { fa } = require("src/core/dates.js");

class SettingsTab extends PluginSettingTab {
    constructor(app, p) { super(app, p); this.p = p; }

    display() {
        const p = this.p, root = this.containerEl;
        root.empty();
        root.addClass('pr-settings');
        root.createEl('h2', { text: 'تنظیمات یادآوری فارسی' });

        const section = (title, hint, open = false) => {
            const box = root.createEl('details', { cls: 'pr-settings-section' });
            if (open) box.open = true;
            const summary = box.createEl('summary', { cls: 'pr-settings-summary' });
            summary.createEl('span', { text: title });
            if (hint) summary.createEl('small', { text: hint });
            return box.createEl('div', { cls: 'pr-settings-section-body' });
        };
        const behavior = section('رفتار یادآوری', 'کلیک، تاریخ و کارهای نزدیک');
        // --- رفتار ---
        new Setting(behavior).setName('بازکردن ساعت').setDesc('برچسب تاریخ همیشه با یک کلیک باز می‌شود').addDropdown(d => d.addOption('single', 'یک کلیک').addOption('double', 'دوبار کلیک').setValue(p.settings.clickMode).onChange(async (v) => { p.settings.clickMode = v; await p.persist(); }));

        new Setting(behavior).setName('ذخیره تاریخ').addDropdown(d => d.addOption('jalali', 'شمسی (@j:...)').addOption('gregorian', 'میلادی (@...)').setValue(p.settings.dateFormat).onChange(async (v) => { p.settings.dateFormat = v; await p.persist(); }));

        const slider = new Setting(behavior).setName('محدودهٔ کارهای نزدیک').setDesc('زمان باقی‌مانده تا یادآوری، بر حسب ساعت');
        const desc = slider.descEl.createSpan({ text: ' — ' + fa(p, p.settings.soonHours) + ' ساعت' });
        slider.addSlider(s => { s.setLimits(1, 168, 1).setValue(p.settings.soonHours).onChange(async (v) => { p.settings.soonHours = v; desc.textContent = ' — ' + fa(p, v) + ' ساعت'; await p.persist(); p.refresh(); }); if (s.sliderEl) {
            s.sliderEl.dir = 'ltr';
            s.sliderEl.style.direction = 'ltr';
        } });

        // --- مقصد یادداشت روز ---
        const daily = section('یادداشت‌های روزانه', 'مسیر ذخیره و عنوان بخش');
        daily.createEl('p', { text: 'تسک‌های دارای تاریخ به‌طور خودکار در یادداشت همان روز (میلادی) ذخیره می‌شوند. تسک‌های بدون تاریخ به یادداشت پیش‌فرض می‌روند.', cls: 'pr-setting-help' });

        new Setting(daily).setName('پوشهٔ یادداشت‌های روز').setDesc('خالی = ریشهٔ ولت. مثال: Daily').addText(t => t.setPlaceholder('Daily').setValue(p.settings.dailyFolder).onChange(async (v) => { p.settings.dailyFolder = v.trim().replace(/^\/+|\/+$/g, ''); await p.persist(); }));

        new Setting(daily).setName('عنوان بخش').setDesc('تسک‌ها زیر این عنوان اضافه می‌شوند').addText(t => t.setPlaceholder('## یادآوری‌ها').setValue(p.settings.dailyHeading).onChange(async (v) => { p.settings.dailyHeading = v.trim() || '## یادآوری‌ها'; await p.persist(); }));

        new Setting(daily).setName('یادداشت پیش‌فرض (بدون تاریخ)').addText(t => t.setValue(p.settings.defaultNote).onChange(async (v) => { p.settings.defaultNote = v.trim() || 'یادآوری‌ها.md'; await p.persist(); }));

        // Appearance: one compact accent selector and three independently configurable badges.
        const appearance = section('رنگ اصلی افزونه', 'رنگ ملایم کارت‌ها و کنترل‌ها');
        appearance.createEl('p', { text: 'رنگ انتخابی با شدت ملایم روی همه کارت‌ها اعمال می‌شود؛ رنگ اختصاصی کارت‌های هشتگ‌دار اولویت دارد.', cls: 'pr-setting-help' });
        const swatchWrap = appearance.createEl('div', { cls: 'pr-accent-grid', attr: { role: 'group', 'aria-label': 'انتخاب رنگ اصلی' } });
        for (const [key, pal] of Object.entries(PALETTES)) {
            const btn = swatchWrap.createEl('button', { cls: 'pr-accent-option' + (p.settings.palette === key ? ' is-active' : '') });
            btn.type = 'button'; btn.title = pal.name; btn.setAttribute('aria-label', pal.name);
            btn.setAttribute('aria-pressed', String(p.settings.palette === key));
            const dot = btn.createEl('span', { cls: 'pr-accent-dot' });
            dot.style.background = `linear-gradient(135deg,${pal.primary},${pal.secondary})`;
            btn.createEl('span', { cls: 'pr-accent-name', text: pal.name });
            btn.addEventListener('click', async () => {
                p.settings.palette = key; await p.persist(); p.applyTheme();
                swatchWrap.querySelectorAll('.pr-accent-option').forEach(el => {
                    el.classList.remove('is-active'); el.setAttribute('aria-pressed', 'false');
                });
                btn.classList.add('is-active'); btn.setAttribute('aria-pressed', 'true');
            });
        }
        const presets = [
            ['اقیانوسی','#67D5ED','#A5B4FC','#438FBF'],
            ['نعنایی','#6EE7B7','#A7F3D0','#299E76'],
            ['اسطوخودوسی','#C4B5FD','#F0ABFC','#9B68C8'],
            ['هلویی','#FDBA74','#FBCFE8','#CE8648'],
            ['رز','#FDA4AF','#F9A8D4','#C96A8D'],
            ['آسمانی','#93C5FD','#BAE6FD','#5D95CF']
        ];
        p.settings.badgeColors ||= {};
        const badges = section('رنگ برچسب‌های تاریخ', 'سه نوع برچسب با تنظیم مستقل');
        for (const [type, title, example] of [
            ['inline','داخل یادداشت','۱۴۰۵/۰۸/۰۴ · ۱۵:۳۰'],
            ['date','تاریخ سایدبار و داشبورد','۱۴۰۵/۰۸/۰۴'],
            ['remaining','زمان باقی‌مانده','۷۲ روز دیگر']
        ]) {
            const item = badges.createEl('details', { cls: 'pr-badge-editor' });
            const summary = item.createEl('summary', { cls: 'pr-badge-editor-title' });
            summary.createEl('span', { text: title });
            const pill = summary.createEl('span', { cls: 'pr-preview-pill', text: example });
            const controls = item.createEl('div', { cls: 'pr-badge-controls' });
            const initial = {...DEFAULTS.badgeColors[type], ...(p.settings.badgeColors[type] || {})};
            const pickers = {};
            const paint = () => {
                const v = {...DEFAULTS.badgeColors[type], ...(p.settings.badgeColors[type] || {})};
                pill.style.background = `linear-gradient(125deg,${v.a},${v.b})`;
                pill.style.borderColor = v.border;
            };
            paint();
            const grid = controls.createEl('div', { cls: 'pr-mini-palette-grid' });
            for (const [name,a,b,border] of presets) {
                const btn = grid.createEl('button', { cls: 'pr-mini-palette' });
                btn.type = 'button'; btn.title = name; btn.setAttribute('aria-label', name);
                btn.style.background = `linear-gradient(125deg,${a},${b})`;
                btn.style.borderColor = border;
                btn.createEl('span', { text: name });
                btn.onclick = async () => {
                    p.settings.badgeColors[type] = {a,b,border};
                    await p.persist(); p.applyTheme(); paint();
                    for (const field of ['a','b','border']) pickers[field]?.setValue(p.settings.badgeColors[type][field]);
                };
            }
            for (const [field,label] of [['a','رنگ اول'],['b','رنگ دوم'],['border','حاشیه']]) {
                new Setting(controls).setName(label).addColorPicker(cp => {
                    pickers[field] = cp;
                    cp.setValue(initial[field]).onChange(async hex => {
                        p.settings.badgeColors[type] ||= {...initial};
                        p.settings.badgeColors[type][field] = hex;
                        await p.persist(); p.applyTheme(); paint();
                    });
                });
            }
        }
        new Setting(badges).setName('رنگ متن تاریخ داخل یادداشت').setDesc('برای برچسب‌های روشن، رنگ تیره خواناتر است.').addColorPicker(cp => cp.setValue(p.settings.inlineTextColor || DEFAULTS.inlineTextColor).onChange(async value => { p.settings.inlineTextColor = value; await p.persist(); p.applyTheme(); }));
        // --- رنگ هشتگ‌ها ---
        const tags = section('رنگ کارت‌ها بر اساس هشتگ', 'رنگ اختصاصی کارت تسک‌ها');
        tags.createEl('p', { text: 'فقط هشتگ‌هایی که دستی ثبت می‌کنی، ردیف تسک را رنگی می‌کنند. خود هشتگ هیچ رنگ یا استایلی از این افزونه نمی‌گیرد.', cls: 'pr-setting-help' });

        let tagInput;
        new Setting(tags).setName('افزودن هشتگ').addText(t => { tagInput = t; t.setPlaceholder('مثلاً مهم'); }).addButton(b => b.setButtonText('افزودن').setCta().onClick(async () => { const name = tagInput.getValue().trim().replace(/^#/, ''); if (!/^[\p{L}\p{N}_-]+$/u.test(name)) {
            new Notice('نام هشتگ معتبر نیست');
            return;
        } if (!(name in p.settings.tagColors))
            p.settings.tagColors[name] = PALETTES[p.settings.palette]?.primary || '#a78bfa'; await p.persist(); this.display(); p.refresh(); p.requestEditorUpdate(); }));

        for (const tag of Object.keys(p.settings.tagColors)) {
            new Setting(tags).setName('#' + tag).addColorPicker(c => c.setValue(p.settings.tagColors[tag]).onChange(async (v) => { p.settings.tagColors[tag] = v; await p.persist(); p.refresh(); p.requestEditorUpdate(); })).addExtraButton(b => b.setIcon('trash').setTooltip('حذف رنگ هشتگ').onClick(async () => { delete p.settings.tagColors[tag]; await p.persist(); this.display(); p.refresh(); p.requestEditorUpdate(); }));
        }
    }
}
module.exports = { SettingsTab };
}
};
const __prCache = Object.create(null);
function __prRequire(id) {
  if (!Object.prototype.hasOwnProperty.call(__prModules, id)) return __prNativeRequire(id);
  if (__prCache[id]) return __prCache[id].exports;
  const record = { exports: {} };
  __prCache[id] = record;
  __prModules[id](record, record.exports, __prRequire);
  return record.exports;
}
module.exports = __prRequire("src/main.js");
