// Settings: palette swatches, tag-to-task coloring, daily-note folder, notification window.
const { PluginSettingTab, Setting, Notice } = require('obsidian');
const { PALETTES, DEFAULTS } = require('./core/constants');
const { fa } = require('./core/dates');

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