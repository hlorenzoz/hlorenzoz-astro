---
description: Add a new work to the portfolio: optimize and upload its images to the Cloudflare CDN, create its bilingual detail page, verify performance and structured data, then publish a news post under /news/ that references it
argument-hint: [path to the original images] [live site URL] [optional llms.txt URL] [optional free context about the business and the work]
allowed-tools: Read, Grep, Glob, Write, Edit, WebFetch, Bash(pwd), Bash(date:*), Bash(ls:*), Bash(mkdir:*), Bash(cp:*), Bash(mv:*), Bash(wc:*), Bash(file:*), Bash(sips:*), Bash(just:*), Bash(bun:*), Bash(node:*), Bash(curl:*), Bash(kill:*), Bash(git status:*), Bash(git diff:*), Bash(rg:*), Bash(fd:*)
---

CONTEXT:
- Working directory: !`pwd`
- Today: !`date +%Y-%m-%d`
- Existing portfolio ids (oldest first): !`node -e "console.log(require('./lib/portfolio-data.json').map(i => i.id).join(', '))"`
- Existing portfolio asset folders: !`ls assets/hlorenzoz.com/portfolio`
- Raw input: $ARGUMENTS

INPUT RESOLUTION:
- Image path: the first local filesystem path in `$ARGUMENTS`. It holds the ORIGINAL images of the
  site (cover, full page screenshots, feature captures) and its two result screenshots.
- Site URL: the first `http(s)://` URL in `$ARGUMENTS` that is not an `llms.txt` URL.
- llms.txt URL: any URL ending in `llms.txt`. If none is given, try `<site URL>/llms.txt`.
- Context: everything else (business type, what was built, stack, audience).
- Result screenshots, BOTH REQUIRED, both taken against the live site URL:
  - a **PageSpeed Insights** report on mobile (pagespeed.web.dev);
  - a **Google Rich Results Test** report (search.google.com/test/rich-results).
  Look for them at the image path, and in `.agents/context/pagespeed/<id>/` if that folder exists.
  Open each image to identify it; file names are not reliable. They are a result of very high value
  for the case study, so the run never continues without them.
- If the image path, the site URL, the business context, the PageSpeed Insights screenshot or the
  Rich Results Test screenshot is missing, ask for the FIRST missing one, ONE question, then STOP
  and wait. Repeat for the next one after the answer. Never invent a path, a URL, a business, or a
  figure: every score and every structured data type is READ from the screenshots, never guessed.

TASK:
Add one new work to the portfolio at `/{locale}/portfolio/<slug>/` (en and es), with its images
optimized into AVIF, WebP and JPEG on `cdn.hlorenzoz.com`, then publish one news post at
`/{locale}/news/<slug>/` that announces it. Verify both pages before closing.

## Rules that apply to every run

Read `AGENTS.md` and `CLAUDE.md` at the project root before editing. In particular:

- **Every piece of content ships in English and Spanish** (the site locales `en` and `es`): portfolio
  copy, news post, copy about the images. Write each language natively, never a literal translation,
  and never publish one locale without the other.
- **No hyphens in copy**: never join words with `-` and never use a spaced ` - ` as a dash in any
  visible text (portfolio copy, news post, llms.txt lines). Write `high performance`, `multidevice`,
  `7 to 14 days`, or rephrase. Only names and syntax keep it (`JSON-LD`, URLs, slugs, ISO dates).
  See AGENTS.md "No hyphens in site copy either"; `tests/i18n/copy-hyphens.test.ts` enforces it.
- **Plain ASCII only** in every file you touch (no em/en dashes, curly quotes, ellipsis character,
  non breaking spaces). Spanish copy carries its accents; that rule is about punctuation glyphs.
- **E-E-A-T**: every claim must be supportable from what the user supplied, the live site, or its
  llms.txt. No invented metrics, client counts, revenue, rankings, or results. Performance figures
  and structured data types appear in copy ONLY as read from the result screenshots (or measured in
  this run), stated as measured, with the test date.
