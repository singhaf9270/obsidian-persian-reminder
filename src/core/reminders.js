const { fromISO } = require('./dates');

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
