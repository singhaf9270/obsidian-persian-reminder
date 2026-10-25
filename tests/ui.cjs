// Structural UI integration using the compiled bundle and native-control fakes.
// This intentionally does not claim to test WebView rendering or physical keyboards.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
class Element {
    constructor(tag, ownerDocument) {
        this.tagName = tag; this.ownerDocument = ownerDocument; this.children = []; this.parentElement = null;
        this.attributes = {}; this.listeners = new Map(); this.className = ''; this._text = ''; this.value = '';
        this.scrollTop = 0;
        const properties = new Map();
        this.style = { setProperty: (key, value) => properties.set(key, value), removeProperty: key => properties.delete(key), getPropertyValue: key => properties.get(key) };
        const tokens = () => this.className.split(/\s+/).filter(Boolean);
        this.classList = {
            add: (...names) => { this.className = [...new Set([...tokens(), ...names])].join(' '); },
            remove: (...names) => { this.className = tokens().filter(name => !names.includes(name)).join(' '); },
            contains: name => tokens().includes(name),
            toggle: (name, state) => { const active = state ?? !tokens().includes(name); active ? this.classList.add(name) : this.classList.remove(name); return active; }
        };
    }
    addClass(...names) { this.classList.add(...names); }
    appendChild(child) { this.children.push(child); child.parentElement = this; return child; }
    append(...children) { children.forEach(child => this.appendChild(child)); }
    replaceChildren(...children) { this.children = []; this._text = ''; this.append(...children); }
    set textContent(text) { this._text = String(text); this.children = []; }
    get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
    setAttribute(key, value) { this.attributes[key] = String(value); }
    getAttribute(key) { return this.attributes[key]; }
    removeAttribute(key) { delete this.attributes[key]; }
    addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(fn); }
    removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
    async fire(type, extra = {}) { for (const fn of this.listeners.get(type) || []) await fn({ target: this, ...extra }); }
    matches(selector) { return selector.split(',').some(part => part[0] === '.' ? this.classList.contains(part.slice(1)) : this.tagName === part.trim()); }
    querySelectorAll(selector) { return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    contains(element) { return this === element || this.children.some(child => child.contains(element)); }
    getBoundingClientRect() { return { top: 0, bottom: 500 }; }
    remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this); }
}
const win = new EventTarget(); win.visualViewport = new EventTarget();
win.visualViewport.height = 844; win.visualViewport.offsetTop = 0;
Object.assign(win, { innerHeight: 844, setTimeout, clearTimeout, requestAnimationFrame: fn => setTimeout(fn, 0), cancelAnimationFrame: clearTimeout, matchMedia: () => ({ matches: true }) });
const document = { defaultView: win, activeElement: null, hidden: false, createElement(tag) { return new Element(tag, this); } };
document.createElementNS = function(namespace, tag) { return new Element(tag, this); };
document.body = document.createElement('body');
const settingRows = [];
class Setting {
    constructor(parent) {
        this.settingEl = parent.appendChild(document.createElement('div')); this.settingEl.className = 'setting-item';
        this.nameEl = this.settingEl.appendChild(document.createElement('div'));
        this.descEl = this.settingEl.appendChild(document.createElement('div'));
        this.controlEl = this.settingEl.appendChild(document.createElement('div'));
        settingRows.push(this);
    }
    setName(name) { this.nameEl.textContent = name; return this; }
    setDesc(text) { this.descEl.textContent = text; return this; }
    control(tag, type) {
        const el = this.controlEl.appendChild(document.createElement(tag)); el.type = type;
        const component = {
            inputEl: el, sliderEl: el, setValue: value => { el.value = value; if (type === 'checkbox') el.checked = value; return component; },
            getValue: () => el.value, setPlaceholder: text => { el.placeholder = text; return component; },
            setDisabled: value => { el.disabled = value; return component; },
            setLimits: (min, max, step) => { Object.assign(el, { min, max, step }); return component; },
            addOption: (value, label) => { const option = document.createElement('option'); option.value = value; option.textContent = label; el.appendChild(option); return component; },
            onChange: fn => { el.addEventListener('change', () => fn(type === 'checkbox' ? el.checked : type === 'range' ? Number(el.value) : el.value)); return component; },
            onClick: fn => { el.addEventListener('click', fn); return component; },
            setButtonText: text => { el.textContent = text; return component; }, setCta: () => component,
            setIcon: () => component, setTooltip: () => component
        };
        return component;
    }
    addText(fn) { fn(this.control('input', 'text')); return this; }
    addSlider(fn) { fn(this.control('input', 'range')); return this; }
    addColorPicker(fn) { fn(this.control('input', 'color')); return this; }
    addDropdown(fn) { fn(this.control('select')); return this; }
    addToggle(fn) { fn(this.control('input', 'checkbox')); return this; }
    addButton(fn) { fn(this.control('button')); return this; }
    addExtraButton(fn) { return this.addButton(fn); }
}
class Modal {
    constructor(app) { this.app = app; this.modalEl = document.createElement('div'); this.contentEl = this.modalEl.appendChild(document.createElement('div')); }
    open() { document.body.appendChild(this.modalEl); this.onOpen(); }
    close() { this.onClose(); this.modalEl.remove(); }
}
const obsidian = { Plugin: class {}, Modal, Setting, ItemView: class { constructor(leaf) { this.contentEl = leaf.contentEl; } },
    PluginSettingTab: class { constructor(app) { this.app = app; this.containerEl = document.createElement('div'); } },
    Notice: class {}, TFile: class {}, MarkdownView: class {}, Platform: { isMobile: true }, setIcon: () => {} };
