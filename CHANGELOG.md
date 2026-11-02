## Persian Reminder 1.0.11

### فارسی

- ویجت «برنامهٔ پیش‌رو» اکنون از همان کامپوننت کارت و استایل سایدبار استفاده می‌کند؛ شامل چیدمان، پس‌زمینه، حاشیه، تگ‌های بومی Obsidian، مسیر یادداشت و دکمه‌های عملیات.
- اطلاعات مکان و هشتگ‌ها در کارت‌های ویجت مانند سایدبار نمایش داده می‌شوند.
- تسک‌های بدون ساعت تا پایان همان روز معتبر می‌مانند و ساعت ساختگی در کارت نمایش داده نمی‌شود.
- چیدمان ویجت در صفحه‌های باریک و موبایل از رفتار کارت‌های فشردهٔ سایدبار پیروی می‌کند.

### English

- Reuse the exact shared sidebar task-card component in the upcoming agenda widget.
- Match sidebar layout, surfaces, native Obsidian tags, note path and action controls.
- Preserve locations and hashtags, and treat date-only tasks as due at the end of the day without showing a fake time.

## Persian Reminder 1.0.10

### فارسی

- یکپارچه‌سازی ظاهر ویجت «برنامهٔ پیش رو» با رنگ‌ها، پس‌زمینه، حاشیه‌ها و نشان‌های تاریخ افزونه در تم روشن و تاریک.
- نمایش هشتگ‌های هر کار در ویجت با همان کلاس و ظاهر تگ‌های بومی Obsidian در سایدبار؛ هشتگ‌ها از عنوان جدا می‌شوند.
- بازطراحی کارت‌ها و نشانگرهای تاریخ، ساعت و فاصله تا سررسید برای خوانایی بهتر.
- بهبود چیدمان واکنش‌گرا بر اساس عرض پنل و صفحهٔ موبایل؛ جلوگیری از بیرون‌زدگی عنوان‌ها و برچسب‌ها.
- کاهش انیمیشن در صورت فعال بودن تنظیم کاهش حرکت سیستم.

### English

- Match the upcoming agenda widget to Persian Reminder's shared light/dark theme, card surfaces, borders and date badges.
- Parse task hashtags and render them with Obsidian's native `.tag` styling, matching sidebar tags.
- Refine task cards and date/time/relative-day badges for consistent readability.
- Improve pane-aware and mobile responsive layouts, including long titles and tags.
- Respect reduced-motion preferences.

## Persian Reminder 1.0.9

### فارسی

- **ویجت «برنامهٔ پیش رو»:** بلوک کد `persian-reminder` وظایف تیک‌نخوردهٔ دارای نشانگر تاریخ `(@YYYY-MM-DD)` را از تمام فایل‌های Markdown ولت جمع‌آوری می‌کند؛ ساعت اختیاری است و قالب شمسی افزونه نیز پشتیبانی می‌شود.
- **نمایش کارهای آینده:** فقط وظایف تیک‌نخوردهٔ امروز و آینده نمایش داده می‌شوند و بر اساس زمان سررسید مرتب هستند؛ ساعت برای وظایف بدون ساعت، اختیاری است.
- **کارت‌های بازطراحی‌شده:** ظاهر کارت‌ها با الهام از اسکریپت PersianTasks.js بازطراحی شده؛ تاریخ شمسی، ساعت در صورت ثبت و برچسب امروز/فردا/روزهای آینده نمایش داده می‌شود.
- **رفتن به یادداشت مبدأ:** با انتخاب هر کارت، یادداشت اصلی در محل همان کار باز می‌شود.
- **سازگاری با موبایل و تم‌ها:** چیدمان در عرض کم جمع‌وجور می‌شود و از رنگ‌های استاندارد تم Obsidian استفاده می‌کند.
- **اعلان به‌روزرسانی:** پس از ارتقا، پیام معرفی نسخه نمایش داده می‌شود و شرح قابلیت‌ها در صفحهٔ «تازه‌های نسخه» تنظیمات باقی می‌ماند.

برای استفاده، این بلوک را در هر یادداشتی قرار دهید:

```persian-reminder
```

وظایف با نشانگر تاریخ در متن یادداشت‌ها شناسایی می‌شوند؛ برای نمونه `- [ ] آماده‌کردن جلسه (@2026-11-03 09:30)`. ویجت همهٔ یادداشت‌های Markdown را می‌خواند و فایل یا دادهٔ جداگانه‌ای نمی‌سازد. برای نمایش تاریخ شمسی، Persian Calendar باید فعال باشد.

### English

