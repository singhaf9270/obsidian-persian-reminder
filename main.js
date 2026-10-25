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
const { dailyNotePath, dailyOptions, notePath, appendLine, insertDailyTask, createDailyFromTemplate, withNoteWrite } = require("src/core/daily-notes.js");
const { refreshEffect, editorExtension } = require("src/editor/widgets.js");
const { TaskModal } = require("src/ui/task-modal.js");
const { ReminderAlert } = require("src/ui/reminder-alert.js");
const { ReminderScheduler, reminderKey, pendingReminders } = require("src/core/reminders.js");
const { gradientAngle, cardTint, contrastText } = require("src/core/appearance.js");
const { Sidebar } = require("src/views/sidebar.js");
const { Dashboard } = require("src/views/dashboard.js");
const { SettingsTab } = require("src/settings.js");
module.exports = class PersianReminder extends Plugin {
    async onload() {
        this.settings = { ...DEFAULTS, ...await this.loadData() };
        this.settings.tagColors = { ...(this.settings.tagColors || {}) };
        this.settings.pinned ||= [];
        this.settings.notified = { ...(this.settings.notified || {}) };
        this.settings.remainingRules = (this.settings.remainingRules || DEFAULTS.remainingRules).map(rule => ({ ...rule }));
        this.settings.remainingColors = Object.fromEntries(Object.keys(DEFAULTS.remainingColors).map(key =>
            [key, { ...DEFAULTS.remainingColors[key], ...(this.settings.remainingColors?.[key] || {}) }]));
        this.index = new Map();
        this.scanSerial = new Map();
        this.scanTimers = new Map();
        this.unloading = false;
        this.scheduler = new ReminderScheduler(this);
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
        const resume = () => { if (!document.hidden) this.scheduler.wake(true); };
        this.registerDomEvent(document, 'visibilitychange', resume);
        this.registerDomEvent(window, 'focus', resume);
        this.registerDomEvent(window, 'pageshow', resume);
        this.app.workspace.onLayoutReady(async () => {
            if (this.unloading) return;
            await this.scheduler.start();
            if (!this.api()) new Notice('برای تقویم شمسی افزونه Persian Calendar را فعال کنید');
        });
    }
    onunload() { this.unloading = true; this.scheduler?.stop(); this.alertModal?.close(); for (const timer of this.scanTimers.values())
        window.clearTimeout(timer); this.app.workspace.detachLeavesOfType(SIDE); this.app.workspace.detachLeavesOfType(DASH); ['--pr-gradient-angle', '--pr-card-tint', '--pr-accent-color', '--pr-inline-text-color', '--pr-clock-color', '--pr-stamp-color', '--pr-soon-color', '--pr-overdue-color', ...['inline','date','remaining'].flatMap(t => ['a','b','border','text'].map(k => `--pr-${t}-${k}`))].forEach(v => document.body.style.removeProperty(v)); }
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
            if (type !== 'inline') vars[`--pr-${type}-text`] = contrastText(v.a, v.b);
        }
        for (const [key, value] of Object.entries(vars)) document.body.style.setProperty(key, cssColor(value));
        document.body.style.setProperty('--pr-gradient-angle', gradientAngle(this.settings) + 'deg');
        document.body.style.setProperty('--pr-card-tint', cardTint(this.settings) + '%');
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
    dailyDestination(date) { return dailyNotePath(this, date); }
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
        arr.push({ ...it, path, line }); }); this.index.set(path, arr); this.scheduler?.wake(); if (refresh)
        this.refresh(); }
    items() { return [...this.index.values()].flat().sort((a, b) => Number(a.done) - Number(b.done) || a.at.localeCompare(b.at)); }
    refresh() { for (const type of [SIDE, DASH])
        for (const leaf of this.app.workspace.getLeavesOfType(type)) {
            if (leaf.view.refresh) leaf.view.refresh();
            else leaf.view.render?.();
        } }
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
    async add(path, values, options = {}) {
        try {
            const date = fromISO(values.at);
            const target = options.daily ? this.dailyDestination(date) : notePath(path || this.settings.defaultNote);
            const line = buildTask(this, null, values);
            const insert = source => options.daily
                ? insertDailyTask(source, line, dailyOptions(this).heading) : appendLine(source, line);
            return await withNoteWrite(this, target, async () => {
                let file = this.app.vault.getAbstractFileByPath(target);
                let alreadyInserted = false;
                if (!file) {
                    const parts = target.split('/');
                    for (let i = 1; i < parts.length; i++) {
                        const folder = parts.slice(0, i).join('/');
                        if (!this.app.vault.getAbstractFileByPath(folder)) {
                            try { await this.app.vault.createFolder(folder); }
                            catch (error) {
                                const existing = this.app.vault.getAbstractFileByPath(folder);
                                if (!existing || existing instanceof TFile) throw error;
                            }
                        }
                    }
                    if (options.daily && this.settings.dailyUseTemplater) {
                        file = await createDailyFromTemplate(this, target);
                    } else {
                        file = await this.app.vault.create(target, insert(''));
                        alreadyInserted = true;
                    }
                }
                if (!(file instanceof TFile)) { new Notice('مسیر، فایل Markdown نیست'); return false; }
                if (!alreadyInserted) {
                    const view = this.editor(file.path);
                    if (view) {
                        const ed = view.editor, source = ed.getValue(), next = insert(source);
                        let at = 0;
                        while (at < source.length && source[at] === next[at]) at++;
                        let end = source.length, nextEnd = next.length;
                        while (end > at && nextEnd > at && source[end - 1] === next[nextEnd - 1]) { end--; nextEnd--; }
                        ed.replaceRange(next.slice(at, nextEnd), ed.offsetToPos(at), ed.offsetToPos(end));
                        this.indexText(file.path, ed.getValue());
                        return true;
                    }
                    await this.app.vault.process(file, insert);
                }
                await this.scan(file);
                return true;
            });
        } catch (error) {
            console.error(error); new Notice('خطا در افزودن کار: ' + error.message); return false;
        }
    }
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
    showAlerts(items, preview = false) {
        if (this.unloading) return;
        if (preview) return new ReminderAlert(this, items, true).open();
        if (this.alertModal) this.alertModal.enqueue(items);
        else {
            const modal = new ReminderAlert(this, items);
            this.alertModal = modal;
            try { modal.open(); }
            catch (error) { this.alertModal = null; throw error; }
        }
    }
    async notify() {
        if (this.notifying || this.unloading || this.settings.notificationMode === 'off') return;
        // Hidden WebViews must not mark unseen dialogs as delivered.
        if (typeof document !== 'undefined' && document.hidden) return;
        this.notifying = true;
        try {
            const now = Date.now();
            const due = pendingReminders(this, now).filter(item => fromISO(item.at).getTime() <= now);
            if (!due.length) return;
            if (this.settings.notificationMode === 'notice') {
                for (const item of due) new Notice('⏰ ' + item.title + (item.place ? '\n📍 ' + item.place : ''), 10000);
            } else this.showAlerts(due);
            // Record delivery only after the alert has actually opened.
            for (const item of due) this.settings.notified[reminderKey(item)] = now;
            this.settings.notified = Object.fromEntries(Object.entries(this.settings.notified)
                .filter(([, time]) => Number(time) >= now - 7 * 86400000));
            await this.persist();
        } catch (error) { console.error('[Persian Reminder notify]', error); }
        finally { this.notifying = false; }
    }
};


},
"src/core/constants.js": function(module, exports, require) {
// Plugin identifiers, task syntax, palettes and default settings.
const SIDE = 'persian-reminder-sidebar', DASH = 'persian-reminder-dashboard';
const TASK = /^(\s*(?:[-*+]|\d+[.)])\s+\[)([ xX])(\]\s*)(.*)$/;
const STAMP = /\(@(j:)?([0-9۰-۹٠-٩]{4})-([0-9۰-۹٠-٩]{2})-([0-9۰-۹٠-٩]{2})\s+([0-9۰-۹٠-٩]{2}):([0-9۰-۹٠-٩]{2})\)/g;
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
  taskStyle: 'soft',
  stampStyle: 'soft',
  inlineTextColor: '#182e3a',
  badgeColors: { inline: {a:'#67D5ED',b:'#A5B4FC',border:'#478EBB'}, date:{a:'#93C5FD',b:'#BAE6FD',border:'#548BCB'}, remaining:{a:'#6EE7B7',b:'#A7F3D0',border:'#39A781'} },
  gradientAngle: 120,
  cardTint: 10,
  remainingRulesEnabled: true,
  remainingColors: {
    today: { a: '#FCD34D', b: '#FDE68A', border: '#D5A42B' },
    overdue: { a: '#FDA4AF', b: '#FECDD3', border: '#D37888' },
    done: { a: '#CBD5E1', b: '#E2E8F0', border: '#94A3B8' }
  },
  remainingRules: [
    { id: 'one-day', days: 1, enabled: true, a: '#FDBA74', b: '#FED7AA', border: '#D99550' },
    { id: 'one-week', days: 7, enabled: true, a: '#93C5FD', b: '#BAE6FD', border: '#548BCB' }
  ],
  dailyUseTemplater: false,
  dailyTemplatePath: '',
  soonHours: 24,
  notificationMode: 'modal',
  snoozeMinutes: 10,
  defaultNote: 'یادآوری‌ها.md',
  dailyFolder: '',        // '' = root; otherwise e.g. 'Daily'
  dailyHeading: '## یادآوری‌ها',
  dailyCalendar: 'gregorian',
  dailyFormat: 'YYYY-MM-DD',
  dailyUseCore: false,
  tagColors: {},
  pinned: [],
  notified: {},
};

