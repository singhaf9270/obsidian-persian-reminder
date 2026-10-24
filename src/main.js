// Application entry point: lifecycle, vault index, notifications and commands.
const { Plugin, Notice, MarkdownView, TFile, Platform } = require('obsidian');
const { SIDE, DASH, DEFAULTS, PALETTES, TASK, PLACE } = require('./core/constants');
const { cssColor, parseTask, buildTask, status, paintTask } = require('./core/tasks');
const { fromISO, dateFa, clockFa } = require('./core/dates');
const { E, I } = require('./shared/dom');
const { refreshEffect, editorExtension } = require('./editor/widgets');
const { TaskModal } = require('./ui/task-modal');
const { Sidebar } = require('./views/sidebar');
const { Dashboard } = require('./views/dashboard');
const { SettingsTab } = require('./settings');
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
