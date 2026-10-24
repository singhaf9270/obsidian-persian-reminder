// Regression tests for date destinations and non-destructive note insertion.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
class TFile { constructor(path) { this.path = path; this.extension = 'md'; } }
class MarkdownView {}
const messages = [];
const obsidian = {
    Plugin: class {}, Modal: class {}, ItemView: class {}, PluginSettingTab: class {}, Setting: class {},
    Notice: class { constructor(message) { messages.push(message); } },
    TFile, MarkdownView, Platform: { isMobile: false }, setIcon() {}
};
const external = id => {
    if (id === 'obsidian') return obsidian;
    if (id === '@codemirror/view') return { ViewPlugin: { fromClass: () => ({}) }, Decoration: {}, WidgetType: class {} };
    if (id === '@codemirror/state') return { StateEffect: { define: () => ({ of() {} }) } };
    throw Error(id);
};
const moduleResult = { exports: {} };
const file = path.resolve(__dirname, '../main.js');
vm.runInNewContext(fs.readFileSync(file, 'utf8') + '\nmodule.exports.testRequire = __prRequire;',
    { module: moduleResult, require: external, Date, console, window: {} });
const Plugin = moduleResult.exports;
const { DEFAULTS } = Plugin.testRequire('src/core/constants.js');
const { dailyNotePath, insertDailyTask, notePath } = Plugin.testRequire('src/core/daily-notes.js');
const { TaskModal } = Plugin.testRequire('src/ui/task-modal.js');
const p = new Plugin();
p.settings = JSON.parse(JSON.stringify(DEFAULTS));
p.settings.dateFormat = 'gregorian';
p.settings.dailyFolder = 'Daily';
p.index = new Map(); p.scanSerial = new Map();
p.api = () => ({
    gregorianToJalali: (year, month, day) => year === 2026 && month === 10 && day === 24 ? { jy: 1405, jm: 8, jd: 2 } : null,
    toEnNumber: value => value.replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
});
const notes = new Map(), folders = new Map(), views = [];
p.app = {
    internalPlugins: { plugins: {} },
    plugins: { getPlugin: () => null },
    workspace: {
        getActiveFile: () => ({ path: 'Other/active.md' }),
        getLeavesOfType: type => type === 'markdown' ? views.map(view => ({ view })) : []
    },
    vault: {
        getAbstractFileByPath: path => notes.has(path) ? new TFile(path) : folders.get(path),
        createFolder: async path => { folders.set(path, { path }); },
        create: async (path, source) => { assert(!notes.has(path)); notes.set(path, source); return new TFile(path); },
        process: async (file, transform) => { notes.set(file.path, transform(notes.get(file.path))); },
        cachedRead: async file => notes.get(file.path)
    }
};
const date = new Date(2026, 9, 24, 14, 45);
assert.equal(dailyNotePath(p, date), 'Daily/2026-10-24.md');
p.settings.dailyCalendar = 'jalali';
assert.equal(dailyNotePath(p, date), 'Daily/1405-08-02.md');
p.settings.dailyFormat = 'YYYY/MM/[روز ]DD';
assert.equal(dailyNotePath(p, date), 'Daily/1405/08/روز 02.md');
p.settings.dailyCalendar = 'gregorian'; p.settings.dailyFormat = 'YYYY-MM-DD';
p.settings.dailyUseCore = true;
p.app.internalPlugins.plugins['daily-notes'] = { instance: { options: { folder: 'Journal', format: 'YYYY/MM/DD' } } };
assert.equal(dailyNotePath(p, date), 'Journal/2026/10/24.md');
delete p.app.internalPlugins.plugins['daily-notes'];
assert.equal(dailyNotePath(p, date), 'Daily/2026-10-24.md');
p.settings.dailyUseCore = false;
assert.throws(() => notePath('../escape.md'));
assert.throws(() => notePath('/tmp/note.md'));
const line = '- [ ] New (@2026-10-24 14:45)';
assert.equal(insertDailyTask('', line, '## Reminders'), '## Reminders\n' + line + '\n');
assert.equal(insertDailyTask('note', line, ''), 'note\n' + line + '\n');
const original = '---\nname: daily\n---\n\n## Reminders\n- [x] Old\n\n## Journal\nKeep **all** of this.';
assert.equal(insertDailyTask(original, line, '## Reminders'),
    '---\nname: daily\n---\n\n## Reminders\n- [x] Old\n' + line + '\n\n## Journal\nKeep **all** of this.\n');
assert.equal(insertDailyTask('## Reminders\r\n- [ ] Old\r\n\r\n## Next\r\nkeep\r\n', line, '## Reminders'),
    '## Reminders\r\n- [ ] Old\r\n' + line + '\r\n\r\n## Next\r\nkeep\r\n');
const code = '```md\n## Reminders\n```\n';
assert.equal(insertDailyTask(code, line, '## Reminders'), code + '\n## Reminders\n' + line + '\n');
const frontmatter = '---\ntext: |\n  ## Reminders\n---\n';
assert.equal(insertDailyTask(frontmatter, line, '## Reminders'), frontmatter + '\n## Reminders\n' + line + '\n');

