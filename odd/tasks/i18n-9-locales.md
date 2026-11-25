# i18n-9-locales

Objective: translate hlorenzoz.com from en/es to 9 locales, page by page, with per-locale sitemaps, localized internal links and hreflang on every page. Branch: `feat/i18n-9-locales` (merged to `main` only when every page is translated, since `main` deploys). Delivery: one commit per page. Test runner: Vitest, Playwright, Lighthouse CI.

## Specs

- **S1** User (verbatim): "Bien, ahora vamos a traducir el sitio web completo a gallego, inglés británico, portugués, italiano, francés, alemán y neerlandés."
- **S2** Order (verbatim): "Comenzamos por las páginas principales y luego los artículos, noticias, ..." and "Ve página por página (una página a la vez)".
- **S3** Sitemaps (verbatim): "Actualizar también los respectivos sitemaps.xml por idioma y los internal links a las respectivas páginas en su idioma."
- **S4** hreflang (verbatim): "También incluir los respectivos hreflang a cada una de las páginas".
- **S5** Locale scheme (user choice): `/en/` stays international English (hreflang `en`, x-default); new `/en-gb/` (hreflang `en-GB`); Portuguese of Portugal at `/pt/` (hreflang `pt-PT`); `/gl/` gl-ES, `/it/`, `/fr/`, `/de/`, `/nl/`. 9 locales: en, es, en-gb, gl, pt, it, fr, de, nl.
- **S7** Image metadata (verbatim): "Revisa los metadatos de las imágenes: description, caption, title, ... y asegúrate de que también estén traducidos porfa, y que cada vez que se procesen nuevas imágenes, se hagan también las respectivas traducciones y referencias. Actualiza las referencias (incluyendo agentes) que lo requieran."
- **S8** Delivery (verbatim): "Cada vez que termines te traducir una página en todos los idiomas, revísalas, haz el commit, y sube los cambios porfa". Pages are gated per locale, so each finished page is merged to main and pushed (deploys).
- **S6** Conventions that keep applying (AGENTS.md): every language written natively, never literal; no AI typographic characters; no hyphen-joined words in visible copy (rephrase compounds); prices stay in `lib/pricing.ts` with "+ VAT" equivalents; E-E-A-T, no invented claims.

## Tasks

| ID | Specs | Task | Route | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| T1 | S3-S5 | Infrastructure: locale config (hreflang, og:locale, html lang, Intl), per-page locale availability, English fallback for untranslated keys, language switcher with 9 languages, hardcoded strings to messages, sitemap index + per-locale sitemaps with hreflang alternates | delegated (writer) | done | f7e42a3 (en/es 60 pages identical; new locales 0 pages; 1365 tests) |
| T2a | S1, S7 | Move every hardcoded alt/title/aria-label/caption/OG alt and UI label into messages; docs, commands and agents for 9 locales and translated image metadata | delegated (writer) | done | 85247be (33 literal strings moved; ~45 es slide alts fixed) |
| T2 | S1, S6 | Shell copy (navigation, footer, cookie banner, shared labels) in 7 locales | 7 agents, one per locale | done | with T3 |
| T3 | S1, S2 | Home page | 7 agents | done | 9a87914; home in 9 locales; hreflang 10; Lighthouse de/gl 94/100/100/100 |
| T4 | S1, S2 | Services hub | 7 agents | done | 15f456f |
| T5 | S1, S2 | Local SEO page | 7 agents | done | aebed50 |
| T6 | S1, S2 | Website Development page | 7 agents | done | 0d4919a (gl/de titles shortened to the 42-char budget) |
| T7 | S1, S2 | AI Voice Receptionist page | 7 agents | done | 8ad92df |
| T8 | S1, S2 | Software Development page | 7 agents | done | hreflang 10, tax marker ok, 0 English-identical strings |
| T9 | S2 | Gate the portfolio and news indexes on every card's copy (title/badge/description), so an index never shows English cards or links to an unbuilt detail page | inline | done | this commit; RED 2 tests without the routes change |
| T10.. | S1, S2 | Then one page at a time: each portfolio item, portfolio index, each news post, news index, legal pages, card, HTML sitemap | 7 agents per page | pending | |

## Log

- **L1** (2026-11-25, user, verbatim): "Bien, ahora vamos a traducir el sitio web completo a gallego, inglés británico, portugués, italiano, francés, alemán y neerlandés. Comenzamos por las páginas principales y luego los artículos, noticias, ... Actualizar también los respectivos sitemaps.xml por idioma y los internal links a las respectivas páginas en su idioma. También incluir los respectivos hreflang a cada una de las páginas"
- **L2** (2026-11-25, user answer): "/en-gb/ nuevo + pt-PT (Recommended)".
- **L3** (2026-11-25, user, verbatim): "Ve página por página (una página a la vez)". A page is published in a locale only once its copy exists there; untranslated pages are not built for that locale and get no hreflang to it.
- **L4** (2026-11-25, user, verbatim): "Cada vez que termines te traducir una página en todos los idiomas, revísalas, haz el commit, y sube los cambios porfa" and "Revisa los metadatos de las imágenes: description, caption, title, ... y asegúrate de que también estén traducidos porfa, y que cada vez que se procesen nuevas imágenes, se hagan también las respectivas traducciones y referencias. Actualiza las referencias (incluyendo agentes) que lo requieran." T1 done (f7e42a3); gitleaks flagged translation key paths in lib/routes.ts as generic-api-key, annotated gitleaks:allow.
- **L5** (2026-11-25, evidence): the portfolio and news indexes render every item's card (`portfolio.<id>.title/badge/description`, `news.items.<id>.title/description`) and link to its detail page with `localeHref`, but their copyKeys listed only `portfolio.list`/`news.list`. Fixed in T9; order is now items before their index. The home carousels already filter to items built in the locale (`routeExists`), so home was not affected.
