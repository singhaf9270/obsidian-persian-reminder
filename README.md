# ⏰ Persian Reminder — Obsidian Plugin

Persian Reminder is a Persian-language task reminder plugin for Obsidian. It integrates with the **Persian Calendar** community plugin to select Jalali dates and provides a clock-style time picker, hashtags, locations, and task management views.

## Features

- Jalali (Solar Hijri) date selection through the Persian Calendar plugin
- Clock-style hour and minute picker
- Task reminders with sidebar and dashboard views
- Hashtag and location fields
- Customizable task colors and gradients
- Right-to-left Persian interface, with separate date/time tabs and expandable location/hashtag fields
- Desktop and mobile support
- Selected-day daily note destinations, with Jalali or Gregorian filenames
- Organized settings with live color previews

## Requirements and installation

Install and enable the **Persian Calendar** plugin first.

Use the matching `main.js`, `manifest.json`, and `styles.css` from this archive or your repository release. Place them in `YourVault/.obsidian/plugins/persian-reminder/`, then enable Persian Reminder in **Settings → Community plugins**.

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
gh attestation verify main.js --repo OWNER/REPOSITORY
gh attestation verify styles.css --repo OWNER/REPOSITORY
```

To publish a new version, update the manifest, package, lockfile, version map, and changelog, then push a commit whose complete message is `Release X.Y.Z` (matching the manifest). The workflow tests, attests, and publishes that exact commit with the three installable files.

## Bug reports

Please use this repository's Issues tab to report bugs. For mobile issues, include your device model, Obsidian version, and a screenshot when possible.

---

## راهنمای فارسی


افزونه‌ای فارسی برای مدیریت وظایف و یادآوری‌ها در **Obsidian** با پشتیبانی از تقویم جلالی، ساعت، هشتگ و مکان.

> **نسخه: 1.0.4** — برای انتخاب تاریخ شمسی، افزونهٔ **Persian Calendar** باید نصب و فعال باشد.

## ✨ امکانات

- 📅 انتخاب تاریخ شمسی با استفاده از API افزونهٔ Persian Calendar
- 🕒 انتخاب ساعت و دقیقه با رابط ساعت عقربه‌ای
- 🔔 تعیین و مدیریت یادآوری برای وظایف
- 🏷️ افزودن هشتگ و مکان به یادآوری‌ها
- 📋 مشاهده و پیگیری وظایف در سایدبار و داشبورد
- 🎨 تنظیم رنگ‌ها و گرادیانت‌ها و نمایش وضعیت وظایف
- 🌙 هماهنگی با حالت روشن و تاریک Obsidian
- 📱 رابط فارسی راست‌به‌چپ و پنجرهٔ دارای تب‌های «تاریخ و ساعت» و بخش بازشوندهٔ «مکان و هشتگ‌ها» برای استفاده راحت‌تر در موبایل

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

۵. بخش **مکان و هشتگ‌ها** را باز کنید و اطلاعات اختیاری را وارد کنید.

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

## یادداشت روزانه در نسخهٔ 1.0.3

در تنظیمات افزونه، بخش **یادداشت روز** را باز کنید و پوشه، تقویم نام فایل و قالب نام را با یادداشت‌های روزانهٔ موجود هماهنگ کنید. نمونهٔ مسیر همان‌جا نمایش داده می‌شود. برای استفاده از تنظیمات افزونهٔ اصلی Daily notes، گزینهٔ مربوط را روشن کنید.

از سایدبار یا داشبورد یک روز را انتخاب کنید و **کار جدید** را بزنید. مقصد از آن روز ساخته می‌شود و با تغییر تاریخ داخل مودال نیز تغییر می‌کند. کار زیر عنوان تعیین‌شده اضافه می‌شود؛ عنوان خالی یعنی انتهای یادداشت. کارهای موجود هنگام ویرایش به یادداشت دیگری منتقل نمی‌شوند.

در موبایل، فرم داخل مودال اسکرول می‌شود؛ سربرگ و دکمه‌های ذخیره بیرون از بخش اسکرول هستند. تغییر فضای قابل‌دیدن صفحه با VisualViewport پیگیری می‌شود تا فیلد در حال تایپ دیده شود.

آزمون‌های مستقل از وابستگی شامل مسیر شمسی و میلادی، ایجاد پوشه، حفظ بخش‌های یادداشت، متن ذخیره‌نشدهٔ ویرایشگر و رویدادهای تغییر اندازهٔ کیبورد هستند. نمایش نهایی و رفتار کیبورد باید در Obsidian روی دستگاه واقعی هم بررسی شود.

## هشدار سررسید

در تنظیمات → عمومی، نوع هشدار را از میان **پنجرهٔ هشدار**، **پیام کوتاه** و **خاموش** انتخاب کنید. «نمایش نمونه» ظاهر هشدار را بدون تغییر هیچ کاری نمایش می‌دهد. پنجرهٔ هشدار، عنوان کار، زمان و مکان را نشان می‌دهد و دکمه‌های **انجام شد**، **یادآوری مجدد** و **بازکردن یادداشت** دارد. چند کار هم‌زمان در یک پنجره جمع می‌شوند. مدت یادآوری مجدد می‌تواند ۵، ۱۰، ۱۵، ۳۰ یا ۶۰ دقیقه باشد.

هشدار داخل برنامه است و به بازبودن Obsidian وابسته است؛ این نسخه سرویس اعلان سیستم‌عامل برای برنامهٔ بسته ندارد. یادآوری مجدد، تاریخ همان کار را در همان یادداشت به زمان آینده تغییر می‌دهد.

## تنظیمات جدید نسخهٔ 1.0.4

- **عمومی:** «پنجرهٔ هشدار» را انتخاب کنید و با «نمایش نمونه» ظاهر جمع‌وجور هشدار را ببینید. چند یادآوری هم‌زمان یکی‌یکی نمایش داده می‌شوند.
- **یادداشت روز:** گزینهٔ «استفاده از قالب Templater» را فعال کنید و قالب روزانه را از فهرست قالب‌ها انتخاب کنید. Templater باید فعال باشد. تنها یادداشت‌های تازه با قالب ساخته می‌شوند؛ سپس کار زیر عنوان تعیین‌شده درج می‌شود. نام فایل از تاریخ انتخاب‌شده گرفته می‌شود. در قالب از `tp.file.title` برای تاریخ انتخاب‌شده استفاده کنید؛ `tp.date.now()` تاریخ امروز را می‌دهد. قالب نباید یادداشت را به مسیر روز دیگری تغییر نام یا انتقال بدهد.
- **ظاهر:** زاویهٔ گرادیانت از صفر تا ۳۶۰ درجه و شدت رنگ کارت از صفر تا ۵۰ درصد قابل تغییر است. پیش‌نمایش و کارت‌های واقعی از یک تعریف زمینه استفاده می‌کنند. رنگ اختصاصی هشتگ، رنگ اصلی همان کارت را تعیین می‌کند.
- **ظاهر → رنگ زمان باقی‌مانده:** رنگ‌های امروز، زمان گذشته و انجام‌شده مستقل‌اند. بازه‌های ۱ و ۷ روز قابل ویرایش‌اند و بازهٔ دلخواه هم می‌توانید اضافه کنید. کوچک‌ترین بازهٔ فعال که روز موردنظر را پوشش دهد، برنده است؛ بیشتر از آخرین بازه، رنگ عمومی را می‌گیرد. منظور از روز، روز تقویمی است.
- سایدبار به‌صورت پیش‌فرض همهٔ کارهای فعال را نشان می‌دهد. انتخاب روز از تقویم، فیلتر «این روز» را فعال می‌کند.

### آزمون هشدار روی دستگاه

بعد از نصب، یک کار با موعد یک دقیقهٔ دیگر ایجاد کنید و برنامه را باز نگه دارید. پنجرهٔ هشدار باید نزدیک سررسید ظاهر شود. سپس یادآوری مجدد را امتحان کنید. در اولین اجرای این نسخه، یادآوری‌های انجام‌نشدهٔ ۲۴ ساعت گذشته ممکن است یک بار با سازوکار جدید نمایش داده شوند.

هشدارهای این نسخه داخل Obsidian هستند. در گوشی، توقف برنامه توسط سیستم‌عامل می‌تواند اجرای جاوااسکریپت را متوقف کند؛ یادآوری‌های دیده‌نشده پس از بازگشت به برنامه بررسی می‌شوند. اعلان محلیِ سیستم‌عامل هنگام بسته‌بودن برنامه در این نسخه وجود ندارد.

آزمون‌های کد شامل زمان‌بندی با ساعت شبیه‌سازی‌شده، بازگشت از پس‌زمینه، فعال‌شدن دیرهنگام تقویم، رفتار Templater با قرارداد واقعی آن و کنترل‌های رابط هستند. دسترسی به Obsidian روی مک و گوشی واقعی برای آزمون تصویری و سخت‌افزاری در این محیط فراهم نبود.

## حمایت از توسعه

[حمایت مالی از توسعه‌دهنده](https://reymit.ir/singhaf9270)
