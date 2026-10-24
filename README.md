# ⏰ Persian Reminder — Obsidian Plugin

Persian Reminder is a Persian-language task reminder plugin for Obsidian. It integrates with the **Persian Calendar** community plugin to select Jalali dates and provides a clock-style time picker, hashtags, locations, and task management views.

## Features

- Jalali (Solar Hijri) date selection through the Persian Calendar plugin
- Clock-style hour and minute picker
- Task reminders with sidebar and dashboard views
- Hashtag and location fields
- Customizable task colors and gradients
- Right-to-left Persian interface, with a three-tab reminder dialog for date, time, and details
- Desktop and mobile support

## Requirements and installation

Install and enable the **Persian Calendar** plugin first.

Download `main.js`, `manifest.json`, and `styles.css` from the matching [GitHub release](https://github.com/singhaf9270/obsidian-persian-reminder/releases). Place them in `YourVault/.obsidian/plugins/persian-reminder/`, then enable Persian Reminder in **Settings → Community plugins**.

Keep your existing `data.json` when updating manually.

## Privacy and vault access

The plugin lists Markdown files with `vault.getMarkdownFiles()` at startup to find reminders throughout the vault. It reads notes through Obsidian's vault API and updates affected task lines when you add, edit, complete, or delete a task. This scan is necessary for vault-wide reminders, including notes that are not open. The plugin does not send note contents to external services.

## Development and verified builds

Use Node.js 24 and npm. There are no third-party build dependencies; the committed `package-lock.json` records this dependency-free build.

```bash
npm ci
npm test
npm run check
```

Edit `src/`, then run `npm run build` to regenerate `main.js` and `styles.css`. CI checks that the committed bundles match the sources byte-for-byte.

The build workflow generates provenance attestations for `main.js`, `styles.css`, and `manifest.json` on pushes to `main` and on published releases. Release builds verify that the tag matches the version in `manifest.json`, then upload those exact files to the release. Use a new version/tag containing the workflow and fixes; existing release assets are not changed by a source commit.

```bash
gh attestation verify main.js --repo singhaf9270/obsidian-persian-reminder
gh attestation verify styles.css --repo singhaf9270/obsidian-persian-reminder
```

## Bug reports

Please use this repository's Issues tab to report bugs. For mobile issues, include your device model, Obsidian version, and a screenshot when possible.

---

## راهنمای فارسی


افزونه‌ای فارسی برای مدیریت وظایف و یادآوری‌ها در **Obsidian** با پشتیبانی از تقویم جلالی، ساعت، هشتگ و مکان.

> **نسخه: 1.0.1** — برای انتخاب تاریخ شمسی، افزونهٔ **Persian Calendar** باید نصب و فعال باشد.

## ✨ امکانات

- 📅 انتخاب تاریخ شمسی با استفاده از API افزونهٔ Persian Calendar
- 🕒 انتخاب ساعت و دقیقه با رابط ساعت عقربه‌ای
- 🔔 تعیین و مدیریت یادآوری برای وظایف
- 🏷️ افزودن هشتگ و مکان به یادآوری‌ها
- 📋 مشاهده و پیگیری وظایف در سایدبار و داشبورد
- 🎨 تنظیم رنگ‌ها و گرادیانت‌ها و نمایش وضعیت وظایف
- 🌙 هماهنگی با حالت روشن و تاریک Obsidian
- 📱 رابط فارسی راست‌به‌چپ و پنجرهٔ سه‌تبی «تاریخ، ساعت، جزئیات» برای استفاده راحت‌تر در موبایل

## 📦 نصب دستی

۱. به بخش **Releases** همین مخزن بروید و آخرین نسخهٔ منتشرشده را باز کنید.

۲. سه فایل زیر را از بخش **Assets** دریافت کنید:

```text
main.js
manifest.json
styles.css
```

۳. آن‌ها را در پوشهٔ زیر قرار دهید (در صورت نیاز پوشه را بسازید):

```text
YourVault/.obsidian/plugins/persian-reminder/
```

۴. در Obsidian، افزونهٔ **Persian Calendar** را نصب و فعال کنید.

۵. از مسیر **Settings → Community plugins**، افزونهٔ **Persian Reminder** را فعال کنید.

> فایل `data.json` حاوی تنظیمات کاربر است؛ هنگام به‌روزرسانی دستی آن را پاک نکنید.

## 🚀 استفاده

۱. در یک یادداشت، وظیفه‌ای ایجاد کنید.

۲. پنجرهٔ تنظیم یادآوری را باز کنید.

۳. در تب **تاریخ**، روز موردنظر را از تقویم شمسی انتخاب کنید.

۴. در تب **ساعت**، زمان یادآوری را تنظیم کنید.

۵. در تب **جزئیات**، در صورت نیاز هشتگ و مکان را وارد کنید.

۶. یادآوری را ذخیره کنید و آن را در پنل افزونه پیگیری کنید.

## 🛠️ راهنمای توسعه‌دهندگان

کد منبع در پوشهٔ `src/` به‌صورت ماژولار نگهداری می‌شود:

| بخش | فایل‌های اصلی |
| --- | --- |
| ساعت | `src/ui/material-clock.js` |
| تقویم و تاریخ | `src/ui/calendar.js`، `src/core/dates.js` |
| پنجرهٔ یادآوری | `src/ui/task-modal.js` |
| سایدبار | `src/views/sidebar.js` |
| داشبورد | `src/views/dashboard.js` |
| کارت وظایف | `src/ui/task-card.js` |
| تنظیمات | `src/settings.js` |
| استایل‌ها | `src/styles/` |

برای ساخت افزونه، Node.js لازم است؛ این پروژه اسکریپت ساخت بدون نصب بستهٔ اضافی دارد:

```bash
npm run build
```

برای اجرای آزمون‌های پایه:

```bash
npm test
```

فایل‌های خروجی `main.js` و `styles.css` در ریشهٔ پروژه ساخته می‌شوند. تغییر فایل‌های `src/` بدون اجرای ساخت، در افزونهٔ نصب‌شده اعمال نمی‌شود.

## 🐛 گزارش خطا و پیشنهاد

برای گزارش اشکال یا پیشنهاد قابلیت جدید، از بخش **Issues** همین مخزن استفاده کنید. هنگام گزارش مشکلات موبایل، مدل دستگاه، نسخهٔ Obsidian و تصویر خطا را نیز ذکر کنید.

## 📣 آموزش و ارتباط

تلگرام، بله و یوتیوب: **@obsidiantut**

---

ساخته‌شده برای کاربران فارسی‌زبان Obsidian ❤️