- **Every case study shows both results.** The PageSpeed Insights scores and the valid structured
  data from the Rich Results Test always appear on the portfolio page (as the `speed` and `data`
  slides and in the copy), in the news post and in the llms.txt lines.
- **Freshness dates**: `lastModified` is today on every entry you create. `datePublished` is set once
  on creation and never changed on later edits. No build timestamps.
- **Task tracking**: `.agents/data/TODO.json` is the only backlog (schema in `CLAUDE.md` "Task
  tracking").
- **Never** rename, overwrite or delete existing assets, CDN objects, portfolio entries or news posts.
- **Never** commit, push, or bypass hooks with `--no-verify`. Leave the diff for the user.

## Steps

1. **Learn the business.** Fetch the site URL and the llms.txt (if it exists) with WebFetch. Note
   the business name, kind of business, location, services, and what the site does. List the files
   at the image path (`ls`, `file`). Open both result screenshots and note: the four PageSpeed
   Insights scores (Performance, Accessibility, Best Practices, SEO) on mobile, the date of the
   report, and every structured data type the Rich Results Test lists as valid, with its date.
   - **Business facts for the "About the business" section** (step 8, `type: 'live'` only). Collect
     them explicitly, ONLY from the live site, its llms.txt and the user's context: the business
     name, what it offers and to whom, where it is based and the area it serves, what distinguishes
     it in its own terms, and the languages it works in. Leave out unverifiable marketing figures
     (years of experience, client counts, ratings, fleet counts, founding years), prices, phones and
     emails.
   - **Client site inconsistencies.** While reading, note anything on the client site that
     contradicts itself or looks unfinished: conflicting figures, a wrong currency symbol,
     contradicting opening hours or confirmation times, placeholders. Do not fix or repeat them in
     the copy; list them in the report, because the agency built that site.

2. **Show a short plan, then continue.** Print: `id` and `slug` (kebab-case, unique against the ids
   in CONTEXT), `type` (`live` for a real client site, `demo` for a concept), the images found and
   the role of each (cover, full screenshot, slide, `speed`, `data`), the scores and valid types read
   in step 1, and the news post title (en and es). Do not wait for approval unless something is
   ambiguous.

3. **Open the task.** In `.agents/data/TODO.json` add a task: next id = highest `#T` number + 1
   (never reuse one), `estado: "en curso"`, `prioridad: "media"`, `tipo: "contenido"`,
   `titulo: "Portafolio: anadir <id> y su noticia"`, `anotada` = today, `hecha: null`,
   `origen: "usuario"`. Bump the top level `updated` to today.

4. **Stage the originals.**
   - **Check for unfinished client content first.** Look at every capture before staging it. If any
     shows placeholder text (such as "[Pendiente: ...]" or "Lorem ipsum"), links to "#", or other
     unfinished content, STOP and ask the user how to proceed (ONE question): publishing it shows an
     unfinished client site.
   - `mkdir -p assets/hlorenzoz.com/portfolio/<id>/` and `cp` the originals into it with clean
     kebab-case names: `cover.<ext>`, `screencapture-<page>.<ext>` for full page screenshots,
     `<slide-id>.<ext>` for carousel images. Originals may carry spaces or arbitrary names; always
     rename on copy.
   - The two result screenshots are staged and processed like every other image:
     `<id>-pagespeed-insights.png` and `<id>-structured-data.png`.
   - Keep a copy of the PageSpeed Insights original as evidence in
     `.agents/context/pagespeed/<id>/pagespeed-insights-<report date>.png` (`mkdir -p` first).
   - Only `.jpg`, `.jpeg` and `.png` are picked up by the pipeline; convert anything else first
     (`sips -s format png`).

5. **Optimize and upload.**
   - **List the pending sources first.** `just images-sync` uploads EVERY jpg/png under `assets/`
     that has no entry in `assets/mappings.json`, not only the ones staged in step 4. List the
     sources under `assets/` and compare them with the keys of `assets/mappings.json`; anything
     pending that is not part of this work must be moved out of `assets/` (ask the user where) before
     syncing.
   - **Check the Cloudflare account.** Run `bun x wrangler whoami`, then confirm the active account
     owns the CDN bucket: fetch one existing object with
     `bun x wrangler r2 object get images/<existing key> --remote --pipe | wc -c` and compare its byte
     count with the same file on `cdn.hlorenzoz.com` (`curl -s <url> | wc -c`). If the command fails
     or the counts differ, STOP and ask the user; do not upload.
   - Run `just images-sync`. It converts every new source under `assets/` into `.webp` (q80),
     `.avif` (q55) and `.jpeg`, strips EXIF/GPS metadata, uploads each format to R2 with wrangler,
     and records the URLs in `assets/mappings.json`, keyed by the path relative to `assets/`. Read the
     new `hlorenzoz.com/portfolio/<id>/...` entries there to get the URLs, e.g.
     `assets/hlorenzoz.com/portfolio/<id>/cover.png` ->
     `https://cdn.hlorenzoz.com/hlorenzoz.com/portfolio/<id>/cover.webp`. If an upload fails, stop and
     report; never write by hand a CDN URL that was never uploaded. Spot check one URL per format
     with `curl -sI` (expect `200`).

6. **When to use each format.**
   - **`.webp`** for every image rendered in a page (`image`, `fullScreenshot`, slide `image`,
     news `image`). `cloudflare-loader.ts` requests `/cdn-cgi/image/...,format=auto/`, so Cloudflare
     serves AVIF or WebP from that one URL according to the browser's `Accept` header.
   - **`.jpeg`** for OpenGraph/social cards and JSON-LD `image` arrays, where crawler support is
     widest (news `ogImage`).
   - **`.avif`** stays on the CDN as the archival optimized copy; reference it nowhere directly.
   - Alt text: the detail page builds `alt` from the item's `title` copy, so make `title` descriptive
     in both locales (business name plus what the site is), never a bare brand.

7. **Portfolio data.** Read an existing entry in `lib/portfolio-data.json` as the template
   (`masajes-orisha` for a live site with slides, `vicron-lopez` as another). APPEND the new entry
   LAST (newest last; `getPortfolioItems()` in `lib/portfolio.ts` reverses the array). Fields follow
   `PortfolioItem` in `lib/portfolio.ts`: `id`, `slug`, `lastModified` (today), `type`, `image`
   (cover `.webp`), `fullScreenshot` (one `.webp` or an array), `url` (live site), `bookingUrl`,
   `slides` (`id`, `image`, optional `map`, `title`, `description`, `link`, `badge`).
   - **Every entry ALWAYS carries the two result slides**, modeled on the `speed` and `data` slides
     of `malaga-event-gear`, placed right after the first design slide:
     - `speed`: `image` = the `<id>-pagespeed-insights.webp` URL, `link` =
       `https://pagespeed.web.dev/analysis?url=<URL encoded site URL>`;
     - `data`: `image` = the `<id>-structured-data.webp` URL, `link` =
       `https://search.google.com/test/rich-results?url=<URL encoded site URL>`.
     Their `description` states the scores and the valid types read in step 1.
   - `bookingUrl` and the other slide `link`s are external deep links into the client site. If that
     site serves one language per URL segment (e.g. `/` and `/gl/`, or `/es/` and `/en/`), OMIT
     them and add the id to `LOCALE_SEGMENTED_CLIENT_SITES` in `tests/lib/portfolio-data.test.ts`:
     one fixed URL would strand the other locale. The CTA then speaks to agency prospects and falls
     back to the site's own contact section. Only links into the client's own host are forbidden
     there: the `speed` and `data` tool links are locale neutral and stay on every entry.
   - Slide `badge`, `title` and `description` must be identical to the `en` copy in step 8
     (tested by `tests/lib/portfolio-data.test.ts`).

8. **Portfolio copy.** In BOTH `messages/en.json` and `messages/es.json`, add `portfolio.<id>` with
   exactly the key set of the newest comparable live item (read it; today `masajes-orisha`), not a
   remembered list: older entries still carry `features`, `techStack` and `seoOptimization`, which
   the detail page no longer renders. `description` is at most 160 characters in both locales.
   One key per slide id in step 7, `speed` and `data` included. Write each locale natively (not a
   literal translation); both must keep identical key sets (`tests/i18n/messages-parity.test.ts`).
   - **About the business (`type: 'live'` only).** Every live entry carries `portfolio.<id>.business`
     in both locales as `{ "title": "About <name>" / "Sobre <name>", "paragraphs": [2 strings] }`,
     rendered by `components/PortfolioBusiness.tsx` right after the hero of its detail page. Say who the business is, what it offers and to whom, where it operates,
     and what distinguishes it in its own terms. Describe, do not sell, and leave design and tech
     out: the rest of the page covers the website. Use only the facts collected in step 1, never
     the figures, prices, phones or emails excluded there. Write "we" only for the agency's own
     site. A test fails if a live entry lacks it in either locale. Demo entries do not get it.
   - **Explain why the results matter**, in both locales: good performance gives visitors a faster,
     smoother experience, and that supports conversions (more visitors stay, read and get in touch);
     valid structured data gives search engines explicit clues about the business and its pages,
     which helps semantic search understand the site, and makes those pages eligible for rich
     results, which supports SEO. State the measured scores and the valid structured data types
     with the test date. Ground both claims in Google's own docs (web.dev "Why speed matters";
     Search Central "Intro to structured data").
   - Never claim that structured data is a ranking factor, never promise a position on Google or in
     AI answers, and never claim it helps Google's AI features: Search Central says no special
     schema.org markup is needed for them (developers.google.com/search/docs/appearance/ai-features).
     Never borrow figures from other companies' case studies.