const external = id => {
    if (id === 'obsidian') return obsidian;
    if (id === '@codemirror/view') return { ViewPlugin: { fromClass: () => ({}) }, Decoration: {}, WidgetType: class {} };
    if (id === '@codemirror/state') return { StateEffect: { define: () => ({}) } };
    throw Error(id);
};
const result = { exports: {} };
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../main.js'), 'utf8') + '\nmodule.exports.testRequire = __prRequire;',
    { module: result, require: external, Date, console, document, window: win, structuredClone });
const Plugin = result.exports, load = Plugin.testRequire;
const { DEFAULTS } = load('src/core/constants.js');
const { SettingsTab } = load('src/settings.js');
const { Sidebar } = load('src/views/sidebar.js');
const { taskCard } = load('src/ui/task-card.js');
const { iso } = load('src/core/dates.js');
const p = new Plugin(); p.settings = structuredClone(DEFAULTS); p.index = new Map();
p.app = { workspace: { getLeavesOfType: () => [], getActiveFile: () => null },
    plugins: { getPlugin: id => id === 'templater-obsidian' ? { settings: { templates_folder: 'Templates' } } : null },
    vault: { getMarkdownFiles: () => [{ path: 'Templates/Daily.md' }, { path: 'Unrelated.md' }] } };
p.persist = async () => {};
const row = name => [...settingRows].reverse().find(row => row.nameEl.textContent === name);
(async () => {
    p.applyTheme();
    const settings = new SettingsTab(p.app, p); settings.display();
    const channels = settings.containerEl.querySelector('.ot-channel-grid');
    assert.equal(channels.children.length, 3);
    assert.equal(channels.querySelectorAll('a').length, 3);
    const donation = settings.containerEl.querySelector('.ot-donation');
    assert(!channels.contains(donation));
    assert.equal(donation.querySelector('a').getAttribute('href'), 'https://reymit.ir/singhaf9270');
    assert.equal(channels.children[2].querySelector('svg').children[1].getAttribute('fill'), '#fff');
    for (const page of ['general', 'daily', 'appearance', 'tags']) settings.showPage(page);
    settings.showPage('appearance');
    const angle = row('زاویهٔ گرادیانت').controlEl.querySelector('input'); angle.value = 250; await angle.fire('change');
    assert.equal(document.body.style.getPropertyValue('--pr-gradient-angle'), '250deg');
    const tint = row('شدت رنگ کارت‌ها').controlEl.querySelector('input'); tint.value = 35; await tint.fire('change');
    assert.equal(document.body.style.getPropertyValue('--pr-card-tint'), '35%');
    assert(settings.containerEl.querySelector('.pr-settings-preview').classList.contains('pr-card-surface'));
    const add = row('بازهٔ دلخواه').controlEl.querySelector('button'); await add.fire('click');
    assert.equal(p.settings.remainingRules.length, 3);
    const days = row('حداکثر روز باقی‌مانده').controlEl.querySelector('input'); days.value = '4'; await days.fire('change');
    assert.equal(p.settings.remainingRules.at(-1).days, 4);
    const today = new Date(); today.setHours(23, 59, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const item = { title: 'test', tags: [], place: '', path: 'Daily.md', at: iso(tomorrow), done: false, raw: '- [ ] test' };
    p.index.set('Daily.md', [item]);
    const root = document.createElement('div');
    const card = taskCard(p, root, item, true);
    assert(card.classList.contains('pr-card-surface'));
    assert(card.querySelector('.pr-remaining').textContent.includes('فردا'));
    const sidebar = new Sidebar({ contentEl: document.createElement('div') }, p); sidebar.render();
    assert.equal(sidebar.filter, 'all');
    settings.showPage('daily');
    const toggle = row('استفاده از قالب Templater').controlEl.querySelector('input'); toggle.checked = true; await toggle.fire('change');
    const templates = row('قالب روزانه').controlEl.querySelector('select');
    assert(templates.children.some(option => option.value === 'Templates/Daily.md'));
    assert(!templates.children.some(option => option.value === 'Unrelated.md'));
    templates.value = 'Templates/Daily.md'; await templates.fire('change');
    assert.equal(p.settings.dailyTemplatePath, 'Templates/Daily.md');
    // Execute the real alert's onOpen/render paths on a mobile host.
    p.showAlerts([item, { ...item, title: 'second' }, { ...item, title: 'third' }]);
    assert.equal(p.alertModal.body.querySelectorAll('.pr-alert-item').length, 1);
    assert(p.alertModal.modalEl.classList.contains('pr-mobile-modal'));
    assert.equal(p.alertModal.body.querySelector('.pr-alert-item').querySelector('h3').textContent, 'test');
    await p.alertModal.body.querySelector('.pr-alert-next').fire('click');
    assert.equal(p.alertModal.body.querySelector('h3').textContent, 'second');
    p.alertModal.close(); assert.equal(p.alertModal, null);
    console.log('OK: compiled settings controls, template filtering/selection, gradient live updates, remaining rules, shared card surface, all-active sidebar and compact mobile alert queue.');
})().catch(error => { console.error(error); process.exitCode = 1; });

