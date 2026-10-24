const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const notices = [];
const external = id => {
    if (id === 'obsidian') return {
        Plugin: class {}, Modal: class {}, ItemView: class {}, PluginSettingTab: class {}, Setting: class {},
        Notice: class { constructor(text) { notices.push(text); } }, TFile: class {}, MarkdownView: class {}, Platform: { isMobile: false }
    };
    if (id === '@codemirror/view') return { ViewPlugin: { fromClass: () => ({}) }, Decoration: {}, WidgetType: class {} };
    if (id === '@codemirror/state') return { StateEffect: { define: () => ({}) } };
    throw Error(id);
};
const result = { exports: {} };
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../main.js'), 'utf8') + '\nmodule.exports.testRequire = __prRequire;',
    { module: result, require: external, Date, console, window: {} });
const Plugin = result.exports;
const { DEFAULTS } = Plugin.testRequire('src/core/constants.js');
const { iso, fromISO } = Plugin.testRequire('src/core/dates.js');
const { parseTask } = Plugin.testRequire('src/core/tasks.js');
const { ReminderAlert } = Plugin.testRequire('src/ui/reminder-alert.js');
const p = new Plugin();
p.app = {};
p.settings = structuredClone(DEFAULTS);
const at = offset => iso(new Date(Date.now() + offset));
const task = (id, delta = -60000, done = false) => ({
    title: id, path: 'Daily.md', raw: '- [ ] ' + id, at: at(delta), tags: [], place: '', done
});
let tasks = [task('due-a'), task('due-b'), task('future', 3600000), task('old', -90000000), task('done', -60000, true)];
p.items = () => tasks;
const calls = [];
p.showAlerts = items => calls.push(items.map(item => item.title));
let saved = 0;
p.persist = async () => { saved++; };
(async () => {
    await p.notify();
    assert.equal(JSON.stringify(calls), JSON.stringify([['due-a', 'due-b']]));
    assert.equal(saved, 1);
    await p.notify();
    assert.equal(calls.length, 1, 'due tasks must not repeat every timer tick');
    p.settings.notificationMode = 'off';
    tasks.push(task('off-unseen'));
    await p.notify();
    assert(!p.settings.notified['Daily.md|- [ ] off-unseen']);
    p.settings.notificationMode = 'notice';
    await p.notify();
    assert.equal(notices.length, 1);
    assert(notices[0].includes('off-unseen'));
    p.settings.notificationMode = 'modal';
    let release;
    p.persist = () => new Promise(resolve => { release = resolve; });
    tasks.push(task('concurrent'));
    const first = p.notify();
    await p.notify();
    assert.equal(calls.length, 2, 'overlapping checks must not stack duplicate alerts');
    release(); await first;
    p.persist = async () => {};
    // One dialog receives multiple batches rather than opening one per task.
    const queuePlugin = new Plugin(); queuePlugin.app = {}; queuePlugin.settings = p.settings;
    let opens = 0;
    ReminderAlert.prototype.open = function () { opens++; };
    queuePlugin.showAlerts([task('one')]);
    queuePlugin.showAlerts([task('one'), task('two')]);
    assert.equal(opens, 1);
    assert.equal(queuePlugin.alertModal.items.length, 2);
    // Snooze changes the original task's reminder, keeping its Markdown metadata.
    const snoozePlugin = { app: {}, settings: { dateFormat: 'gregorian', snoozeMinutes: 10 }, api: () => null };
    let raw = '- [ ] Keep **formatting** #school 📍[Room] (@2026-10-24 08:30)';
    const item = { ...parseTask(snoozePlugin, raw), path: 'Daily.md' };
    snoozePlugin.change = async (_item, transform) => { raw = transform(raw); return true; };
    const alert = new ReminderAlert(snoozePlugin, [item]);
    alert.body = { querySelectorAll: () => [] };
    let closed = false;
    alert.close = () => { closed = true; };
    alert.renderItems = () => {};
    const earliest = Date.now() + 10 * 60000;
    await alert.snooze(item);
    assert(closed);
    assert(raw.startsWith('- [ ] Keep **formatting** #school 📍[Room]'));
    const nextDate = fromISO(parseTask(snoozePlugin, raw).at).getTime();
    assert(nextDate >= earliest && nextDate <= earliest + 61000);
    // A failed write leaves the item in the alert so it can be retried.
    const failure = new ReminderAlert(snoozePlugin, [item]);
    failure.body = { querySelectorAll: () => [] }; failure.renderItems = () => {};
    snoozePlugin.change = async () => false;
    await failure.run(item, value => value);
    assert.equal(failure.items.length, 1);
    console.log('OK: due-only alerts, deduplication, concurrent checks, off/notice/modal modes, one queued dialog, snooze metadata preservation and failed-write retry.');
})().catch(error => { console.error(error); process.exitCode = 1; });