9. **References kept by hand.** Routes and both sitemaps derive from the data file
   (`lib/routes.ts` ROUTE_SOURCES), and `app/[locale]/portfolio/[slug]/page.tsx` emits the JSON-LD
   through `portfolioDetail()` in `lib/schema/index.ts`; no new page file is needed. Edit only:
   - `public/llms.txt`: add the item once under `## Portfolio Case Studies`, in the same format as
     its siblings, including both results: the PageSpeed Insights scores and the valid structured
     data types, with the test date (`tests/seo/llms-txt-accuracy.test.ts` checks each slug appears
     exactly once).
   - `tests/lib/portfolio-data.test.ts`: add a block for the new item mirroring an existing one
     (CDN `.webp` URLs, i18n keys present in both locales).
   - Freshness of the pages that now list the new work: the portfolio listing (`portfolio`), the
     home page (`''`, its news carousel) and the HTML sitemap (`sitemap`) gain a visible entry, so
     set their `lastModified` in `lib/routes.ts` `STATIC_ROUTES` to today.
     `tests/seo/sitemap-parity.test.ts` fails if `sitemap` is older than the newest route it lists.
     The news listing (`news`) derives its date from the newest post via `latestNewsModified()`;
     never edit it by hand.

10. **News post.** Announce the new work in one post.
    - Data: APPEND to `lib/news-data.json` (newest last):
      `{ "id": "<kebab>", "slug": "<kebab>", "datePublished": "<today>", "lastModified": "<today>",
      "portfolioId": "<id from step 7>", "image": "<cover .webp URL>", "ogImage": "<cover .jpeg URL>" }`.
    - Copy: in BOTH `messages/en.json` and `messages/es.json` add `news.items.<id>` with `title`,
      `description` and `paragraphs` (array of strings). State factually what was built, for which
      kind of business, and the stack. Mention both results: the PageSpeed Insights scores and the
      valid structured data types, with the test date, and say that the case study shows both
      reports. Link to `/{locale}/portfolio/<slug>/` and to the live site.
    - `public/llms.txt`: add the post once under `## News`, in the format of its siblings.
    - Routes `/{locale}/news/` and `/{locale}/news/<slug>/` and their JSON-LD (NewsArticle +
      BreadcrumbList on the detail page; CollectionPage + ItemList + BreadcrumbList on the listing)
      come from the pages; nothing per post.