module.exports = { SIDE, DASH, TASK, STAMP, OLD, PLACE, TAG, PALETTES, DEFAULTS };


},
"src/core/tasks.js": function(module, exports, require) {
// Parse, serialize and style task *rows*, without changing hashtag styling.
const { TASK, STAMP, OLD, PLACE, TAG } = require("src/core/constants.js");
const { pad, iso, dateKey, fromISO, jalali, fromJ, en } = require("src/core/dates.js");
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
function en(p, x) { return String(p.api()?.toEnNumber?.(String(x)) ?? x).replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))); }
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
function E(parent, tag, cls = '', text) { const n = (parent.ownerDocument || document).createElement(tag); if (cls)
    n.className = cls; if (text !== undefined)
    n.textContent = String(text); parent.appendChild(n); return n; }
function I(parent, name, cls = '') { const n = E(parent, 'span', cls); setIcon(n, name); return n; }
function B(parent, label, glyph, cls, fn) { const b = E(parent, 'button', cls); b.type = 'button'; if (glyph)
    I(b, glyph); if (label)
    E(b, 'span', '', label); if (fn)
    b.addEventListener('click', fn); return b; }
module.exports = { E, I, B };


},
"src/core/daily-notes.js": function(module, exports, require) {
// Resolve the selected day's note without consulting the active editor.
const { moment } = require('obsidian');
const { jalali, pad, en } = require("src/core/dates.js");

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
const { Modal, Notice } = require('obsidian');
const { E, I, B } = require("src/shared/dom.js");
const { fromISO, iso, dateFa, clockFa } = require("src/core/dates.js");
const { updateTaskPreservingText } = require("src/core/tasks.js");
const { Calendar } = require("src/ui/calendar.js");
const { MaterialClock } = require("src/ui/material-clock.js");
const { watchKeyboard } = require("src/ui/keyboard-viewport.js");

class TaskModal extends Modal {
    constructor(p, item = null, initial = null, tab = 'date') {
        super(p.app);
        this.p = p;
        this.item = item;
        this.date = item?.at ? fromISO(item.at) : new Date(Date.now() + 3600000);
        if (!this.date) this.date = new Date();
        this.hour = this.date.getHours();
        this.minute = this.date.getMinutes();
        if (initial) {
            const day = new Date(initial);
            // The panel supplies a day, not midnight as the reminder time.
            this.date = new Date(day.getFullYear(), day.getMonth(), day.getDate(), this.hour, this.minute);
        }
        this.tab = tab;
        this.useDaily = !item && !!initial;
        this.destination = item?.path || p.destination();
        this.saving = false;
    }
    onOpen() {
        this.modalEl.addClass('pr-modal');
        this.modalEl.setAttribute('aria-label', this.item ? 'ویرایش کار و یادآوری' : 'افزودن کار');
        const root = this.contentEl;
        root.replaceChildren();
        const header = E(root, 'div', 'pr-modal-header');
        I(header, this.item ? 'calendar-clock' : 'plus-circle');
        const heading = E(header, 'div');
        E(heading, 'strong', '', this.item ? 'ویرایش یادآوری' : 'یک کار تازه');
        E(heading, 'small', '', 'جزئیات، روز و ساعت را مشخص کنید');
        this.body = E(root, 'div', 'pr-modal-body');
        const field = (parent, label, value, placeholder) => {
            const wrap = E(parent, 'label', 'pr-field');
            E(wrap, 'span', '', label);
            const input = E(wrap, 'input', 'pr-input');
            input.type = 'text';
            input.value = value || '';
            input.placeholder = placeholder || '';
            input.autocomplete = 'off';
            input.dir = 'auto';
            return input;
        };
        this.titleInput = field(this.body, 'عنوان کار', this.item?.title, 'چه کاری می‌خواهید انجام دهید؟');
        const details = E(this.body, 'details', 'pr-details');
        details.open = !!(this.item?.place || this.item?.tags.length);
        E(details, 'summary', '', 'مکان و هشتگ‌ها');
        const inner = E(details, 'div', 'pr-detail-fields');
        this.placeInput = field(inner, 'مکان', this.item?.place, 'مثلاً مدرسه');
        this.tagsInput = field(inner, 'هشتگ‌ها', this.item?.tags.join(' '), '#مهم #مدرسه');
        this.tagsInput.spellcheck = false;
        E(inner, 'small', 'pr-field-hint', 'هشتگ‌ها را با فاصله یا ویرگول جدا کنید.');
        const tabs = E(this.body, 'div', 'pr-modal-tabs');
        tabs.setAttribute('role', 'tablist');
        tabs.setAttribute('aria-label', 'انتخاب تاریخ و ساعت');
        this.tabDate = B(tabs, 'انتخاب روز', 'calendar-days', 'pr-modal-tab', () => this.switchTab('date'));
        this.tabTime = B(tabs, 'انتخاب ساعت', 'clock-3', 'pr-modal-tab', () => this.switchTab('time'));
        this.panel = E(this.body, 'div', 'pr-picker-panel');
        this.panel.setAttribute('role', 'tabpanel');
        this.switchTab(this.tab);
        if (!this.item) {
            const destination = E(this.body, 'div', 'pr-destination-field');
            const toggle = E(destination, 'label', 'pr-daily-toggle');
            this.dailyToggle = E(toggle, 'input');
            this.dailyToggle.type = 'checkbox';
            this.dailyToggle.checked = this.useDaily;
            E(toggle, 'span', '', 'ذخیره در یادداشت روز انتخاب‌شده');
            this.pathInput = field(destination, 'یادداشت مقصد', this.destination, 'کارها.md');
            this.pathInput.classList.add('pr-path-input');
            this.dailyToggle.addEventListener('change', () => {
                if (!this.useDaily) this.destination = this.pathInput.value;
                this.useDaily = this.dailyToggle.checked;
                this.updateDestination();
            });
            this.pathHint = E(destination, 'small', 'pr-field-hint');
            this.updateDestination();
        }
        const footer = E(root, 'div', 'pr-modal-footer');
        this.summary = E(footer, 'div', 'pr-selected-datetime');
        this.updateSummary();
        const actions = E(footer, 'div', 'pr-modal-actions');
        if (this.item) this.deleteButton = B(actions, 'حذف یادآوری', 'trash-2', 'pr-danger-btn', async () => {
            if (this.saving) return;
            this.setSaving(true);
            try {
                if (await this.p.remove(this.item)) { new Notice('یادآوری حذف شد'); this.close(); }
            } finally { this.setSaving(false); }
        });
        E(actions, 'span', 'pr-spacer');
        B(actions, 'انصراف', null, 'pr-cancel-btn', () => this.close());
        this.saveButton = B(actions, 'ذخیره', 'check', 'pr-save-btn', () => this.save());
        this.stopWatching = watchKeyboard(this, this.body);
    }
    updateDestination() {
        if (!this.pathInput) return;
        this.pathInput.readOnly = this.useDaily;
        try {
            this.pathInput.value = this.useDaily ? this.p.dailyDestination(this.date) : this.destination;
            this.pathHint.textContent = this.useDaily
                ? 'با تغییر روز، مقصد هم تغییر می‌کند. قالب نام و پوشه در تنظیمات افزونه است.'
                : 'مسیر یک یادداشت داخل ولت؛ یادداشت جدید در صورت نیاز ساخته می‌شود.';
            this.pathInput.removeAttribute('aria-invalid');
        } catch (error) {
            this.pathHint.textContent = error.message;
            this.pathInput.setAttribute('aria-invalid', 'true');
        }
    }
    switchTab(tab, discardTime = false) {
        if (this.timePicker && !discardTime) {
            this.hour = this.timePicker.hour;
            this.minute = this.timePicker.minute;
        }
        this.timePicker?.destroy();
        this.timePicker = null;
        this.tab = tab;
        for (const [button, active] of [[this.tabDate, tab === 'date'], [this.tabTime, tab === 'time']]) {
            button.classList.toggle('is-active', active);
            button.setAttribute('role', 'tab');
            button.setAttribute('aria-selected', String(active));
        }
        this.panel.replaceChildren();
        if (tab === 'date') new Calendar(this.p, this.panel, this.date, day => {
            this.date = day;
            this.updateSummary();
            this.updateDestination();
        });
        else this.timePicker = new MaterialClock(this.p, this.panel, this.hour, this.minute, (hour, minute) => {
            this.hour = hour;
            this.minute = minute;
            this.updateSummary();
            this.switchTab('date');
        }, () => this.switchTab('date', true));
    }
    onClose() {
        this.stopWatching?.();
        this.timePicker?.destroy();
        this.timePicker = null;
    }
    updateSummary() {
        if (!this.summary) return;
        const day = new Date(this.date);
        day.setHours(this.hour, this.minute, 0, 0);
        this.summary.textContent = dateFa(this.p, day) + '  •  ' + clockFa(this.p, day);
    }
    setSaving(value) {
        this.saving = value;
        if (this.saveButton) this.saveButton.disabled = value;
        if (this.deleteButton) this.deleteButton.disabled = value;
    }
    async save() {
        if (this.saving) return;
        const title = this.titleInput.value.trim();
        if (!title) { new Notice('عنوان کار را وارد کنید'); this.titleInput.focus(); return; }
        // The main Save action also commits the currently open clock.
        if (this.timePicker) {
            if (!this.timePicker.readInputs()) return;
            this.hour = this.timePicker.hour;
            this.minute = this.timePicker.minute;
        }
        const day = new Date(this.date);
        day.setHours(this.hour, this.minute, 0, 0);
        if (day.getHours() !== this.hour || day.getMinutes() !== this.minute) {
            new Notice('ساعت معتبر نیست'); return;
        }
        const tags = [...new Set(this.tagsInput.value.split(/[\s،,]+/).map(x => x.replace(/^#/, '')))].filter(Boolean);
        if (tags.some(x => !/^[\p{L}\p{N}_-]+$/u.test(x))) {
            new Notice('هشتگ نامعتبر است'); this.tagsInput.closest('details').open = true; this.tagsInput.focus(); return;
        }
        this.setSaving(true);
        try {
            const values = { title, tags, place: this.placeInput.value, at: iso(day) };
            const ok = this.item
                ? await this.p.change(this.item, old => updateTaskPreservingText(this.p, old, values))
                : await this.p.add(this.pathInput.value, values, { daily: this.useDaily });
            if (ok) { new Notice(this.item ? 'کار به‌روزرسانی شد' : 'کار اضافه شد'); this.close(); }
        } catch (error) {
            console.error('[Persian Reminder save]', error);
            new Notice('ذخیره نشد: ' + error.message);
        } finally { this.setSaving(false); }
    }
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
        B(head, '', 'chevron-right', 'pr-icon', () => this.move(-1)).setAttribute('aria-label', 'ماه قبل');
        E(head, 'strong', '', a.jalaliMonthName(this.m) + ' ' + fa(p, this.y));
        B(head, '', 'chevron-left', 'pr-icon', () => this.move(1)).setAttribute('aria-label', 'ماه بعد');
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
            cell.setAttribute('aria-label', `${fa(p, day)} ${a.jalaliMonthName(this.m)} ${fa(p, this.y)}`);
            cell.setAttribute('aria-pressed', String(k === dateKey(this.selected)));
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
    readInputs() {
        const values = [this.hourInput, this.minuteInput].map(input => {
            const text = en(this.p, input.value.trim());
            return /^\d{1,2}$/.test(text) ? Number(text) : NaN;
        });
        for (let i = 0; i < values.length; i++) {
            if (!Number.isInteger(values[i]) || values[i] > (i ? 59 : 23)) {
                (i ? this.minuteInput : this.hourInput).focus();
                return false;
            }
        }
        [this.hour, this.minute] = values;
        return true;
    }
    accept() {
        if (!this.readInputs()) return;
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
"src/ui/keyboard-viewport.js": function(module, exports, require) {
const { Platform } = require('obsidian');

// Fit to the visible WebView, including the on-screen keyboard. Only the form
// scrolls; the title, selected date and save controls remain outside the scroller.
function watchKeyboard(modal, scroller) {
    const doc = modal.modalEl.ownerDocument;
    const win = doc.defaultView;
    const viewport = win.visualViewport;
    const listeners = [], timers = new Set();
    let frame = 0, closed = false;
    const listen = (target, event, fn) => {
        target?.addEventListener(event, fn);
        listeners.push(() => target?.removeEventListener(event, fn));
    };
    const reveal = () => {
        const input = doc.activeElement;
        if (!scroller.contains(input) || !input.matches('input,textarea,select')) return;
        const bounds = scroller.getBoundingClientRect();
        const field = input.getBoundingClientRect();
        const gap = 16;
        if (field.bottom > bounds.bottom - gap)
            scroller.scrollTop += field.bottom - bounds.bottom + gap;
        else if (field.top < bounds.top + gap)
            scroller.scrollTop -= bounds.top + gap - field.top;
    };
    const update = () => {
        frame = 0;
        if (closed) return;
        const mobile = Platform.isMobile || win.matchMedia('(max-width: 600px)').matches;
        const height = viewport?.height || win.innerHeight;
        modal.modalEl.classList.toggle('pr-mobile-modal', mobile);
        modal.modalEl.classList.toggle('pr-short-modal', mobile && height < 480);
        if (mobile) {
            modal.modalEl.style.setProperty('--pr-visible-height', `${height}px`);
            modal.modalEl.style.setProperty('--pr-visible-top', `${viewport?.offsetTop || 0}px`);
        }
        reveal();
    };
    const schedule = () => {
        if (!closed && !frame) frame = win.requestAnimationFrame(update);
    };
    const focus = () => {
        schedule();
        // Keyboard animations finish after focusin in iOS and Android WebViews.
        for (const delay of [100, 300]) {
            const timer = win.setTimeout(() => { timers.delete(timer); schedule(); }, delay);
            timers.add(timer);
        }
    };
    listen(viewport, 'resize', schedule);
    listen(viewport, 'scroll', schedule);
    listen(win, 'resize', schedule);
    listen(scroller, 'focusin', focus);
    listen(scroller, 'input', schedule);
    listen(scroller, 'toggle', schedule);
    update();
    return () => {
        closed = true;
        listeners.forEach(off => off());
        timers.forEach(timer => win.clearTimeout(timer));
        if (frame) win.cancelAnimationFrame(frame);
        modal.modalEl.style.removeProperty('--pr-visible-height');
        modal.modalEl.style.removeProperty('--pr-visible-top');
    };
}
module.exports = { watchKeyboard };


},
"src/ui/reminder-alert.js": function(module, exports, require) {
const { Modal, Notice } = require('obsidian');
const { E, I, B } = require("src/shared/dom.js");
const { TASK } = require("src/core/constants.js");
const { dateFa, clockFa, fromISO, iso, fa } = require("src/core/dates.js");
const { reminderKey } = require("src/core/reminders.js");
const { updateTaskPreservingText } = require("src/core/tasks.js");
const { watchKeyboard } = require("src/ui/keyboard-viewport.js");

// One compact card at a time, including when several reminders become due.
class ReminderAlert extends Modal {
    constructor(p, items, preview = false) {
        super(p.app); this.p = p; this.items = [...items]; this.preview = preview;
        this.minutes = Number(p.settings.snoozeMinutes) || 10; this.busy = false;
    }
    enqueue(items) {
        const known = new Set(this.items.map(reminderKey));
        for (const item of items) if (!known.has(reminderKey(item))) {
            this.items.push(item); known.add(reminderKey(item));
        }
        if (this.body && !this.busy) this.renderItems();
    }
    onOpen() {
        this.modalEl.addClass('pr-modal', 'pr-alert-modal');
        this.modalEl.setAttribute('role', 'alertdialog');
        this.modalEl.setAttribute('aria-label', 'هشدار یادآوری');
        const root = this.contentEl;
        root.replaceChildren();
        const head = E(root, 'div', 'pr-modal-header');
        I(head, 'bell-ring');
        const title = E(head, 'div');
        E(title, 'strong', '', this.preview ? 'پیش‌نمایش هشدار' : 'وقت این کار رسیده');
        this.count = E(title, 'small'); this.count.setAttribute('aria-live', 'polite');
        this.body = E(root, 'div', 'pr-modal-body pr-alert-body');
        const footer = E(root, 'div', 'pr-modal-footer pr-alert-footer');
        if (!this.preview) {
            const label = E(footer, 'label', 'pr-alert-snooze-label');
            E(label, 'span', '', 'یادآوری مجدد');
            const select = E(label, 'select', 'pr-select');
            select.setAttribute('aria-label', 'مدت تعویق یادآوری');
            for (const minutes of [5, 10, 15, 30, 60]) {
                E(select, 'option', '', fa(this.p, minutes) + ' دقیقه').value = String(minutes);
            }
            select.value = String(this.minutes);
            select.addEventListener('change', () => { this.minutes = Number(select.value); });
        }
        B(footer, this.preview ? 'متوجه شدم' : 'بستن', null, 'pr-cancel-btn', () => this.close());
        this.renderItems();
        this.stopWatching = watchKeyboard(this, this.body);
    }
    renderItems() {
        this.body.replaceChildren();
        this.count.textContent = this.preview ? 'نمایش آزمایشی' : fa(this.p, this.items.length) + ' یادآوری';
        const item = this.items[0];
        if (!item) return;
        const row = E(this.body, 'article', 'pr-alert-item');
        E(row, 'h3', '', item.title || 'بدون عنوان');
        const date = fromISO(item.at);
        if (date) {
            const time = E(row, 'div', 'pr-alert-meta');
            I(time, 'calendar-clock'); E(time, 'span', '', dateFa(this.p, date) + ' · ' + clockFa(this.p, date));
        }
        if (item.place) {
            const place = E(row, 'div', 'pr-alert-meta');
            I(place, 'map-pin'); E(place, 'span', '', item.place);
        }
        if (!this.preview) {
            const actions = E(row, 'div', 'pr-alert-actions');
            B(actions, 'انجام شد', 'check', 'pr-save-btn', () => this.run(item, raw => raw.replace(TASK,
                (_, prefix, checked, gap, text) => prefix + 'x' + gap + text)));
            B(actions, 'بعداً', 'clock-3', 'pr-quiet-btn', () => this.snooze(item));
            const link = B(row, item.path?.split('/').pop() || 'بازکردن یادداشت', 'file-text', 'pr-alert-note', async () => {
                if (this.busy) return;
                await this.p.openFile(item); this.close();
            });
            link.title = item.path;
            link.setAttribute('aria-label', 'بازکردن یادداشت ' + (item.path || ''));
            if (this.items.length > 1) B(row, 'یادآوری بعدی', 'chevron-left', 'pr-alert-next', () => {
                if (this.busy) return;
                this.items.shift(); this.renderItems();
            });
        }
    }
    async snooze(item) {
        const date = new Date(Date.now() + this.minutes * 60000);
        if (date.getSeconds() || date.getMilliseconds()) date.setMinutes(date.getMinutes() + 1);
        date.setSeconds(0, 0);
        await this.run(item, old => updateTaskPreservingText(this.p, old, { ...item, at: iso(date) }));
    }
    async run(item, transform) {
        if (this.busy || this.preview) return;
        this.busy = true;
        this.body.querySelectorAll('button').forEach(button => { button.disabled = true; });
        try {
            if (await this.p.change(item, transform)) this.items = this.items.filter(task => reminderKey(task) !== reminderKey(item));
        } catch (error) {
            console.error('[Persian Reminder alert]', error); new Notice('امکان به‌روزرسانی کار وجود نداشت');
        } finally {
            this.busy = false;
            if (this.items.length) this.renderItems();
            else this.close();
        }
    }
    onClose() {
        this.stopWatching?.();
        if (this.p.alertModal === this) this.p.alertModal = null;
    }
}
module.exports = { ReminderAlert };


},
"src/core/reminders.js": function(module, exports, require) {
const { fromISO } = require("src/core/dates.js");

// Metadata edits do not cause duplicate alarms; changing the due time rearms one.
function reminderKey(item) { return JSON.stringify([item.path, item.at, item.title]); }
function pendingReminders(p, now = Date.now()) {
    return p.items().filter(item => {
        const date = fromISO(item.at);
        return !item.done && date && date.getTime() >= now - 86400000 && !p.settings.notified[reminderKey(item)];
    });
}

// A timer for the next due time plus a watchdog for sleep, clock changes and
// delayed calendar-plugin startup. All handles belong to this plugin instance.
class ReminderScheduler {
    constructor(p, host = window) {
        this.p = p; this.host = host; this.running = false;
        this.busy = false; this.rescan = false; this.lastApi = null;
    }
    async start() {
        if (this.running) return;
        this.running = true; this.startedAt = Date.now();
        this.interval = this.host.setInterval(() => this.wake(), 30000);
        await this.tick(true);
    }
    wake(rescan = false) {
        if (!this.running) return;
        this.rescan ||= rescan;
        this.host.clearTimeout(this.timer);
        if (!this.busy) this.timer = this.host.setTimeout(() => this.tick(), 100);
    }
    plan() {
        if (!this.running) return;
        this.host.clearTimeout(this.timer);
        let delay = this.rescan ? 100 : 30000;
        if (!this.p.api() && Date.now() - this.startedAt < 60000) delay = Math.min(delay, 1000);
        const hidden = typeof document !== 'undefined' && document.hidden;
        if (!hidden && this.p.settings.notificationMode !== 'off') {
            const now = Date.now();
            for (const item of pendingReminders(this.p, now)) {
                const delta = fromISO(item.at).getTime() - now;
                delay = Math.min(delay, delta <= 0 ? 1000 : Math.max(25, delta));
            }
        }
        this.timer = this.host.setTimeout(() => this.tick(), delay);
    }
    async tick(rescan = false) {
        if (!this.running || this.busy) return;
        this.busy = true;
        try {
            const api = this.p.api();
            if (rescan || this.rescan || api !== this.lastApi) {
                this.rescan = false;
                this.lastApi = api;
                await this.p.scanAll();
            }
            if (this.running) await this.p.notify();
            if (this.running) this.p.refresh();
        } catch (error) { console.error('[Persian Reminder scheduler]', error); }
        finally { this.busy = false; this.plan(); }
    }
    stop() {
        this.running = false;
        this.host.clearTimeout(this.timer);
        this.host.clearInterval(this.interval);
    }
}
module.exports = { reminderKey, pendingReminders, ReminderScheduler };


},
"src/core/appearance.js": function(module, exports, require) {
const { DEFAULTS } = require("src/core/constants.js");
const { fromISO, fa } = require("src/core/dates.js");
const { cssColor } = require("src/core/tasks.js");

function gradientAngle(settings) {
    const value = Number(settings.gradientAngle ?? 120);
    return Number.isFinite(value) ? Math.max(0, Math.min(360, value)) : 120;
}
function cardTint(settings) {
    const value = Number(settings.cardTint ?? 10);
    return Number.isFinite(value) ? Math.max(0, Math.min(50, value)) : 10;
}
function contrastText(a, b) {
    const luminance = hex => {
        const rgb = cssColor(hex).slice(1).match(/../g).map(part => parseInt(part, 16) / 255)
            .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
        return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
    };
    const ends = [luminance(a), luminance(b)];
    const score = color => Math.min(...ends.map(value => {
        const ink = luminance(color);
        return (Math.max(value, ink) + .05) / (Math.min(value, ink) + .05);
    }));
    return score('#ffffff') > score('#182e3a') ? '#ffffff' : '#182e3a';
}
function remainingInfo(p, item, now = new Date()) {
    const date = fromISO(item.at);
    if (!date) return null;
    const day = value => Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
    const days = Math.round((day(date) - day(now)) / 86400000);
    let kind, label;
    if (item.done) { kind = 'done'; label = 'انجام‌شده'; }
    else if (date < now) { kind = 'overdue'; label = 'زمان گذشته'; }
    else if (days === 0) { kind = 'today'; label = 'امروز'; }
    else if (days === 1) { kind = 'tomorrow'; label = 'فردا'; }
    else { kind = 'future'; label = fa(p, days) + ' روز دیگر'; }
    let colors = { ...DEFAULTS.badgeColors.remaining, ...(p.settings.badgeColors?.remaining || {}) };
    if (p.settings.remainingRulesEnabled !== false) {
        if (['done', 'overdue', 'today'].includes(kind)) {
            colors = { ...DEFAULTS.remainingColors[kind], ...(p.settings.remainingColors?.[kind] || {}) };
        } else {
            const rule = [...(p.settings.remainingRules || DEFAULTS.remainingRules)]
                .filter(rule => rule.enabled !== false && Number.isFinite(Number(rule.days)) && Number(rule.days) >= days)
                .sort((a, b) => Number(a.days) - Number(b.days))[0];
            if (rule) colors = rule;
        }
    }
    return { label, kind, days, colors };
}
function paintRemaining(p, element, item, now) {
    const info = remainingInfo(p, item, now);
    if (!info) return;
    element.textContent = info.label;
    element.className = element.className.replace(/\bis-(?:done|overdue|today|tomorrow|future)\b/g, '').trim();
    element.classList.add('is-' + info.kind);
    for (const key of ['a', 'b', 'border']) element.style.setProperty('--pr-pill-' + key, cssColor(info.colors[key]));
    element.style.setProperty('--pr-pill-text', contrastText(info.colors.a, info.colors.b));
    return info;
}
module.exports = { gradientAngle, cardTint, contrastText, remainingInfo, paintRemaining };


},
"src/views/sidebar.js": function(module, exports, require) {
const { ItemView } = require('obsidian');
const { SIDE } = require("src/core/constants.js");
const { E, B } = require("src/shared/dom.js");
const { fa, dateKey } = require("src/core/dates.js");
const { status } = require("src/core/tasks.js");
const { empty, taskCard } = require("src/ui/task-card.js");
const { panelHeader, stats, dayPicker, searchField, matchesQuery } = require("src/ui/view-parts.js");

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


},
"src/ui/task-card.js": function(module, exports, require) {
// Task cards shared by sidebar/dashboard + remaining-time badges.
const { E, I, B } = require("src/shared/dom.js");
const { TASK } = require("src/core/constants.js");
const { fromISO, fa, dateFa, clockFa } = require("src/core/dates.js");
const { status, paintTask } = require("src/core/tasks.js");
const { paintRemaining } = require("src/core/appearance.js");
function empty(parent, message) { const box = E(parent, 'div', 'pr-empty'); I(box, 'calendar-check'); E(box, 'span', '', message); }
function taskCard(p, parent, item, compact = false) {
    const st = status(p, item), box = E(parent, 'article', 'pr-task-card pr-card-surface pr-due-' + st + (compact ? ' is-compact' : ''));
    paintTask(p, box, item);
    const body = E(box, 'div', 'pr-card-main'), title = E(body, 'div', 'pr-card-heading');
    const check = E(title, 'input', 'pr-check');
    check.type = 'checkbox';
    check.checked = item.done;
    check.setAttribute('aria-label', 'انجام کار: ' + (item.title || 'بدون عنوان'));
    check.addEventListener('change', async () => { const ok = await p.change(item, raw => raw.replace(TASK, (_, a, c, b, rest) => a + (check.checked ? 'x' : ' ') + b + rest)); if (!ok)
        check.checked = !check.checked; });
    const name = E(title, 'button', 'pr-title', item.title || 'بدون عنوان');
    name.type = 'button';
    name.setAttribute('aria-label', 'بازکردن یادداشت: ' + (item.title || 'بدون عنوان'));
    name.addEventListener('click', () => p.openFile(item));
    const date = fromISO(item.at), meta = E(body, 'div', 'pr-card-meta');
    if (date) {
        const chip = B(meta, dateFa(p, date) + ' · ' + clockFa(p, date), 'calendar-clock', 'pr-card-date', () => p.edit(item, 'time'));
        chip.title = 'تغییر تاریخ و ساعت';
    }
    if (date) paintRemaining(p, E(meta, 'span', 'pr-remaining'), item);
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
    timeBtn.setAttribute('aria-label', 'اصلاح زمان');
    const editBtn = B(controls, '', 'pencil', 'pr-card-action', () => p.edit(item));
    editBtn.title = 'ویرایش کار';
    editBtn.setAttribute('aria-label', 'ویرایش کار');
    return box;
}
module.exports = { empty, taskCard };


},
"src/ui/view-parts.js": function(module, exports, require) {
// Shared surfaces keep the sidebar and dashboard visually and behaviorally aligned.
const { E, I, B } = require("src/shared/dom.js");
const { fa, dateFa, dateKey } = require("src/core/dates.js");
const { status } = require("src/core/tasks.js");
const { Calendar } = require("src/ui/calendar.js");

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
            const { jalali } = require("src/core/dates.js");
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


},
"src/views/dashboard.js": function(module, exports, require) {
const { ItemView, Notice } = require('obsidian');
const { DASH } = require("src/core/constants.js");
const { E, B } = require("src/shared/dom.js");
const { fa, dateKey, dateFa } = require("src/core/dates.js");
const { empty, taskCard } = require("src/ui/task-card.js");
const { panelHeader, stats, dayPicker, searchField, matchesQuery } = require("src/ui/view-parts.js");

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


},
"src/settings.js": function(module, exports, require) {
const { PluginSettingTab, Setting, Notice } = require('obsidian');
const { PALETTES, DEFAULTS } = require("src/core/constants.js");
const { fa, iso, en } = require("src/core/dates.js");
const { dailyOptions, dailyNotePath } = require("src/core/daily-notes.js");
const { E, I, B } = require("src/shared/dom.js");
const { gradientAngle, cardTint, contrastText, paintRemaining } = require("src/core/appearance.js");

class SettingsTab extends PluginSettingTab {
    constructor(app, p) { super(app, p); this.p = p; this.page = 'general'; }
    display() {
        const root = this.containerEl;
        root.replaceChildren();
        root.classList.add('pr-settings');
        const hero = E(root, 'header', 'pr-settings-hero');
        I(hero, 'sliders-horizontal', 'pr-brand-icon');
        const text = E(hero, 'div');
        E(text, 'h2', '', 'یادآوری، به سلیقهٔ شما');
        E(text, 'p', '', 'رفتار، مقصد یادداشت‌ها و ظاهر را از همین‌جا تنظیم کنید.');
        const state = E(root, 'div', 'pr-settings-status' + (this.p.api() ? ' is-connected' : ''));
        I(state, this.p.api() ? 'circle-check' : 'circle-alert');
        E(state, 'span', '', this.p.api() ? 'تقویم شمسی آماده است' : 'برای انتخاب تاریخ، Persian Calendar را فعال کنید');
        const navigation = E(root, 'nav', 'pr-settings-nav');
        navigation.setAttribute('aria-label', 'بخش‌های تنظیمات');
        this.navButtons = new Map();
        for (const [key, title, icon] of [
            ['general', 'عمومی', 'settings-2'], ['daily', 'یادداشت روز', 'folder-open'],
            ['appearance', 'ظاهر', 'palette'], ['tags', 'هشتگ‌ها', 'hash']
        ]) this.navButtons.set(key, B(navigation, title, icon, 'pr-settings-nav-button', () => this.showPage(key)));
        this.pageEl = E(root, 'div', 'pr-settings-page');
        this.showPage(this.page);
        renderCreatorSupport(root, 'fa');
    }
    showPage(page) {
        this.page = page;
        for (const [key, button] of this.navButtons) {
            button.classList.toggle('is-active', page === key);
            if (page === key) button.setAttribute('aria-current', 'page');
            else button.removeAttribute('aria-current');
        }
        this.previewPaint = null;
        this.pageEl.replaceChildren();
        this[page]();
    }
    section(title, description) {
        const root = E(this.pageEl, 'section', 'pr-setting-section');
        const head = E(root, 'div', 'pr-setting-section-head');
        E(head, 'h3', '', title);
        if (description) E(head, 'p', '', description);
        return root;
    }
    async save(theme = false) {
        await this.p.persist();
        if (theme) { this.p.applyTheme(); this.previewPaint?.(); }
    }
    general() {
        const p = this.p;
        const behavior = this.section('رفتار یادآوری', 'تنظیمات اصلی، بدون پیچیدگی');
        new Setting(behavior).setName('بازکردن ساعت کنار کار').setDesc('در دسکتاپ؛ برچسب تاریخ و کنترل‌های موبایل با یک لمس باز می‌شوند.')
            .addDropdown(dropdown => dropdown.addOption('single', 'یک کلیک').addOption('double', 'دوبار کلیک')
                .setValue(p.settings.clickMode).onChange(async value => { p.settings.clickMode = value; await this.save(); }));
        new Setting(behavior).setName('قالب ذخیرهٔ یادآوری').setDesc('فقط نشانهٔ تاریخ در متن کارهای جدید را تعیین می‌کند.')
            .addDropdown(dropdown => dropdown.addOption('jalali', 'شمسی — @j:').addOption('gregorian', 'میلادی — @')
                .setValue(p.settings.dateFormat).onChange(async value => { p.settings.dateFormat = value; await this.save(); }));
        const setting = new Setting(behavior).setName('کارهای نزدیک').setDesc('کارهایی که در این بازه موعدشان می‌رسد، «نزدیک» محسوب می‌شوند.');
        const output = E(setting.controlEl, 'output', 'pr-slider-value', fa(p, p.settings.soonHours) + ' ساعت');
        setting.addSlider(slider => {
            slider.setLimits(1, 168, 1).setValue(p.settings.soonHours).onChange(async value => {
                p.settings.soonHours = value;
                output.textContent = fa(p, value) + ' ساعت';
                await this.save(); p.refresh();
            });
            slider.sliderEl.dir = 'ltr';
            slider.sliderEl.setAttribute('aria-label', 'بازهٔ کارهای نزدیک، بر حسب ساعت');
        });
        const alerts = this.section('هشدار سررسید', 'تا وقتی Obsidian باز است، موعد کارها بررسی می‌شود. در موبایل، بسته‌بودن برنامه یا توقف آن در پس‌زمینه ممکن است هشدار را تا بازگشت به برنامه به تأخیر بیندازد.');
        new Setting(alerts).setName('نوع هشدار').addDropdown(dropdown => dropdown
            .addOption('modal', 'پنجرهٔ هشدار').addOption('notice', 'پیام کوتاه').addOption('off', 'خاموش')
            .setValue(p.settings.notificationMode).onChange(async value => { p.settings.notificationMode = value; await this.save(); p.scheduler?.wake(); }));
        new Setting(alerts).setName('زمان پیش‌فرض یادآوری مجدد').addDropdown(dropdown => {
            for (const value of [5, 10, 15, 30, 60]) dropdown.addOption(String(value), fa(p, value) + ' دقیقه');
            dropdown.setValue(String(p.settings.snoozeMinutes)).onChange(async value => {
                p.settings.snoozeMinutes = Number(value); await this.save();
            });
        });
        new Setting(alerts).setName('آزمایش هشدار').setDesc('یک نمونه نمایش می‌دهد؛ هیچ کاری تغییر نمی‌کند.')
            .addButton(button => button.setButtonText('نمایش نمونه').onClick(() => p.showAlerts([{
                title: 'زمان انجام کار شما رسیده است', at: iso(new Date()), place: 'نمونهٔ مکان', tags: [],
                path: p.settings.defaultNote, raw: ''
            }], true)));
        const note = this.section('افزودن سریع از فرمان‌ها', 'برای افزودن کار خارج از تقویم، یادداشت باز پیشنهاد می‌شود.');
        new Setting(note).setName('یادداشت پیش‌فرض').setDesc('وقتی یادداشت بازی وجود ندارد، این مسیر پیشنهاد می‌شود.')
            .addText(input => {
                input.setPlaceholder('یادآوری‌ها.md').setValue(p.settings.defaultNote)
                    .onChange(async value => { p.settings.defaultNote = value.trim() || DEFAULTS.defaultNote; await this.save(); });
                input.inputEl.classList.add('pr-path-input');
            });
    }
    daily() {
        const p = this.p;
        const intro = this.section('یادداشت روز انتخاب‌شده', 'کار جدید از سایدبار یا داشبورد، در یادداشت همان روز ذخیره می‌شود. اگر یادداشت وجود نداشته باشد، ساخته می‌شود.');
        new Setting(intro).setName('استفاده از تنظیمات Daily notes').setDesc('پوشه و قالب نام از افزونهٔ اصلی Obsidian خوانده می‌شود؛ در غیر این صورت تنظیمات زیر استفاده می‌شود.')
            .addToggle(toggle => toggle.setValue(p.settings.dailyUseCore).onChange(async value => {
                p.settings.dailyUseCore = value; await this.save(); this.showPage('daily'); p.refresh();
            }));
        const templateSection = this.section('قالب یادداشت روز با Templater', 'قالب فقط هنگام ساخت یادداشت تازه اجرا می‌شود؛ سپس کار زیر عنوان تعیین‌شده قرار می‌گیرد.');
        new Setting(templateSection).setName('استفاده از قالب Templater').addToggle(toggle => toggle
            .setValue(p.settings.dailyUseTemplater).onChange(async value => {
                p.settings.dailyUseTemplater = value; await this.save(); this.showPage('daily');
            }));
        if (p.settings.dailyUseTemplater) {
            const templater = p.app.plugins.getPlugin('templater-obsidian');
            if (!templater) E(templateSection, 'p', 'pr-setting-help', 'Templater را نصب و فعال کنید تا قالب اجرا شود.');
            const folder = (templater?.settings?.templates_folder || '').replace(/^\/+|\/+$/g, '');
            const files = p.app.vault.getMarkdownFiles().filter(file => !folder || file.path.startsWith(folder + '/'))
                .sort((a, b) => a.path.localeCompare(b.path));
            new Setting(templateSection).setName('قالب روزانه').setDesc(folder ? 'قالب‌های پوشهٔ ' + folder : 'یک یادداشت قالب از ولت انتخاب کنید.')
                .addDropdown(dropdown => {
                    dropdown.addOption('', 'انتخاب قالب…');
                    if (p.settings.dailyTemplatePath && !files.some(file => file.path === p.settings.dailyTemplatePath))
                        dropdown.addOption(p.settings.dailyTemplatePath, p.settings.dailyTemplatePath + ' (خارج از پوشه یا حذف‌شده)');
                    for (const file of files) dropdown.addOption(file.path, file.path);
                    dropdown.setValue(p.settings.dailyTemplatePath || '').onChange(async value => {
                        p.settings.dailyTemplatePath = value; await this.save();
                    });
                });
            E(templateSection, 'p', 'pr-setting-help', 'نام یادداشت از روز انتخاب‌شده ساخته می‌شود. برای تاریخ داخل قالب از عنوان فایل استفاده کنید؛ tp.date.now() تاریخ امروز را می‌دهد.');
        }
        const options = dailyOptions(p), useCore = options.source === 'obsidian';
        if (p.settings.dailyUseCore && !useCore) E(intro, 'p', 'pr-setting-help', 'تنظیمات Daily notes در دسترس نیست؛ مقصد از تنظیمات دستی زیر ساخته می‌شود.');
        const manual = this.section('مسیر و نام یادداشت', useCore ? 'این مقادیر از Daily notes گرفته می‌شوند.' : 'این تنظیمات را با نام یادداشت‌های روزانهٔ موجودتان هماهنگ کنید.');
        let preview;
        const update = () => {
            if (!preview) return;
            try { preview.textContent = dailyNotePath(p, new Date()); preview.classList.remove('is-error'); }
            catch (error) { preview.textContent = error.message; preview.classList.add('is-error'); }
        };
        new Setting(manual).setName('پوشهٔ یادداشت‌های روز').setDesc('مسیر داخل ولت؛ خالی یعنی ریشهٔ ولت.')
            .addText(input => {
                input.setPlaceholder('Daily').setValue(useCore ? options.folder : p.settings.dailyFolder).setDisabled(useCore)
                    .onChange(async value => { p.settings.dailyFolder = value.trim().replace(/^\/+|\/+$/g, ''); update(); await this.save(); p.refresh(); });
                input.inputEl.classList.add('pr-path-input');
            });
        new Setting(manual).setName('تقویم نام یادداشت').setDesc('مستقل از قالب تاریخ داخل متن کار است.')
            .addDropdown(dropdown => dropdown.addOption('gregorian', 'میلادی').addOption('jalali', 'شمسی')
                .setValue(options.calendar).setDisabled(useCore).onChange(async value => {
                    p.settings.dailyCalendar = value; update(); await this.save(); p.refresh();
                }));
        new Setting(manual).setName('قالب نام فایل').setDesc('YYYY سال، MM ماه، DD روز؛ مثل YYYY-MM-DD یا YYYY/MM/DD. متن ثابت را در [کروشه] بگذارید.')
            .addText(input => {
                input.setPlaceholder('YYYY-MM-DD').setValue(options.format).setDisabled(useCore)
                    .onChange(async value => { p.settings.dailyFormat = value.trim() || DEFAULTS.dailyFormat; update(); await this.save(); p.refresh(); });
                input.inputEl.dir = 'ltr';
            });
        const sample = E(manual, 'div', 'pr-daily-preview');
        I(sample, 'file-text');
        const text = E(sample, 'div');
        E(text, 'small', '', 'نمونهٔ مسیر برای امروز');
        preview = E(text, 'span');
        update();
        new Setting(manual).setName('عنوان بخش کارها').setDesc('کار زیر این عنوان قرار می‌گیرد؛ خالی بگذارید تا به انتهای یادداشت اضافه شود.')
            .addText(input => input.setPlaceholder('## یادآوری‌ها').setValue(p.settings.dailyHeading)
                .onChange(async value => { p.settings.dailyHeading = value.trim(); await this.save(); }));
    }
    appearance() {
        const p = this.p;
        const appearance = this.section('رنگ و پیش‌نمایش', 'یک زبان بصری مشترک برای سایدبار، داشبورد و مودال');
        const preview = E(appearance, 'div', 'pr-settings-preview pr-card-surface');
        E(preview, 'small', 'pr-eyebrow', 'پیش‌نمایش زنده');
        const title = E(preview, 'div', 'pr-preview-task-title');
        I(title, 'circle-check'); E(title, 'strong', '', 'آماده‌سازی برنامهٔ فردا');
        const badges = E(preview, 'div', 'pr-preview-badges');
        E(badges, 'span', 'pr-preview-date', '۱۴۰۵/۰۸/۰۲ · ۱۵:۳۰');
        const previewRemaining = E(badges, 'span', 'pr-preview-remaining', 'فردا');
        const previewItem = () => {
            const day = new Date(); day.setDate(day.getDate() + 1); day.setHours(15, 30, 0, 0);
            return { at: iso(day), done: false };
        };
        const paintPreview = () => paintRemaining(p, previewRemaining, previewItem());
        this.previewPaint = paintPreview;
        paintPreview();
        const angleSetting = new Setting(appearance).setName('زاویهٔ گرادیانت').setDesc('جهت گرادیانت کارت‌ها و برچسب‌ها، از صفر تا ۳۶۰ درجه');
        const angleOutput = E(angleSetting.controlEl, 'output', 'pr-slider-value', fa(p, gradientAngle(p.settings)) + '°');
        angleSetting.addSlider(slider => {
            slider.setLimits(0, 360, 5).setValue(gradientAngle(p.settings)).onChange(async value => {
                p.settings.gradientAngle = value; angleOutput.textContent = fa(p, value) + '°'; await this.save(true);
            });
            slider.sliderEl.dir = 'ltr'; slider.sliderEl.setAttribute('aria-label', 'زاویهٔ گرادیانت');
        });
        const tintSetting = new Setting(appearance).setName('شدت رنگ کارت‌ها').setDesc('میزان ترکیب رنگ اصلی با زمینه؛ پیش‌نمایش و کارت‌ها یکسان تغییر می‌کنند.');
        const tintOutput = E(tintSetting.controlEl, 'output', 'pr-slider-value', fa(p, cardTint(p.settings)) + '٪');
        tintSetting.addSlider(slider => {
            slider.setLimits(0, 50, 1).setValue(cardTint(p.settings)).onChange(async value => {
                p.settings.cardTint = value; tintOutput.textContent = fa(p, value) + '٪'; await this.save(true);
            });
            slider.sliderEl.dir = 'ltr'; slider.sliderEl.setAttribute('aria-label', 'شدت رنگ کارت‌ها');
        });
        const grid = E(appearance, 'div', 'pr-accent-grid');
        grid.setAttribute('role', 'group'); grid.setAttribute('aria-label', 'رنگ اصلی افزونه');
        for (const [key, palette] of Object.entries(PALETTES)) {
            const button = B(grid, '', null, 'pr-accent-option', async () => {
                p.settings.palette = key;
                await this.save(true);
                for (const element of grid.children) {
                    const active = element === button;
                    element.classList.toggle('is-active', active);
                    element.setAttribute('aria-pressed', String(active));
                }
            });
            const active = key === p.settings.palette;
            button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active));
            const dot = E(button, 'span', 'pr-accent-dot');
            dot.style.background = `linear-gradient(var(--pr-gradient-angle,120deg), ${palette.primary}, ${palette.secondary})`;
            E(button, 'span', 'pr-accent-name', palette.name);
        }
        const colors = this.section('برچسب‌های تاریخ و زمان', 'پالت آماده انتخاب کنید یا جزئیات رنگ را باز کنید.');
        const presets = [
            ['اقیانوسی', '#67D5ED', '#A5B4FC', '#438FBF'], ['نعنایی', '#6EE7B7', '#A7F3D0', '#299E76'],
            ['یاسی', '#C4B5FD', '#F0ABFC', '#9B68C8'], ['هلویی', '#FDBA74', '#FBCFE8', '#CE8648'],
            ['رز', '#FDA4AF', '#F9A8D4', '#C96A8D'], ['آسمانی', '#93C5FD', '#BAE6FD', '#5D95CF']
        ];
        p.settings.badgeColors ||= {};
        for (const [type, label, sample] of [
            ['inline', 'داخل یادداشت', '۱۴۰۵/۰۸/۰۲ · ۱۵:۳۰'],
            ['date', 'تاریخ روی کارت', '۱۴۰۵/۰۸/۰۲'], ['remaining', 'زمان باقی‌مانده', 'فردا']
        ]) {
            const details = E(colors, 'details', 'pr-badge-editor');
            const summary = E(details, 'summary', 'pr-badge-editor-title');
            E(summary, 'span', '', label);
            const pill = E(summary, 'span', 'pr-preview-pill', sample);
            const controls = E(details, 'div', 'pr-badge-controls');
            const initial = { ...DEFAULTS.badgeColors[type], ...(p.settings.badgeColors[type] || {}) };
            const pickers = {};
            const paint = () => {
                const value = { ...DEFAULTS.badgeColors[type], ...(p.settings.badgeColors[type] || {}) };
                pill.style.background = `linear-gradient(var(--pr-gradient-angle,120deg), ${value.a}, ${value.b})`;
                pill.style.borderColor = value.border;
                pill.style.color = contrastText(value.a, value.b);
            };
            paint();
            const paletteGrid = E(controls, 'div', 'pr-mini-palette-grid');
            for (const [name, a, b, border] of presets) {
                const button = B(paletteGrid, name, null, 'pr-mini-palette', async () => {
                    p.settings.badgeColors[type] = { a, b, border };
                    await this.save(true); paint();
                    for (const key of ['a', 'b', 'border']) pickers[key]?.setValue(p.settings.badgeColors[type][key]);
                });
                button.style.background = `linear-gradient(var(--pr-gradient-angle,120deg), ${a}, ${b})`;
                button.style.borderColor = border;
            }
            for (const [key, name] of [['a', 'رنگ اول'], ['b', 'رنگ دوم'], ['border', 'حاشیه']]) {
                new Setting(controls).setName(name).addColorPicker(picker => {
                    pickers[key] = picker;
                    picker.setValue(initial[key]).onChange(async value => {
                        p.settings.badgeColors[type] = { ...initial, ...(p.settings.badgeColors[type] || {}), [key]: value };
                        await this.save(true); paint();
                    });
                });
            }
            new Setting(controls).setName('بازگشت این برچسب به پیش‌فرض').addButton(button => button.setButtonText('بازنشانی').onClick(async () => {
                p.settings.badgeColors[type] = { ...DEFAULTS.badgeColors[type] };
                await this.save(true); paint();
                for (const key of ['a', 'b', 'border']) pickers[key]?.setValue(p.settings.badgeColors[type][key]);
            }));
        }
        new Setting(colors).setName('رنگ متن برچسب داخل یادداشت').addColorPicker(picker => picker.setValue(p.settings.inlineTextColor || DEFAULTS.inlineTextColor)
            .onChange(async value => { p.settings.inlineTextColor = value; await this.save(true); }));
        const paintRules = this.remainingControls();
        this.previewPaint = () => { paintPreview(); paintRules(); };
    }
    remainingControls() {
        const p = this.p;
        p.settings.remainingRules ||= DEFAULTS.remainingRules.map(rule => ({ ...rule }));
        p.settings.remainingColors ||= structuredClone(DEFAULTS.remainingColors);
        const root = this.section('رنگ زمان باقی‌مانده', '«امروز» رنگ مستقل دارد. برای روزهای آینده، نزدیک‌ترین بازهٔ فعال انتخاب می‌شود: مثلاً ۱ روز، سپس تا ۷ روز؛ بیشتر از آن از رنگ عمومی استفاده می‌کند. بازه‌ها بر اساس روز تقویمی هستند.');
        const samples = E(root, 'div', 'pr-remaining-samples');
        const previewItems = [];
        for (const offset of [0, 1, 7, 27, -1]) {
            const span = E(samples, 'span', 'pr-rule-sample');
            previewItems.push({ offset, span });
        }
        const paintSamples = () => {
            const now = new Date();
            for (const { offset, span } of previewItems) {
                const day = new Date(now); day.setDate(day.getDate() + offset);
                // Keep the "today" preview in the future even at 23:59.
                if (offset === 0) day.setHours(23, 59, 59, 999);
                else day.setHours(23, 59, 0, 0);
                paintRemaining(p, span, { at: iso(day), done: false }, offset === 0 ? new Date(day.getTime() - 60000) : now);
            }
        };
        new Setting(root).setName('رنگ‌بندی بر اساس موعد').addToggle(toggle => toggle
            .setValue(p.settings.remainingRulesEnabled !== false).onChange(async value => {
                p.settings.remainingRulesEnabled = value; await this.save(true);
            }));
        const editors = E(root, 'div');
        let paints = [];
        const draw = () => {
            editors.replaceChildren(); paints = [];
            const colorEditor = (colors, title, subtitle, rule = null) => {
                const details = E(editors, 'details', 'pr-badge-editor');
                const summary = E(details, 'summary', 'pr-badge-editor-title');
                const name = E(summary, 'span', '', title);
                const pill = E(summary, 'span', 'pr-preview-pill', subtitle);
                const controls = E(details, 'div', 'pr-badge-controls');
                const paint = () => {
                    pill.style.background = `linear-gradient(var(--pr-gradient-angle,120deg),${colors.a},${colors.b})`;
                    pill.style.borderColor = colors.border; pill.style.color = contrastText(colors.a, colors.b);
                };
                paints.push(paint); paint();
                if (rule) {
                    new Setting(controls).setName('حداکثر روز باقی‌مانده').setDesc('این بازه تا این تعداد روز، با احتساب خود آن روز، اعمال می‌شود.')
                        .addText(input => {
                            input.setValue(String(rule.days)); input.inputEl.type = 'number';
                            input.inputEl.min = '1'; input.inputEl.max = '3650'; input.inputEl.step = '1';
                            input.inputEl.setAttribute('aria-label', 'حداکثر روز باقی‌مانده');
                            input.onChange(async value => {
                                const days = Number(en(p, value));
                                if (!Number.isInteger(days) || days < 1 || days > 3650) {
                                    input.inputEl.setAttribute('aria-invalid', 'true'); return;
                                }
                                input.inputEl.removeAttribute('aria-invalid'); rule.days = days;
                                name.textContent = 'تا ' + fa(p, days) + ' روز مانده'; pill.textContent = fa(p, days) + ' روز دیگر';
                                await this.save(true);
                            });
                        });
                    new Setting(controls).setName('این بازه فعال باشد').addToggle(toggle => toggle
                        .setValue(rule.enabled !== false).onChange(async value => { rule.enabled = value; await this.save(true); }));
                }
                for (const [key, label] of [['a', 'رنگ اول'], ['b', 'رنگ دوم'], ['border', 'حاشیه']]) {
                    new Setting(controls).setName(label).addColorPicker(picker => picker.setValue(colors[key]).onChange(async value => {
                        colors[key] = value; paint(); await this.save(true);
                    }));
                }
                if (rule) new Setting(controls).setName('حذف این بازه').addButton(button => button.setButtonText('حذف').onClick(async () => {
                    p.settings.remainingRules = p.settings.remainingRules.filter(item => item !== rule);
                    await this.save(true); draw();
                }));
            };
            for (const [key, label] of [['today', 'امروز'], ['overdue', 'زمان گذشته'], ['done', 'انجام‌شده']])
                colorEditor(p.settings.remainingColors[key], label, label);
            for (const rule of p.settings.remainingRules)
                colorEditor(rule, 'تا ' + fa(p, rule.days) + ' روز مانده', fa(p, rule.days) + ' روز دیگر', rule);
        };
        new Setting(root).setName('بازهٔ دلخواه').setDesc('بازه‌های ۱ و ۷ روز از قبل آماده‌اند؛ می‌توانید تعداد روز و رنگ آن‌ها را تغییر دهید.')
            .addButton(button => button.setButtonText('افزودن بازه').onClick(async () => {
                p.settings.remainingRules.push({ id: 'range-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), days: 3,
                    enabled: true, a: '#C4B5FD', b: '#E9D5FF', border: '#A18ACF' });
                await this.save(true); draw();
            }));
        draw(); paintSamples();
        return () => { paintSamples(); paints.forEach(paint => paint()); };
    }
    tags() {
        const p = this.p;
        const root = this.section('رنگ کارها بر اساس هشتگ', 'رنگ انتخابی روی کارت و ردیف کار اعمال می‌شود؛ ظاهر خود هشتگ را پوستهٔ Obsidian تعیین می‌کند.');
        let input;
        const add = async () => {
            const name = input.getValue().trim().replace(/^#/, '');
            if (!/^[\p{L}\p{N}_-]+$/u.test(name)) { new Notice('یک هشتگ معتبر وارد کنید'); return; }
            if (!(name in p.settings.tagColors)) p.settings.tagColors[name] = PALETTES[p.settings.palette]?.primary || PALETTES.lavender.primary;
            input.setValue(''); await this.save(true); draw();
        };
        new Setting(root).setName('هشتگ جدید').addText(text => {
            input = text;
            text.setPlaceholder('مثلاً مهم');
            text.inputEl.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.isComposing) add(); });
        }).addButton(button => button.setButtonText('افزودن').setCta().onClick(add));
        const list = E(root, 'div', 'pr-tag-settings-list');
        const draw = () => {
            list.replaceChildren();
            if (!Object.keys(p.settings.tagColors).length) E(list, 'p', 'pr-setting-help', 'هنوز رنگی ثبت نشده؛ اولین هشتگ را از کادر بالا اضافه کنید.');
            for (const tag of Object.keys(p.settings.tagColors)) {
                new Setting(list).setName('#' + tag).addColorPicker(picker => picker.setValue(p.settings.tagColors[tag]).onChange(async value => {
                    p.settings.tagColors[tag] = value; await this.save(true);
                })).addExtraButton(button => button.setIcon('trash-2').setTooltip('حذف رنگ ' + tag).onClick(async () => {
                    delete p.settings.tagColors[tag]; await this.save(true); draw();
                }));
            }
        };
        draw();
    }
}
module.exports = { SettingsTab };



// Shared settings footer: local styling, no requests until a link is opened.
function renderCreatorSupport(container, language) {
  function element(parent, tag, options = {}) {
    const node = parent.ownerDocument.createElement(tag);
    if (options.cls) node.className = options.cls;
    if (options.text !== undefined) node.textContent = options.text;
    if (options.href) node.setAttribute('href', options.href);
    for (const [key, value] of Object.entries(options.attr || {})) node.setAttribute(key, value);
    parent.appendChild(node);
    return node;
  }
  const fa = language === 'fa';
  const root = element(container, 'section', { cls: 'ot-support', attr: { dir: fa ? 'rtl' : 'ltr', 'aria-label': fa ? 'ارتباط با ما و حمایت' : 'Connect and support' } });
  element(root, 'style', { text: `
    .ot-support{margin-block:28px 12px;padding:20px;border:1px solid var(--background-modifier-border);border-radius:18px;background:var(--background-secondary);color:var(--text-normal)}
    .ot-support h3{margin:0 0 8px;font-size:1.1em;color:var(--text-normal)}
    .ot-support p{margin:0 0 18px;color:var(--text-muted);line-height:1.8}
    .ot-support .ot-support-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:10px}
    .ot-support a.ot-support-card{display:flex;align-items:center;gap:12px;min-width:0;min-height:80px;padding:14px;border:1px solid var(--background-modifier-border);border-inline-start:4px solid var(--ot-brand);border-radius:12px;background:var(--background-primary);color:var(--text-normal);text-decoration:none;box-shadow:0 3px 12px rgba(0,0,0,.035)}
    .ot-support .ot-support-icon{display:flex;align-items:center;justify-content:center;flex:0 0 40px;height:40px;border-radius:12px;background:var(--background-secondary);color:var(--ot-brand)}
    .ot-support .ot-support-icon svg{width:23px;height:23px}
    .ot-support .ot-support-info{display:flex;flex:1;min-width:0;flex-direction:column;gap:5px}
    .ot-support .ot-support-label{font-weight:600;line-height:1.5}
    .ot-support .ot-support-detail{font-size:.8em;color:var(--text-muted);overflow-wrap:anywhere}
    .ot-support .ot-support-action{font-size:.8em;color:var(--text-muted);flex-shrink:0}
    .ot-support a.ot-support-donate{background:linear-gradient(125deg,var(--background-primary),var(--background-secondary));border-color:var(--background-modifier-border);border-inline-start-color:var(--ot-brand)}
    .ot-support .ot-support-donate .ot-support-action{padding:7px 10px;border-radius:8px;background:var(--interactive-accent);color:var(--text-on-accent)}
    .ot-support a.ot-support-card:focus-visible{outline:2px solid var(--interactive-accent);outline-offset:3px}
  ` });
  element(root, 'h3', { text: fa ? 'ارتباط با ما' : 'Connect with us' });
  element(root, 'p', { text: fa ? 'آموزش‌ها، تازه‌ها و پشتیبانی؛ همراه شما در دنیای ابسیدین.' : 'Tutorials, updates and support for your Obsidian journey.' });
  const grid = element(root, 'div', { cls: 'ot-support-grid' });
  const links = [
    ['bale', 'message-circle', '#22a06b', fa ? 'کانال بله' : 'Bale Channel', 'https://ble.ir/obsidiantut'],
    ['telegram', 'send', '#229ed9', fa ? 'کانال تلگرام' : 'Telegram Channel', 'https://t.me/obsidiantut'],
    ['youtube', 'youtube', '#e5484d', fa ? 'کانال یوتیوب' : 'YouTube Channel', 'https://youtube.com/@obsidiantut'],
    ['donate', 'heart', '#b879cd', fa ? 'حمایت از توسعهٔ افزونه‌ها' : 'Support plugin development', 'https://reymit.ir/singhaf9270']
  ];
  for (const [id, icon, color, label, url] of links) {
    const donate = id === 'donate';
    const card = element(grid, 'a', { cls: 'ot-support-card' + (donate ? ' ot-support-donate' : ''), href: url, attr: { target: '_blank', rel: 'noopener noreferrer', 'aria-label': label } });
    card.style.setProperty('--ot-brand', color);
    const iconEl = element(card, 'span', { cls: 'ot-support-icon', attr: { 'aria-hidden': 'true' } });
    require('obsidian').setIcon(iconEl, icon);
    const info = element(card, 'span', { cls: 'ot-support-info' });
    element(info, 'span', { cls: 'ot-support-label', text: label });
    const detail = element(info, 'span', { cls: 'ot-support-detail', text: donate ? (fa ? 'با همراهی شما، بهتر می‌سازیم.' : 'Your support keeps us building.') : '@obsidiantut' });
    if (!donate) detail.setAttribute('dir', 'ltr');
    element(card, 'span', { cls: 'ot-support-action', text: donate ? (fa ? 'حمایت مالی' : 'Donate') : (fa ? 'عضویت ↗' : 'Join ↗') });
  }
}

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
