// Date conversions are delegated to the persian-calendar plugin API.
const pad = n => String(n).padStart(2, '0');
function iso(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function dateKey(d) { return iso(d).slice(0, 10); }
function localDateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function fromISO(v) { const m = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)$/.exec(v || ''); if (!m)
    return null; const [y, mo, d, h, mi] = m.slice(1).map(Number); const x = new Date(y, mo - 1, d, h, mi); return x.getFullYear() === y && x.getMonth() === mo - 1 && x.getDate() === d && x.getHours() === h && x.getMinutes() === mi ? x : null; }
function fa(p, x) { return p.api()?.toFaNumber?.(String(x)) ?? String(x).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]); }
function en(p, x) { return p.api()?.toEnNumber?.(String(x)) ?? String(x).replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))); }
function jalali(p, d) { return p.api()?.gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate()) ?? null; }
function fromJ(p, y, m, d) { const a = p.api(); if (!a)
    return null; const x = a.jalaliToDate(y, m, d); if (!(x instanceof Date) || isNaN(x.getTime()))
    return null; const j = jalali(p, x); return j && j.jy === y && j.jm === m && j.jd === d ? x : null; }
function dateFa(p, d) { const j = jalali(p, d); return j ? fa(p, `${j.jy}/${pad(j.jm)}/${pad(j.jd)}`) : fa(p, dateKey(d)); }
function clockFa(p, d) { return fa(p, `${pad(d.getHours())}:${pad(d.getMinutes())}`); }
function monthDays(p, y, m) { const first = fromJ(p, y, m, 1), next = m === 12 ? fromJ(p, y + 1, 1, 1) : fromJ(p, y, m + 1, 1); return first && next ? Math.round((Date.UTC(next.getFullYear(), next.getMonth(), next.getDate()) - Date.UTC(first.getFullYear(), first.getMonth(), first.getDate())) / 86400000) : 30; }
module.exports = { pad, iso, dateKey, localDateKey, fromISO, fa, en, jalali, fromJ, dateFa, clockFa, monthDays };