## Verification, in order

1. `just validate` (lint + type-check + coverage). Fix every failure at its cause and run it again until
   green. Never `--no-verify`.
2. `just build-pages` (static export into `out/`).
3. **Performance.** Serve the export in the background with `bun sirv out -p 45724 --single`, then
   run Lighthouse (mobile, the default form factor) for `/en/portfolio/<slug>/` and
   `/en/news/<slug>/`:
   `bun x lighthouse http://localhost:45724/en/portfolio/<slug>/ --output=json --output-path=<scratch>/portfolio.json --quiet --chrome-flags="--headless --no-sandbox"`
   (same for the news URL). Read Performance, Accessibility, Best Practices and SEO scores plus LCP,
   CLS and TBT. Budgets (same as `lighthouserc.json`): accessibility >= 0.95, best-practices >= 0.9,
   SEO >= 0.95. Fix failures in the content you added (alt text, heading order, image sizes) and
   measure again. Stop the server with `kill`. Do NOT add these URLs to `lighthouserc.json`.
4. **Structured data.** For `out/en/portfolio/<slug>/index.html`, `out/es/portfolio/<slug>/index.html`,
   `out/en/news/<slug>/index.html` and `out/es/news/<slug>/index.html`, extract every
   `<script type="application/ld+json">` with a short `node -e` script, `JSON.parse` each, and
   assert:
   - portfolio: `BreadcrumbList` plus `WebSite` (type `live`) or `WebApplication` (type `demo`);
   - news: `NewsArticle` plus `BreadcrumbList`;
   - every `url`, `@id` and `item` is an absolute `https://` URL with the right locale;
   - the date part of `dateModified` equals `lastModified`, and the date part of `datePublished`
     equals the news `datePublished`; every date property carries a time and a timezone
     (e.g. `2026-11-24T00:00:00+01:00`), never a bare `YYYY-MM-DD`;
   - `about` (and `mentions`, if present) is a typed object with `@type`, `@id`, `url` and `name`,
     never a string;
   - breadcrumb `position`s run 1..n in order (Home, section, page);
   - `inLanguage` matches the page locale, and each HTML page carries `<link rel="alternate"
     hreflang>` entries for both `en` and `es` (plus `x-default` if the site emits it) pointing at
     the other locale's copy of the same page.
   Then run `bun x vitest run tests/seo`. After the deploy, run each live URL through Google's Rich
   Results Test (search.google.com/test/rich-results) and treat every warning, optional ones
   included, as a defect to fix before calling the work done.
