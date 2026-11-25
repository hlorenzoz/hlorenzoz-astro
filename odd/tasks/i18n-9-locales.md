# i18n-9-locales

Objective: translate hlorenzoz.com from en/es to 9 locales, page by page, with per-locale sitemaps, localized internal links and hreflang on every page. Branch: `feat/i18n-9-locales` (merged to `main` only when every page is translated, since `main` deploys). Delivery: one commit per page. Test runner: Vitest, Playwright, Lighthouse CI.

## Specs

- **S1** User (verbatim): "Bien, ahora vamos a traducir el sitio web completo a gallego, inglés británico, portugués, italiano, francés, alemán y neerlandés."
- **S2** Order (verbatim): "Comenzamos por las páginas principales y luego los artículos, noticias, ..." and "Ve página por página (una página a la vez)".
- **S3** Sitemaps (verbatim): "Actualizar también los respectivos sitemaps.xml por idioma y los internal links a las respectivas páginas en su idioma."
- **S4** hreflang (verbatim): "También incluir los respectivos hreflang a cada una de las páginas".
- **S5** Locale scheme (user choice): `/en/` stays international English (hreflang `en`, x-default); new `/en-gb/` (hreflang `en-GB`); Portuguese of Portugal at `/pt/` (hreflang `pt-PT`); `/gl/` gl-ES, `/it/`, `/fr/`, `/de/`, `/nl/`. 9 locales: en, es, en-gb, gl, pt, it, fr, de, nl.
- **S6** Conventions that keep applying (AGENTS.md): every language written natively, never literal; no AI typographic characters; no hyphen-joined words in visible copy (rephrase compounds); prices stay in `lib/pricing.ts` with "+ VAT" equivalents; E-E-A-T, no invented claims.

## Tasks

| ID | Specs | Task | Route | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| T1 | S3-S5 | Infrastructure: locale config (hreflang, og:locale, html lang, Intl), per-page locale availability, English fallback for untranslated keys, language switcher with 9 languages, hardcoded strings to messages, sitemap index + per-locale sitemaps with hreflang alternates | delegated (writer) | pending | |
| T2 | S1, S6 | Shell copy (navigation, footer, cookie banner, shared labels) in 7 locales | 7 agents, one per locale | pending | |
| T3 | S1, S2 | Home page | 7 agents | pending | |
| T4.. | S1, S2 | Then one page at a time: services hub, each service page, portfolio index, each portfolio item, news index, each post, legal pages, card, HTML sitemap, 404 | 7 agents per page | pending | |

## Log

- **L1** (2026-11-25, user, verbatim): "Bien, ahora vamos a traducir el sitio web completo a gallego, inglés británico, portugués, italiano, francés, alemán y neerlandés. Comenzamos por las páginas principales y luego los artículos, noticias, ... Actualizar también los respectivos sitemaps.xml por idioma y los internal links a las respectivas páginas en su idioma. También incluir los respectivos hreflang a cada una de las páginas"
- **L2** (2026-11-25, user answer): "/en-gb/ nuevo + pt-PT (Recommended)".
- **L3** (2026-11-25, user, verbatim): "Ve página por página (una página a la vez)". A page is published in a locale only once its copy exists there; untranslated pages are not built for that locale and get no hreflang to it.
