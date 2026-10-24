# Persian Reminder — source code modules

این نسخه، **ساختار ماژولار همان کد نسخهٔ ۲.۳** است. برای اصلاحات بعدی، فایل مربوط در پوشهٔ `src` را ویرایش کن؛ سپس خروجی قابل نصب را بساز.

## راهنمای پیدا کردن بخش‌ها

| قابلیت | فایل JavaScript | فایل CSS |
| --- | --- | --- |
| ساعت Material | `src/ui/material-clock.js` | `src/styles/75-material-clock.css` |
| تقویم شمسی | `src/ui/calendar.js` و `src/core/dates.js` | `src/styles/21-calendar.css` |
| پنجرهٔ افزودن/ویرایش | `src/ui/task-modal.js` | `src/styles/20-modal-calendar.css` |
| کارت تسک و زمان باقی‌مانده | `src/ui/task-card.js` | `src/styles/40-task-cards.css` و `src/styles/70-theme.css` |
| سایدبار | `src/views/sidebar.js` | `src/styles/30-sidebar.css` |
| داشبورد و فیلترها | `src/views/dashboard.js` | `src/styles/50-dashboard.css` |
| رنگ تسک بر اساس هشتگ | `src/core/tasks.js` و `src/settings.js` | `src/styles/10-editor.css` و `src/styles/40-task-cards.css` |
| برچسب تاریخ در متن تسک | `src/editor/widgets.js` | `src/styles/00-foundation.css` |
| تنظیمات رنگ و گرادیانت | `src/settings.js` | `src/styles/70-theme.css` |
| خواندن/نوشتن و اعلان‌ها | `src/main.js` و `src/core/tasks.js` | — |
| واکنش‌گرایی موبایل | — | `src/styles/60-responsive.css` و `src/styles/75-material-clock.css` |
| متغیرها و مقادیر پیش‌فرض | `src/core/constants.js` | `src/styles/00-foundation.css` |

## ساخت بدون نصب بستهٔ اضافی

پیش‌نیاز: Node.js روی مک نصب باشد. نیازی به `npm install` نیست.

1. پوشهٔ پروژه را در VS Code باز کن.
2. فایل مربوط به قابلیت را در `src/` تغییر بده.
3. داخل Terminal همان پوشه اجرا کن:

```bash
npm run build
```

برای اجرای آزمون‌های داخلی:

```bash
npm test
```

خروجی‌های `main.js` و `styles.css` در ریشهٔ پروژه تولید می‌شوند. `manifest.json` هم از قبل وجود دارد.

## نصب در Obsidian

فقط **این سه فایل خروجی** را در `YourVault/.obsidian/plugins/persian-reminder/` کپی کن:

- `main.js`
- `styles.css`
- `manifest.json`

سپس افزونه را از Community Plugins یک بار خاموش و روشن کن. افزونهٔ `persian-calendar` باید فعال باشد.

**توجه:** فایل‌های `src/` برای توسعه‌اند و Obsidian آن‌ها را مستقیم بارگذاری نمی‌کند. اگر فایل `src/ui/material-clock.js` را تغییر دادی ولی دستور ساخت اجرا نکردی، در افزونه هیچ تغییری نمی‌بینی.

## دامنه و آزمون‌ها

ماژول‌ها به شکل مکانیکی از نسخهٔ موجود ۲.۳ جدا شده‌اند. هدف این مرحله، تغییر عملکرد نیست. فایل نهایی با Node از نظر نحو و با آزمون‌های پایهٔ خواندن/نوشتن یادآوری، هشتگ و بارگذاری ماژول کنترل شده است؛ اجرای عملی در محیط Obsidian دسکتاپ/موبایل آزمایش نشده است.
