const { DEFAULTS } = require('./constants');
const { fromISO, fa } = require('./dates');
const { cssColor } = require('./tasks');

function gradientAngle(settings) {
    const value = Number(settings.gradientAngle ?? 120);
    return Number.isFinite(value) ? Math.max(0, Math.min(360, value)) : 120;
}
function cardTint(settings) {
    const value = Number(settings.cardTint ?? 10);
    return Number.isFinite(value) ? Math.max(0, Math.min(50, value)) : 10;
}
function contrastText(a, b) {
    const luminance = hex => {
        const rgb = cssColor(hex).slice(1).match(/../g).map(part => parseInt(part, 16) / 255)
            .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
        return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
    };
    const ends = [luminance(a), luminance(b)];
    const score = color => Math.min(...ends.map(value => {
        const ink = luminance(color);
        return (Math.max(value, ink) + .05) / (Math.min(value, ink) + .05);
    }));
    return score('#ffffff') > score('#182e3a') ? '#ffffff' : '#182e3a';
}
function remainingInfo(p, item, now = new Date()) {
    const date = fromISO(item.at);
    if (!date) return null;
    const day = value => Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
    const days = Math.round((day(date) - day(now)) / 86400000);
    let kind, label;
    if (item.done) { kind = 'done'; label = 'انجام‌شده'; }
    else if (date < now) { kind = 'overdue'; label = 'زمان گذشته'; }
    else if (days === 0) { kind = 'today'; label = 'امروز'; }
    else if (days === 1) { kind = 'tomorrow'; label = 'فردا'; }
    else { kind = 'future'; label = fa(p, days) + ' روز دیگر'; }
    let colors = { ...DEFAULTS.badgeColors.remaining, ...(p.settings.badgeColors?.remaining || {}) };
    if (p.settings.remainingRulesEnabled !== false) {
        if (['done', 'overdue', 'today'].includes(kind)) {
            colors = { ...DEFAULTS.remainingColors[kind], ...(p.settings.remainingColors?.[kind] || {}) };
        } else {
            const rule = [...(p.settings.remainingRules || DEFAULTS.remainingRules)]
                .filter(rule => rule.enabled !== false && Number.isFinite(Number(rule.days)) && Number(rule.days) >= days)
                .sort((a, b) => Number(a.days) - Number(b.days))[0];
            if (rule) colors = rule;
        }
    }
    return { label, kind, days, colors };
}
function paintRemaining(p, element, item, now) {
    const info = remainingInfo(p, item, now);
    if (!info) return;
    element.textContent = info.label;
    element.className = element.className.replace(/\bis-(?:done|overdue|today|tomorrow|future)\b/g, '').trim();
    element.classList.add('is-' + info.kind);
    for (const key of ['a', 'b', 'border']) element.style.setProperty('--pr-pill-' + key, cssColor(info.colors[key]));
    element.style.setProperty('--pr-pill-text', contrastText(info.colors.a, info.colors.b));
    return info;
}
module.exports = { gradientAngle, cardTint, contrastText, remainingInfo, paintRemaining };
