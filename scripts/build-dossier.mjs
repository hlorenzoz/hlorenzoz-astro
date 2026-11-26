#!/usr/bin/env node
/**
 * Commercial dossier builder: one PDF per language, for digital delivery.
 *
 * Fills `dossier/template.html` (the print stylesheet that mirrors the site's
 * look) with the copy in `dossier/content.<locale>.json`, the contact details
 * from `lib/site-config.ts` and the payment terms from `lib/pricing.ts` (the
 * same source the site reads, so the two cannot disagree), then prints it to A4 with
 * the Chromium that Playwright already ships for the E2E suite. No runtime
 * dependency is added for this.
 *
 * Output: `dossier/dist/lorenzoz-agency-dossier-<locale>.pdf`, plus the
 * intermediate `.html` next to it for inspecting a layout in a browser. The
 * directory is gitignored: the PDFs are build output, regenerated on demand.
 *
 * Usage:  just dossier            (both languages)
 *         just dossier es         (one language)
 */
import process from 'node:process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { UPFRONT_SHARE } from '../lib/pricing.ts';

// Resolved from the working directory, not `import.meta.url`: Vitest imports
// this module for its pure helpers and does not always hand back a
// `file:`-scheme URL.
const ROOT = process.cwd();
const DOSSIER_DIR = join(ROOT, 'dossier');
const OUT_DIR = join(DOSSIER_DIR, 'dist');
const LOCALES = ['es', 'en'];

/**
 * The calendar the site embeds in `src/components/services/CalBooking.astro`, minus
 * the `?embed=true` query. A test asserts the component still contains it.
 */
export const BOOKING_URL = 'https://cal.com/hlorenzoz.com/15min';

export function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Replaces `{name}` tokens. An unknown token throws: a silent blank in a sentence is worse. */
function fill(text, values) {
    return text.replace(/\{(\w+)\}/g, (_, key) => {
        if (!(key in values)) throw new Error(`Dossier copy uses unknown token {${key}}`);
        return String(values[key]);
    });
}

/** "+34643844720" -> "+34 643 844 720". Anything else is returned untouched. */
function formatPhone(telephone) {
    const match = /^(\+\d{2})(\d{3})(\d{3})(\d{3})$/.exec(telephone);
    return match ? match.slice(1).join(' ') : telephone;
}

function icon(paths) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

