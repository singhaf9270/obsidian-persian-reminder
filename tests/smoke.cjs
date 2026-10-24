const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

const { parseTask, buildTask, updateTaskPreservingText, tagColor } = require('../src/core/tasks');
const { dateFa, fromISO, iso } = require('../src/core/dates');
const mockPlugin = {
  settings: { dateFormat: 'jalali', tagColors: { 'مهم': '#fc7777' } },
  api: () => ({
    gregorianToJalali: (gy,gm,gd) => gy===2026&&gm===12&&gd===4 ? {jy:1405,jm:9,jd:13} : null,
    jalaliToDate: (y,m,d) => y===1405&&m===9&&d===13 ? new Date(2026,11,4) : null,
    toFaNumber: text => text.replace(/\d/g, digit => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]),
    toEnNumber: text => text.replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  })
};

const raw = '- [ ] جلسه #مهم 📍[مدرسه] (@j:1405-09-13 12:00)';
const item = parseTask(mockPlugin, raw);
assert.equal(item.title, 'جلسه');
assert.equal(item.place, 'مدرسه');
assert.deepEqual(item.tags, ['مهم']);
assert.equal(item.at, '2026-12-04T12:00');
assert.equal(parseTask(mockPlugin, raw.replace('1405-09-13 12:00', '۱۴۰۵-۰۹-۱۳ ۱۲:۰۰')).at, item.at);
assert.equal(parseTask(mockPlugin, raw.replace('1405-09-13 12:00', '١٤٠٥-٠٩-١٣ ١٢:٠٠')).at, item.at);
assert.equal(dateFa(mockPlugin, fromISO(item.at)), '۱۴۰۵/۰۹/۱۳');
assert.equal(tagColor(mockPlugin,item), '#fc7777');
const newLine = updateTaskPreservingText(mockPlugin, raw, {...item, at:'2026-12-04T15:30'});
assert.equal(newLine, '- [ ] جلسه #مهم 📍[مدرسه] (@j:1405-09-13 15:30)');
assert.equal(buildTask(mockPlugin,null,{title:'جلسه',tags:['مهم'],place:'مدرسه',at:'2026-12-04T15:30'}),newLine);
assert.equal(tagColor(mockPlugin,{tags:['عادی']}),null);

const fakeObsidian = {
  Plugin: class {}, Modal: class {}, ItemView: class {}, Notice: class {},
  MarkdownView: class {}, PluginSettingTab: class {}, Setting: class {},
  TFile: class {}, Platform: {isMobile:false}, setIcon:()=>{}
};
const loaders = moduleId => {
  if (moduleId === 'obsidian') return fakeObsidian;
  if (moduleId === '@codemirror/view') return {
    ViewPlugin: { fromClass:()=>({}) },
    Decoration: { line:()=>({range:()=>{}}), widget:()=>({range:()=>{}}), replace:()=>({range:()=>{}}), set:()=>({}) },
    WidgetType: class {}
  };
  if (moduleId === '@codemirror/state') return { StateEffect: { define:()=>({of:()=>({})}) } };
  throw Error('Unexpected runtime dependency: '+moduleId);
};
function loadBundle(file) {
  const result={exports:{}};
  vm.runInNewContext(fs.readFileSync(file,'utf8'),{module:result,require:loaders,console,window:{}},{timeout:3000});
  return result.exports;
}
const fresh=loadBundle(path.resolve(root,'main.js'));
assert.equal(typeof fresh,'function');
assert.deepEqual(Object.getOwnPropertyNames(fresh.prototype), [
  'constructor', 'onload', 'onunload', 'api', 'persist', 'applyTheme',
  'requestEditorUpdate', 'show', 'sidebar', 'dashboard', 'create', 'edit',
  'destination', 'dailyDestination', 'editor', 'openFromCM', 'openTask', 'scanAll', 'scan',
  'indexText', 'items', 'refresh', 'findLine', 'change', 'remove',
  'add', 'openFile', 'reading', 'showAlerts', 'notify'
]);
console.log('OK: Jalali parse/write, saved task metadata, task colors, output module load and plugin methods.');