- Add a vault-wide **Upcoming agenda** widget using the `persian-reminder` code block.
- Find unchecked Markdown tasks with `(@YYYY-MM-DD)` date markers across the vault; time is optional. Show only today and future tasks, sorted by due date.
- Redesign the cards based on the supplied PersianTasks.js visual reference, with Jalali date, optional time, and a relative-day badge.
- Open the original note at the reminder line when a card is selected.
- Improve mobile layout and light/dark theme compatibility.
- Add a one-time update announcement and a persistent **What's new** page in settings.

## Persian Reminder 1.0.8

- Add a `persian-reminder` code block to display reminders belonging to the current note.
- Add reminders directly from the note-level widget, keeping the current note as the destination.
- Refresh note widgets when reminder data changes.
- Update test fixtures and generated stylesheet bundle for the new widget.

### فارسی

- افزودن ویجت یادآوری به هر یادداشت با بلوک کد `persian-reminder`.
- نمایش یادآوری‌های همان یادداشت همراه با امکان افزودن یادآوری جدید.
- به‌روزرسانی خودکار ویجت پس از تغییر یادآوری‌ها.

## Persian Reminder 1.0.7

- Restored the original channel logo artwork, including YouTube's white play symbol.
- Placed Bale, Telegram and YouTube in three equal cards above the support section.
- Redesigned donation support as a separate full-width panel below the channels.
- Preserved light/dark theme colors, RTL labels and keyboard focus.

## Persian Reminder 1.0.6

- Redesigned the settings footer with matching Bale, Telegram and YouTube cards.
- Added a donation card linking to the developer's Reymit support page.
- Supports light/dark themes, narrow screens and keyboard focus.
- Persian interface preserved.

### فارسی

- طراحی یکپارچهٔ بخش ارتباط با ما در انتهای تنظیمات.
- افزودن کارت حمایت مالی با لینک ریمیت.
- سازگار با تم روشن و تاریک و صفحه‌های کوچک.

## 1.0.5

- Save pending clock changes when using the main Save button; keep explicit clock cancellation.
- Read and validate manually typed Persian/English hours and minutes before saving.
- Add a donation link in settings and the plugin manifest.

## 1.0.4

- Schedule the next reminder deadline directly, with a watchdog and rescans after resume or delayed Persian Calendar startup.
- Do not mark hidden or failed alerts as delivered; accept Persian and Arabic-Indic digits in reminder markers.
- Show one compact alert card at a time on desktop and mobile, with completion, snooze and next-reminder actions.
- Add an optional Templater daily template picker. Await rendering before inserting a task, preserve existing notes and serialize concurrent writes to one daily note.
- Default the sidebar to all active tasks.
- Use one gradient surface for real task cards and the settings preview; add gradient angle and card tint controls.
- Add configurable remaining-time colors for today, overdue and completed tasks, plus editable day thresholds with nearest-range precedence.
- Add scheduling, Templater, color-rule and structural UI integration regression tests.

## 1.0.3

- Add queued in-app due-time alerts with complete, snooze and open-note actions, a preview button and configurable alert mode.

- Organize settings into General, Daily notes, Appearance and Hashtag pages, with live previews and per-badge resets.
- Share headers, day navigation, calendars, statistics and card styles between the sidebar and dashboard.
- Route new tasks from both views to the selected day’s note, supporting configurable folders, Jalali/Gregorian filenames and optional core Daily notes settings.
- Insert tasks under the configured heading while preserving existing sections, frontmatter, line endings and unsaved editor text.
- Give the modal one scrollable form with a fixed header/footer; track the mobile visual viewport and reveal the focused input above the keyboard.
- Preserve search focus, filter drafts and calendar navigation during background refreshes.
- Prevent duplicate saves while a write is in progress and improve control labels.
- Add regression tests for daily-note writes and keyboard event handling.

## 1.0.2

- Fix reported CSS compatibility warnings in the modal, sidebar, dashboard, and task cards.
- Replace column/row gap declarations with equivalent gap shorthand in optional style modules.
- Include an npm lockfile for reproducible dependency-free builds.
- Verify generated bundles against source in GitHub Actions.
- Generate provenance attestations for main.js, styles.css, and manifest.json.
- Document vault-wide reminder scanning and build verification in the English README.
- Include the author and English description already added after the 1.0.1 review.

### نصب / به‌روزرسانی

سه فایل main.js، styles.css و manifest.json را در پوشهٔ افزونه جایگزین کنید و افزونه را یک بار خاموش و روشن کنید. فایل data.json را نگه دارید. افزونهٔ Persian Calendar باید نصب و فعال باشد.