const ICONS = {
    check: icon('<path d="M20 6 9 17l-5-5"/>'),
    checkCircle: icon('<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>'),
    xCircle: icon('<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>'),
    clock: icon('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
    search: icon('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
    star: icon('<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>'),
    sparkles: icon('<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M19 15v4"/><path d="M17 17h4"/>'),
    fileText: icon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h6"/>'),
    link: icon('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
    award: icon('<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>'),
    mail: icon('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>'),
    phone: icon('<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>'),
    message: icon('<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/>'),
    globe: icon('<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>'),
    users: icon('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
    calendar: icon('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>'),
};

const PILLAR_ICONS = [ICONS.fileText, ICONS.link, ICONS.award, ICONS.star];
const PROBLEM_ICONS = [ICONS.search, ICONS.star, ICONS.sparkles];

function checklist(items, mark = ICONS.checkCircle) {
    return `<ul class="checklist">${items.map((item) => `<li>${mark}<span>${escapeHtml(item)}</span></li>`).join('')}</ul>`;
}

/**
 * Builds the complete dossier document for one locale.
 *
 * Pure: everything it needs arrives as an argument, so the test suite can
 * render it without Chromium, the network or the filesystem.
 *
 * @param {object} args
 * @param {'es'|'en'} args.locale
 * @param {object} args.content       parsed `dossier/content.<locale>.json`
 * @param {string} args.template      `dossier/template.html`
 * @param {object} args.organization  `ORGANIZATION` from `lib/site-config.ts`
 * @param {readonly string[]} args.markets  localized served-market names
 * @param {string} args.qrSvg         inline SVG of the booking QR code
 */
export function renderDossier({ locale, content, template, organization, markets, qrSvg }) {
    const tokens = {
        upfront: Math.round(UPFRONT_SHARE * 100),
        opens: organization.openingHoursSpecification.opens,
        closes: organization.openingHoursSpecification.closes,
    };
    const text = (value) => escapeHtml(fill(value, tokens));

    const siteUrl = new URL(organization.logo).origin;
    const siteHost = new URL(siteUrl).host;
    const linkedin = organization.sameAs.find((url) => url.includes('linkedin.com'));
    const whatsapp = `https://wa.me/${organization.telephone.replace(/\D/g, '')}`;
    const phone = formatPhone(organization.telephone);
    const country = new Intl.DisplayNames([locale], { type: 'region' }).of(organization.address.addressCountry);
    const { address } = organization;

    const TOTAL = 6;
    const head = (label) =>
        `<header class="page-head"><span class="brand">${escapeHtml(organization.name)}</span><span>${escapeHtml(label)}</span></header>`;
    const foot = (current) =>
        `<footer class="page-foot"><a href="${siteUrl}">${siteHost}</a><span>${escapeHtml(
            fill(content.footer.page, { current, total: TOTAL })
        )}</span></footer>`;

    const { cover, approach, core, addOns, process: steps, contact } = content;

    const coverPage = `
<section class="page page--dark">
  ${head(content.meta.docLabel)}
  <div class="cover-main">
    <span class="pill"><span class="dot"></span>${text(cover.badge)}</span>
    <h1>${text(cover.title)} <span class="text-gradient">${text(cover.titleGradient)}</span></h1>
    <p class="lead">${text(cover.description)}</p>
    <a class="btn" href="${siteUrl}">${siteHost}</a>
  </div>
  <div class="facts">
    ${cover.facts
        .map((fact) => `<div class="card fact"><p class="value">${text(fact.value)}</p><p class="label">${text(fact.label)}</p></div>`)
        .join('')}
  </div>
  <div class="markets">
    <p class="eyebrow">${text(cover.marketsLabel)}</p>
    <ul>${markets.map((name) => `<li>${escapeHtml(name)}</li>`).join('')}</ul>
  </div>
  ${foot(1)}
</section>`;

    const way = (kind, data, headIcon, mark) => `
    <div class="way way--${kind}">
      <div class="way-head">${headIcon}<h3>${text(data.title)}</h3></div>
      <ul>${data.items.map((item) => `<li>${mark}<span>${text(item)}</span></li>`).join('')}</ul>
    </div>`;

    const approachPage = `
<section class="page page--muted">
  ${head(approach.eyebrow)}
  <p class="eyebrow">${text(approach.eyebrow)}</p>
  <h2>${text(approach.title)}</h2>
  <p class="lead">${text(approach.subtitle)}</p>
  <div class="versus">
    ${way('old', approach.oldWay, ICONS.clock, ICONS.xCircle)}
    ${way('new', approach.newWay, ICONS.checkCircle, ICONS.check)}
  </div>
  <h3 class="section-title">${text(approach.problemsTitle)}</h3>
  <div class="grid-3">
    ${approach.problems
        .map(
            (problem, i) => `<div class="card problem"><div class="chip chip--gray">${PROBLEM_ICONS[i]}</div><div><h3>${text(
                problem.title
            )}</h3><p class="body">${text(problem.description)}</p></div></div>`
        )
        .join('')}
  </div>
  ${foot(2)}
</section>`;

    const corePage = `
<section class="page">
  ${head(core.name)}
  <p class="eyebrow">${text(core.eyebrow)}</p>
  <h2>${text(core.title)}</h2>
  <p class="lead">${text(core.description)}</p>
  <div class="pillars">
    ${core.pillars
        .map(
            (pillar, i) => `<div class="card pillar">
      <div class="pillar-head"><div class="chip">${PILLAR_ICONS[i]}</div><h3>${text(pillar.title)}</h3></div>
      <p class="body">${text(pillar.description)}</p>
      ${checklist(pillar.items.map((item) => fill(item, tokens)))}
    </div>`
        )
        .join('')}
  </div>
  <div class="price-band">
    <div class="goal"><h3>${text(core.goalTitle)}</h3><p>${text(core.goal)}</p></div>
  </div>
  ${foot(3)}
</section>`;

    const addOnCard = (item) => {
        return `<div class="card addon">
      <div>
        <h3>${text(item.name)}</h3>
        <p class="body">${text(item.description)}</p>
        ${checklist(item.features.map((feature) => fill(feature, tokens)))}
      </div>
    </div>`;
    };

    const addOnsPage = `
<section class="page page--pricing">
  ${head(addOns.title)}
  <div class="addons-head">
    <span class="badge-offer">${text(addOns.eyebrow)}</span>
    <h2>${text(addOns.title)}</h2>
    <p class="lead">${text(addOns.description)}</p>
  </div>
  <div class="addons">${addOns.items.map(addOnCard).join('')}</div>
  <p class="footnote">${text(addOns.footnote)}</p>
  ${foot(4)}
</section>`;

    const processPage = `
<section class="page">
  ${head(steps.eyebrow)}
  <p class="eyebrow">${text(steps.eyebrow)}</p>
  <h2>${text(steps.title)}</h2>
  <div class="steps">
    ${steps.steps
        .map(
            (step) => `<div class="step"><p class="number">${text(step.number)}</p><p class="badge">${text(step.badge)}</p><h3>${text(
                step.title
            )}</h3><p class="body">${text(step.description)}</p></div>`
        )
        .join('')}
  </div>
  <h3 class="section-title">${text(steps.termsTitle)}</h3>
  <div class="terms">
    ${steps.terms
        .map((term) => `<div class="card term"><h3>${text(term.title)}</h3><p class="body">${text(term.description)}</p></div>`)
        .join('')}
  </div>
  ${foot(5)}
</section>`;

    const channel = (glyph, label, value, href) =>
        `<a class="channel" href="${escapeHtml(href)}"><div class="chip">${glyph}</div><div><p class="tag">${text(
            label
        )}</p><p class="value">${escapeHtml(value)}</p></div></a>`;

    const contactPage = `
<section class="page page--dark">
  ${head(contact.eyebrow)}
  <p class="eyebrow">${text(contact.eyebrow)}</p>
  <h2>${text(contact.title)}</h2>
  <p class="lead">${text(contact.description)}</p>
  <div class="card booking">
    <div>
      <h3>${text(contact.bookingTitle)}</h3>
      <p class="body">${text(contact.bookingDescription)}</p>
      <a class="btn" href="${BOOKING_URL}">${text(contact.bookingCta)}</a>
      <p class="url"><a href="${BOOKING_URL}">${escapeHtml(BOOKING_URL.replace('https://', ''))}</a></p>
    </div>
    <a class="qr" href="${BOOKING_URL}">${qrSvg}</a>
  </div>
  <div class="channels">
    ${channel(ICONS.mail, contact.channels.email, organization.email, `mailto:${organization.email}`)}
    ${channel(ICONS.phone, contact.channels.phone, phone, `tel:${organization.telephone}`)}
    ${channel(ICONS.message, contact.channels.whatsapp, phone, whatsapp)}
    ${channel(ICONS.globe, contact.channels.web, siteHost, siteUrl)}
    ${channel(ICONS.users, contact.channels.linkedin, linkedin.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, ''), linkedin)}
    ${channel(ICONS.calendar, contact.channels.hours, fill(contact.hours, tokens), BOOKING_URL)}
  </div>
  <p class="closing">${text(contact.closing)}</p>
  <p class="address">${escapeHtml(
      `${organization.legalName} | ${address.streetAddress}, ${address.postalCode} ${address.addressLocality}, ${address.addressRegion}, ${country}`
  )}</p>
  ${foot(6)}
</section>`;

    const pages = [coverPage, approachPage, corePage, addOnsPage, processPage, contactPage].join('\n');

    return template
        .replace('{{lang}}', locale)
        .replace('{{title}}', escapeHtml(content.meta.title))
        .replace('{{pages}}', () => pages);
}

async function main() {
    const requested = process.argv.slice(2);
    const locales = requested.length ? requested : LOCALES;
    for (const locale of locales) {
        if (!LOCALES.includes(locale)) throw new Error(`Unknown locale "${locale}". Use: ${LOCALES.join(', ')}`);
    }

    // `lib/site-config.ts` imports through the `@/` alias, which only the
    // bundlers know about. Teach Node the same mapping for this process, so
    // the contact details are read from the site config instead of retyped.
    const { registerHooks } = await import('node:module');
    registerHooks({
        resolve(specifier, context, nextResolve) {
            if (!specifier.startsWith('@/')) return nextResolve(specifier, context);
            return nextResolve(pathToFileURL(join(ROOT, `${specifier.slice(2)}.ts`)).href, context);
        },
    });
    const { ORGANIZATION, marketNames } = await import('../lib/site-config.ts');

    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { QRCodeSVG } = await import('qrcode.react');
    const qrSvg = renderToStaticMarkup(createElement(QRCodeSVG, { value: BOOKING_URL, size: 256, level: 'M' }));

    const template = readFileSync(join(DOSSIER_DIR, 'template.html'), 'utf8');
    mkdirSync(OUT_DIR, { recursive: true });

    const { chromium } = await import('@playwright/test');
    const browser = await chromium.launch();
    try {
        for (const locale of locales) {
            const content = JSON.parse(readFileSync(join(DOSSIER_DIR, `content.${locale}.json`), 'utf8'));
            const html = renderDossier({
                locale,
                content,
                template,
                organization: ORGANIZATION,
                markets: marketNames(locale),
                qrSvg,
            });

            const base = join(OUT_DIR, `lorenzoz-agency-dossier-${locale}`);
            writeFileSync(`${base}.html`, html);

            const page = await browser.newPage();
            await page.goto(pathToFileURL(`${base}.html`).href, { waitUntil: 'networkidle' });
            // The fonts come from Google Fonts. Printing before they land
            // silently ships the PDF in the system fallback face.
            const fontsLoaded = await page.evaluate(async () => {
                await document.fonts.ready;
                // Not `fonts.check()`: it answers true for a family that was
                // never fetched at all, which is the failure being guarded.
                return [...document.fonts].some((face) => face.family.includes('Inter') && face.status === 'loaded');
            });
            if (!fontsLoaded) throw new Error('Inter did not load: refusing to print the dossier in a fallback font.');

            await page.pdf({ path: `${base}.pdf`, format: 'A4', printBackground: true, preferCSSPageSize: true });
            await page.close();
            console.log(`Wrote ${base}.pdf`);
        }
    } finally {
        await browser.close();
    }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    main().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
