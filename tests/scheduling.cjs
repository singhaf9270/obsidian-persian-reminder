const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
let time = new Date(2026, 9, 24, 10, 0, 59).getTime();
class ClockDate extends Date { constructor(...args) { super(...(args.length ? args : [time])); } static now() { return time; } }
const document = { hidden: false };
const result = { exports: {} };
const obsidian = { Plugin: class {}, Modal: class {}, ItemView: class {}, PluginSettingTab: class {}, Setting: class {},
    Notice: class {}, TFile: class {}, MarkdownView: class {}, Platform: { isMobile: false } };
const external = id => {
    if (id === 'obsidian') return obsidian;
    if (id === '@codemirror/view') return { ViewPlugin: { fromClass: () => ({}) }, Decoration: {}, WidgetType: class {} };
    if (id === '@codemirror/state') return { StateEffect: { define: () => ({}) } };
    throw Error(id);
};
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../main.js'), 'utf8') + '\nmodule.exports.testRequire = __prRequire;',
    { module: result, require: external, Date: ClockDate, console, document, window: {} });
const Plugin = result.exports;
const { ReminderScheduler, reminderKey } = Plugin.testRequire('src/core/reminders.js');
const { DEFAULTS } = Plugin.testRequire('src/core/constants.js');
const timers = new Map(); let serial = 0;
const host = {
    setTimeout(callback, delay) { const id = ++serial; timers.set(id, { callback, at: time + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    setInterval(callback, interval) { const id = ++serial; timers.set(id, { callback, at: time + interval, interval }); return id; },
    clearInterval(id) { timers.delete(id); }
};
async function advance(ms) {
    const target = time + ms;
    for (let limit = 0; limit < 10000; limit++) {
        const next = [...timers].filter(([, task]) => task.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!next) { time = target; return; }
        const [id, timer] = next; time = timer.at;
        if (timer.interval) timer.at += timer.interval; else timers.delete(id);
        await timer.callback();
    }
    throw Error('Timer busy loop');
}
const p = new Plugin(); p.settings = structuredClone(DEFAULTS);
let tasks = [{ title: 'deadline', path: 'Daily.md', raw: '- [ ] deadline', at: '2026-10-24T10:01', done: false }];
const api = {}; let currentApi = api, scans = 0;
p.api = () => currentApi;
p.items = () => tasks;
p.scanAll = async () => { scans++; };
p.refresh = () => {};
p.persist = async () => {};
const shown = []; p.showAlerts = items => shown.push(items.map(item => item.title));
(async () => {
    const scheduler = new ReminderScheduler(p, host);
    await scheduler.start();
    await advance(999); assert.equal(shown.length, 0);
    await advance(1); assert.equal(shown.length, 1, 'deadline must fire at the due second, without waiting 30 seconds');
    await advance(60000); assert.equal(shown.length, 1);
    // A title/metadata-preserving edit with a new timestamp must rearm the task.
    tasks[0] = { ...tasks[0], at: '2026-10-24T10:03', raw: 'changed metadata' };
    scheduler.wake(); await advance(60000);
    assert.equal(shown.length, 2);
    // A completed task must be removed from pending deadlines.
    tasks.push({ title: 'completed', path: 'Daily.md', raw: '', at: '2026-10-24T10:04', done: true });
    scheduler.wake(); await advance(60000); assert.equal(shown.length, 2);
    // Suppressed WebViews must leave reminders undelivered for the next resume.
    tasks.push({ title: 'missed', path: 'Daily.md', raw: '', at: '2026-10-24T10:05', done: false });
    document.hidden = true; scheduler.wake(); await advance(2 * 60000);
    assert.equal(shown.length, 2);
    assert(!p.settings.notified[reminderKey(tasks.at(-1))]);
    document.hidden = false; scheduler.wake(true); await advance(100);
    assert.equal(shown.length, 3); assert(scans >= 2);
    // Changing calendar-plugin availability triggers a rescan.
    const previousScans = scans; currentApi = null; scheduler.wake(); await advance(100);
    currentApi = api; scheduler.wake(); await advance(100);
    assert(scans >= previousScans + 2);
    // Old raw-line delivery records must not suppress the new delivery scheme.
    const legacy = { title: 'legacy', path: 'Daily.md', raw: '- [ ] legacy', at: '2026-10-24T10:05' };
    p.settings.notified[legacy.path + '|' + legacy.raw] = time;
    tasks.push(legacy); scheduler.wake(); await advance(100);
    assert(shown.at(-1).includes('legacy'));
    // A failed popup is not marked delivered, and gets a bounded retry.
    const broken = { title: 'retry', path: 'Daily.md', raw: '', at: '2026-10-24T10:05' };
    tasks.push(broken); const oldShow = p.showAlerts; const oldLog = console.error;
    console.error = () => {}; p.showAlerts = () => { throw Error('host failure'); };
    scheduler.wake(); await advance(100);
    assert(!p.settings.notified[reminderKey(broken)]);
    p.showAlerts = oldShow; console.error = oldLog;
    await advance(1000); assert(shown.at(-1).includes('retry'));
    scheduler.stop(); assert.equal(timers.size, 0);
    console.log('OK: precise deadlines, rearming, completion, background/resume, calendar readiness, legacy notifications, failed-popup retry and timer cleanup.');
})().catch(error => { console.error(error); process.exitCode = 1; });
