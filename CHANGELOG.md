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