5. **Result slides.** In `out/en/portfolio/<slug>/index.html` and
   `out/es/portfolio/<slug>/index.html`, assert that the `speed` and `data` slides render: each page
   contains the `<id>-pagespeed-insights.webp` and `<id>-structured-data.webp` image URLs and both
   tool links (`https://pagespeed.web.dev/analysis?url=...` and
   `https://search.google.com/test/rich-results?url=...`, HTML escaped as `&amp;` where needed).
6. **About the business** (`type: 'live'` only). In `out/en/portfolio/<slug>/index.html` and
   `out/es/portfolio/<slug>/index.html`, assert that the "About the business" section renders: each
   page contains its heading and the text of both `portfolio.<id>.business` paragraphs of that
   locale (HTML escaped where needed).
7. **Close the task.** Only when every step above passed: set the task `estado: "hecha"`,
   `hecha` = today, a single line `notas` entry with the Lighthouse scores, and bump `updated`. If
   anything failed or was skipped, leave it `en curso` and record why in `notas`.

## Report

Return, briefly:
- files changed (`git status --short`);
- the CDN URLs created, grouped by format, the two result images
  (`<id>-pagespeed-insights`, `<id>-structured-data`) included;
- the PageSpeed Insights scores and the valid structured data types read from the result
  screenshots, with their date;
- a Lighthouse table (page, Performance, Accessibility, Best Practices, SEO, LCP, CLS, TBT);
- the JSON-LD `@type`s found per page and locale;
- client site inconsistencies found in step 1 (or "none found"), for the agency to fix on that site;
- anything skipped or unverified, and the reminder that nothing is committed and production updates
  only on the next deploy.