(async () => {
    const values = { title: 'Selected day', tags: ['مهم'], place: 'School', at: '2026-10-24T14:45' };
    assert.equal(await p.add('Other/active.md', values, { daily: true }), true);
    assert(notes.has('Daily/2026-10-24.md'));
    assert(!notes.has('Other/active.md'));
    assert(notes.get('Daily/2026-10-24.md').startsWith('## یادآوری‌ها\n'));
    const destination = 'Daily/2026-10-25.md';
    notes.set(destination, '---\nkeep: yes\n---\n\n## یادآوری‌ها\n- [x] Existing\n\n## Diary\nUnchanged');
    assert.equal(await p.add('Wrong.md', { ...values, at: '2026-10-25T14:45' }, { daily: true }), true);
    assert(notes.get(destination).includes('- [x] Existing\n- [ ] Selected day'));
    assert(notes.get(destination).endsWith('## Diary\nUnchanged\n'));
    assert(!notes.has('Wrong.md'));
    // Unsaved text in an open Markdown editor must survive insertion too.
    const view = new MarkdownView();
    view.file = new TFile(destination);
    let unsaved = '---\nkeep: edited\n---\n\n## یادآوری‌ها\n\n## Diary\nUNSAVED';
    const offset = position => unsaved.split('\n').slice(0, position.line).reduce((sum, line) => sum + line.length + 1, 0) + position.ch;
    view.editor = {
        getValue: () => unsaved,
        offsetToPos: index => { const parts = unsaved.slice(0, index).split('\n'); return { line: parts.length - 1, ch: parts.at(-1).length }; },
        replaceRange: (text, from, to = from) => { const a = offset(from), b = offset(to); unsaved = unsaved.slice(0, a) + text + unsaved.slice(b); }
    };
    views.push(view);
    assert.equal(await p.add('Wrong.md', { ...values, at: '2026-10-25T16:15' }, { daily: true }), true);
    assert(unsaved.includes('keep: edited'));
    assert(unsaved.includes('Selected day #مهم'));
    assert(unsaved.endsWith('UNSAVED\n'));
    assert(!unsaved.includes('## Diary\nUNSAVESelected'));
    assert.equal(await p.add('Manual.md', values), true);
    assert(notes.get('Manual.md').startsWith('- [ ] Selected day'));
    const item = { path: 'Keep.md', at: '2026-10-24T14:45' };
    const modal = new TaskModal(p, item);
    assert.equal(modal.useDaily, false);
    assert.equal(modal.destination, 'Keep.md');
    const dailyModal = new TaskModal(p, null, new Date(2026, 9, 29));
    assert.equal(dailyModal.useDaily, true);
    assert.equal(dailyModal.date.getDate(), 29);
    // A selected Templater template is fully rendered before the task is inserted.
    p.settings.dailyUseTemplater = true;
    p.settings.dailyTemplatePath = 'Templates/Daily.md';
    notes.set('Templates/Daily.md', '<% tp.file.title %>');
    let templateRuns = 0;
    p.app.vault.getRoot = () => ({ path: '' });
    p.app.plugins.getPlugin = id => id === 'templater-obsidian' ? { templater: {
        async create_new_note_from_template(template, folder, name, open) {
            templateRuns++;
            assert.equal(template.path, 'Templates/Daily.md');
            assert.equal(folder, 'Daily'); assert.equal(name, '2026-10-28'); assert.equal(open, false);
            await new Promise(resolve => setTimeout(resolve, 5));
            const target = folder + '/' + name + '.md';
            assert(!notes.has(target), 'concurrent daily writes must not create duplicate notes');
            notes.set(target, '# ' + name + '\n\n## یادآوری‌ها\n\n## Diary\nTemplate content\n');
            return new TFile(target);
        }
    } } : null;
    const templateValues = { ...values, at: '2026-10-28T14:45' };
    const results = await Promise.all([p.add('', templateValues, { daily: true }), p.add('', { ...templateValues, title: 'Second task' }, { daily: true })]);
    assert(results.every(Boolean));
    assert.equal(templateRuns, 1);
    assert(notes.get('Daily/2026-10-28.md').startsWith('# 2026-10-28'));
    assert(notes.get('Daily/2026-10-28.md').includes('Second task'));
    assert(notes.get('Daily/2026-10-28.md').endsWith('Template content\n'));
    p.app.plugins.getPlugin = () => null;
    assert.equal(await p.add('', templateValues, { daily: true }), true, 'existing daily notes must work with Templater disabled');
    const previousLog = console.error; console.error = () => {};
    assert.equal(await p.add('', { ...values, at: '2026-10-29T12:00' }, { daily: true }), false);
    assert(!notes.has('Daily/2026-10-29.md'), 'missing Templater must not create a raw template or a blank replacement');
    console.error = previousLog;
    console.log('OK: selected-day routing, Jalali/Gregorian/custom paths, core daily settings, folders, headings, YAML, fences, CRLF, unsaved editor text, manual destinations, edit behavior, Templater execution order and concurrent writes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
