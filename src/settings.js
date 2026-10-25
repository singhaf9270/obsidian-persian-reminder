const { PluginSettingTab, Setting, Notice } = require('obsidian');
const { PALETTES, DEFAULTS } = require('./core/constants');
const { fa, iso, en } = require('./core/dates');
const { dailyOptions, dailyNotePath } = require('./core/daily-notes');
const { E, I, B } = require('./shared/dom');
const { gradientAngle, cardTint, contrastText, paintRemaining } = require('./core/appearance');

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
