// Live Preview widgets and colored-task line decorations.
const { Platform } = require('obsidian');
const { ViewPlugin, Decoration, WidgetType } = require('@codemirror/view');
const { StateEffect } = require('@codemirror/state');
const { E, I } = require('../shared/dom');
const { parseTask, status, tagColor } = require('../core/tasks');
const { dateFa, clockFa, fromISO } = require('../core/dates');
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
