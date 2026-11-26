# Project Agents & Skills

This document tracks the specialized agents (skills) active in this project and their core responsibilities.

## Project Focus

Lorenzoz Agency's multilingual marketing site: the site supports the nine locales of
`LOCALES` in `lib/routing.ts` (`en`, `es`, `en-gb`, `gl`, `pt`, `it`, `fr`, `de`, `nl`) and is published page by page: a page exists in a
locale once its copy is translated into `messages/<locale>.json` (`pageLocales` in
`lib/i18n.ts`); until then it is not built there and gets no hreflang to it. Image alt text,
captions and titles, and every aria-label, are copy: they live in `messages/<locale>.json`, are
translated with the page, and a locale missing one does not publish that page. Words are fixed
in `docs/i18n-glossary.md`.

This section is the **single versioned source of truth** for the agency's commercial
facts: positioning, services, how the agency works with a client, and its terms. Copy for
the site, schema, llms.txt, proposals, and any generated content must be written against
it, not against memory or against whatever an older page happens to say. The upstream
brief it was first transcribed from is `.agents/context/# Lorenzoz Agency - Website Development .md`;
the partner model below (2026-11-26) supersedes the offer and prices written there.

### Positioning

Lorenzoz Agency is a partner focused on its clients' success. It builds solutions for local
businesses of any size, and the mission is to create the conditions for clients to generate
1M+ in revenue per year.

The agency does not sell a menu of services. It works in two steps: first it analyses what
the client's business needs, then it implements the solution that answers those needs. The
outcome it works toward is the same for every client: new customers and more business.

The agency has several years of experience delivering this work and the results clients
hired them for. The promise is a division of labour: the client focuses on delivering
their own service well, while the agency owns customer acquisition and follow-up for
their business.

Two notes for anyone writing copy from this:

- "Several years of experience" is the claim the agency makes about itself. Do not
  inflate it into a specific number of years, a client count, or a revenue figure that
  is not documented somewhere in this repo. Under Google's E-E-A-T guidance an
  unverifiable specific is worse than an honest general (see the E-E-A-T section below).
- The 1M+ figure is a target the agency works toward, not a guarantee or a typical
  result. Write it as an objective, never as a promise.

### Target markets

The agency serves clients worldwide, but focuses primarily on six markets:

- Australia
- Canada
- Costa Rica
- Europe
- United Kingdom
- United States

The agency is an **online provider**: physically registered in Xinzo de Limia, but
delivering worldwide, focused on these markets. So the two facts sit in different
schema.org fields, and this table is the source of truth for both:

- **`address`** (`lib/site-config.ts`) stays the physical registration: Xinzo de Limia,
  Ourense, Spain. It is where the business IS, not where it sells.
- **`ORGANIZATION.areaServed`** is exactly this list, emitted as schema.org `Country`
  entities, and Europe as a `Continent` (UN M.49 code `150` in `SERVED_MARKETS`). It is where the business DELIVERS. Keep the two in step: editing this table
  means editing `areaServed`.

Do not collapse the two. The address is one town; the served area is five countries and a continent.
Putting the town into `areaServed`, or a country into `address`, misstates the business.

### Agency Services

The agency offers four services. None of them is a "core" offer and none is an add-on to
another: they are the building blocks of one solution, combined per client according to
what the needs analysis finds. A client may need one of them or all four. A service may
come included in the solution, even at no extra cost, when the client's needs call for it.

**Local SEO.** Its purpose is to rank a local business at the top of Google for the
searches its customers make, and to have it recommended by AI engines. When it is part
of a solution, it comes with all three of its pillars:

- **Authority content**: keyword research, content clusters, content gap analysis and
  updates to existing content, to establish the business as an authority.
- **Authority on Google and AI**: the business and its website established as the
  reference that gets recommended in Google results and AI answers.
- **Review management**: tracking review growth over time, monitoring customer responses
  and positive and negative feedback trends, and branded feedback links.

Review management used to be sold as its own service ("Review Management" / "Reputation
Management"). It is now a pillar of Local SEO and is NOT sold separately.

The other three building blocks:

- **Website Development**: high-conversion websites and PWAs.
- **AI Voice Receptionist**: inbound-call receptionists that answer FAQs and book appointments 24/7.
- **Software Development / Mobile App Development**: full-stack products (Flutter + backend) across all devices and screens.

**Paused: Digital Business Card.** Not offered since 2026-10-08. It is paused, not
retired: do not delete its code or copy, and do not advertise it. Its route is commented
out in `lib/routes.ts` and its page sits in the private folder
`src/pages/[locale]/services/_digital-business-card/`, which Astro does not route (the `_`
prefix excludes it). Bringing it back is task #T0021.

Two notes for anyone writing copy from this:

- **The first position on Google is a goal, never a guarantee.** Nobody controls
  Google's ranking, so a promised position is a claim the agency cannot keep. Write what
  the work aims at, never the result as a certainty. This is the same rule as the 1M+
  figure above.
- **Do not single out happy customers for review requests.** Asking only satisfied
  customers for a review (review gating) is against Google's policies. Feedback links go
  to every customer.

### How we work

Every engagement follows the same four steps:

1. **Free needs analysis.** The first call is free and IS the needs analysis: the agency
   learns how the business wins customers today, where it loses them, and what it needs.
2. **Tailored proposal and quote.** From that analysis the agency proposes one solution,
   built from the services the business actually needs, and quotes it.
3. **Implementation.** The agency implements the solution, while the client keeps
   focusing on delivering their own service.
4. **Measured together.** Results are measured with the client and the solution is
   adjusted to them. The relationship is a partnership, not a one-off sale.

Terms, and each one is a billing dispute if it is lost in a summary:

1. **The entry price is the only published figure: 500 EUR + VAT.** It pays for a first
   implementation that commits both sides and takes the first steps (decided 2026-11-26).
   Everything after it is quoted after the free needs analysis, according to the client's
   needs, and a service may come included at no extra cost. Never write any other figure,
   a "from" price, a range or a discount, on the site, in the structured data, in
   `public/llms.txt`, in the dossier or in a proposal template.
2. **Quotes exclude VAT.** Say so wherever a quote is mentioned.
3. **The entry price, then a monthly fee tied to results.** When the services start, the
   client pays the entry price for the first implementation. After that, a monthly fee is
   billed in advance, its amount tied to the results agreed in the proposal. The new
   customers the solution brings in are what cover it. Never state the amount of the
   monthly fee.
4. **There is no free trial.** The free part is the needs analysis, nothing else. If you
   find a trial claimed anywhere in the repo or in generated copy, it is stale and wrong.
5. **There is no bundle discount.** The former 30% "alongside Local SEO" discount is gone
   with the prices; do not mention it.

One price lives in code: `ENTRY_PRICE` in `lib/pricing.ts`, next to the service keys and
their slug helpers. Copy never holds the amount: it uses the `{entryPrice}` token, filled
and formatted per locale by `copyTokens()` (`lib/copy-tokens.ts`). The home and the four
service landings mark it up as one `Offer` each (`entryOffer` in `lib/schema`), and only
where the same price is visible: the home's fees section and FAQ, each service's price FAQ
(the package panel on Website Development). The services hub shows it in its hero but
emits no Offer. Google ignores, and may act against, markup for content readers cannot
see. `tests/seo/no-published-prices.test.ts` guards the rule: it fails on any currency
amount or price placeholder in the `services.*`, `home.*` and `offer.*` copy of every
locale, on a `priceRange` or `hasOfferCatalog`, and on any Offer other than the entry price
or one whose price the page does not show.

### What this site currently implements

The home page and four service pages (**Local SEO**, **Website Development**, **AI Voice
Receptionist**, **Software Development**), each built as a landing page around the partner
model: the free needs analysis as the call to action, the service as one building block of
a tailored solution, and the dossier as a download (`public/dossier/`, built by
`just dossier`, one PDF per site locale). There is no price list: the only figure is the
entry price, stated where the fees or the price question come up; the home keeps the news,
LinkedIn and other relevant sections below the landing.

`/services/reputation-review-management/` and `/services/digital-business-card/` no
longer exist; both redirect permanently (`public/_redirects`). `/card/hector` is Hector's
own digital card, a page and not the service, and stays.

## Active Skills

This file is documentation, not a loader. What the agent actually sees is
governed by the symlinks in `.claude/skills/` (managed by the skills CLI via
`skills-lock.json`), NOT by this table. For each symlinked skill, only its
`name` + `description` is loaded into context at session start (progressive
disclosure); the full `SKILL.md` body loads on demand, only when that skill is
invoked.

45 skills are active (symlinked + tracked), grouped by source:

| Source | Count | Skills |
| :--- | :--- | :--- |
| `coreyhaines31/marketingskills` | 41 | ad-creative, ads, ai-seo, analytics, cold-email, community-marketing, competitor-profiling, competitors, content-strategy, copy-editing, copywriting, cro, customer-research, emails, free-tools, image, launch, lead-magnets, marketing-council, marketing-ideas, marketing-loops, marketing-plan, marketing-psychology, offers, onboarding, paywalls, popups, pricing, product-marketing, programmatic-seo, prospecting, public-relations, referrals, revops, sales-enablement, schema, seo-audit, signup, site-architecture, sms, social |
| `chromedevtools/chrome-devtools-mcp` | 1 | chrome-devtools |
| `zubair-trabzada/geo-seo-claude` | 1 | geo-llmstxt |
| `bergside/awesome-design-skills` | 1 | glassmorphism |
| `vercel-labs/skills` | 1 | find-skills |

## Site Architecture: Core 30 and the Reverse Silo

Two names, one tree. **Core 30** is the local-business version: the website's URL hierarchy
mirrors the client's Google Business Profile (GBP) hierarchy exactly, so Google can align the
two and build topical relevance. The **Reverse Silo** (PageOptimizer Pro's interlinking model)
is the same shape stated as pure internal linking, with no GBP naming or NAP: supporting posts
chain laterally to their adjacent siblings and all funnel link equity DOWN into a target
(pillar) page that never links back out. A Core 30 tree IS a reverse silo nested two or three
levels deep.

This distinction matters because this repo uses the tree in a way the GBP framing does not
cover, spelled out under "How this applies to hlorenzoz.com" below.

This section is the **single versioned source of truth** for the methodology. Do not copy the
tree below into other files; link to this section instead.

Three globally installed artifacts implement it (they are NOT in this repo; see the layout note
above). Each is client-agnostic and reads project facts from the open repo when auditing:

| Concern | Command | Sub-agent | Persists under |
| :--- | :--- | :--- | :--- |
| GBP URL tree + NAP | `/local-seo:website-structure-review` | `gbp-site-architect` | `gbp-structure/{business-slug}` |
| Core 30 supporting content | `/local-seo:create-supporting-content` | `local-content-writer` | `gbp-content/{business-slug}/{page-slug}` |
| Reverse-silo interlinking (content) | `/seo:reverse-silo-review`, `/local-seo:blog-posts-structure-review` | `reverse-silo-architect` | `reverse-silo/{business-slug}` |

Each command is a thin wrapper: it resolves the mode and delegates to its sub-agent, which holds
the methodology. Every one of those agents must keep `mcp__plugin_engram_engram__mem_save` in its
`tools:` list, since the audit is persisted under the topic key above; drop it and the
persistence instruction becomes dead code. The `{slug}` is always derived from the OPEN project,
never carried over from another client.

Use `gbp-site-architect` / `/local-seo:website-structure-review` for the GBP URL tree and NAP
concerns; use `reverse-silo-architect` / `/seo:reverse-silo-review` for the post-level
interlinking (down-link to target, lateral chain to adjacent siblings, target is an equity sink).

### The structure

```
Homepage - GBP Landing Page            "GBP Primary Category City Name"
|
+-- GBP Category 1                     "GBP Secondary Category / Service City Name"
|   +-- GBP Service 3
|   |   +-- Supporting Content 1       "People Also Ask City Name"
|   |   +-- Supporting Content 2       "People Also Ask City Name"
|   +-- GBP Service 4
|   +-- GBP Service 5
|
+-- GBP Category 2                     "GBP Secondary Category / Service City Name"
|   +-- GBP Service 6
|   +-- GBP Service 7
|   +-- GBP Service 8
|
+-- GBP Category 3                     "GBP Secondary Category / Service City Name"
|   +-- GBP Service 9
|   +-- GBP Service 10
|   +-- GBP Service 11
|
+-- Critical GBP Service 1             (linked directly from the homepage)
+-- Critical GBP Service 2             (linked directly from the homepage)
|
+-- Locations                          "GBP Primary Category Geo Landmark"
    +-- Location Page 1
    +-- Location Page 2
    +-- Location Page 3
```

**Homepage** targets the primary GBP category plus the city: "Plumber Houston", "Air
Conditioning Repair Denver". It is the main ranking target.

**Category pages** cover each secondary GBP category ("Gas Line Installation Service",
"Drain Cleaning Service"). These are comprehensive pages explaining the full scope of the
category, not thin one-paragraph pages.

**Service pages** cover each individual service listed under that category on the GBP.
Under "Drain Cleaning Service": Emergency Drain Cleaning, Main Sewer Line Cleaning,
Kitchen Drain Cleaning, Bathroom Drain Cleaning, Storm Drain Cleaning.

| Page type | Naming pattern |
| :--- | :--- |
| Homepage | GBP Primary Category + City Name |
| Category page | GBP Secondary Category + City Name |
| Service page | GBP Service + City Name |
| Location page | GBP Primary Category + Geo Landmark |
| Supporting content | People Also Ask question + City Name |

### Internal linking mirror

- **Homepage links to**: all category pages, plus one or two critical services.
- **Category pages link to**: the homepage (breadcrumb) and all their service pages.
- **Service pages link to**: their parent category page and the homepage (breadcrumb), AND
  every supporting-content page beneath them.
- **Supporting content links to**: its parent service page and the homepage (breadcrumb).

That third rule used to stop at the breadcrumb, and the code matched: a category emitted a
list of its services and a service emitted nothing, so every supporting post had an inbound
internal link from precisely nowhere. The mirror is only a mirror if it runs both ways at
every tier. `KIND_TO_CHILD_TIER` in `lib/service-page.ts` encodes it, and
`ContentPage.children()` gives the page component the links to render.

Target volume: 1 homepage, 5-10 category pages, 20-30+ service pages.

### When to use which command

For a CLIENT engagement (a real local business with a GBP):

- `/local-seo:website-structure-review` - starting an engagement, auditing an existing client
  site against Core 30, or confirming where a service or location page belongs, before any
  content work. Pass a URL or business name.
- `/local-seo:create-supporting-content` - writing the supporting posts once the tree exists.

For THIS repo's own content (see "How this applies to hlorenzoz.com"):

- `/seo:reverse-silo-review` or `/local-seo:blog-posts-structure-review` - define the silo from a
  keyword list, or audit the current interlinking. Run with no argument to audit this repo.

### When NOT to use them

| Need | Use instead |
| :--- | :--- |
| Copy for a single page | `copywriting` skill |
| Technical SEO audit (crawl, speed, meta) | `seo-audit` skill |
| Generating many pages from a template | `programmatic-seo` skill |
| Structured data / JSON-LD | `schema` skill |

### How this applies to hlorenzoz.com

hlorenzoz.com is NOT a local business. It is a global agency (work already live in Spain and
Costa Rica) with no single service area, and it does NOT currently have a Google Business Profile.
So Core 30 does not apply here in its literal GBP form: there is no primary-category-plus-city
homepage, no city-name naming pattern (`<service>-<city>`), no `location` tier.

What DOES apply is the tree's SHAPE. The plan is to grow an on-site content network as a **reverse
silo** (the POP model above): pillar pages that must rank, supporting posts chained laterally and
funnelling equity down into them. This is built gradually, and a GBP will be added eventually, at
which point the Core 30 naming layers on top of a structure that already has the right shape.

Current state, so an audit reports against reality rather than an assumed GBP tree:

- Route tiers today: `home`, `category` (one hub, `/services`), `service` (four pages), `page`,
  `legal`. Each service page shares one slug identity across `lib/routes.ts`,
  `messages/<locale>.json`'s `services.*` namespace, and its own
  `src/pages/[locale]/services/<slug>/index.astro`; there is no string-matched duplication.
- **There is no blog / posts tier yet.** The `supporting` child tier that
  `KIND_TO_CHILD_TIER` (`lib/service-page.ts`) already points services at is UNPOPULATED: the
  reverse-silo scaffolding exists in code, the posts do not. That layer is the future content
  network described above, added post by post.
- The interlinking mirror (services down-link to their category, categories to the homepage) is
  already the reverse silo's down-link rule at the tiers that exist. Extending it to a `supporting`
  post layer is the next step, not a rewrite.

So: running `/seo:reverse-silo-review` in repo mode today is expected to report the silos as
having no supporting layer yet, and `/local-seo:website-structure-review` is expected to report a
missing `location` tier. Both gaps reflect the site's current scope, not a bug in the command.
Treat the service pages as conversion landing pages for now; treat the reverse silo as the plan
the content is built toward.

## Skills Location

All skills live under `.agents/skills/`. The skills CLI exposes each tracked
skill to the agent via a symlink in `.claude/skills/` pointing to
`.agents/skills/<name>`, and it rewrites that symlink set on every
`npx skills update`. Do NOT hand-create symlinks: the next update run rewrites
the set and removes them. Adopt a skill into the lock instead
(`npx skills add <owner/repo>`).

`.agents/skills/`, `.claude/skills/`, and `.claude/settings.*` are gitignored: they are
local setup, rewritten by the skills CLI.

The SEO and Local-SEO agents and slash commands are INSTALLED GLOBALLY, not committed here:
`~/.claude/agents/` (`seo-auditor`, `seo-fixer`, `gbp-site-architect`, `local-content-writer`,
`reverse-silo-architect`, `cwv-optimizer` for Core Web Vitals and Lighthouse performance) and `~/.claude/commands/` (`/seo:review`, `/seo:fix`,
`/seo:reverse-silo-review`, `/local-seo:website-structure-review`,
`/local-seo:create-supporting-content`, `/local-seo:blog-posts-structure-review`). They were
moved out of the repo so one copy serves every client project instead of being re-forked per
site. The trade-off is real and worth stating: they do NOT survive a fresh clone, so a new
machine has to install them separately, and a change to one affects every project at once.

The opposite holds for what is specific to THIS site, which IS committed here:

| Command | What it does | Runs |
| :--- | :--- | :--- |
| `/website:add-to-portfolio` (`.claude/commands/website/`) | New portfolio work: images to the CDN, detail page and image text in every published locale, Lighthouse and JSON-LD checks, plus its `/news/` post | inline |
| `/linkedin:create-content` (`.claude/commands/linkedin/`) | LinkedIn post, carousel or article that backlinks to a page of this site; drafts are saved under `.agents/content/linkedin/` | agent `linkedin-content-writer` (`.claude/agents/`) |
| `/upwork:create-proposal` (`.claude/commands/upwork/`) | Upwork proposals mapped to the agency's services | inline |

`.agents/context/` is split by scope, and the distinction is load-bearing:

- `~/.agents/context/` - **global reference material**, identical for every project. Google's
  Search Quality Rater Guidelines PDF lives here, alongside the global agents that read it.
- `.agents/context/` (this repo) - **per-project source material**: Search Console exports,
  the agency brief, client documents. Committed deliberately, except
  `.agents/context/**/*.png`. Commercial or SEO source documents dropped in there must be
  committed, or the next clone reasons from nothing.

`.agents/data/` holds the project's working data, also committed. Today that is one file,
`.agents/data/TODO.json`: the single backlog for this repo. Its schema and the rules for
keeping it current are in `CLAUDE.md` under "Task tracking".

## Content Conventions

### E-E-A-T: the official source is on disk (MANDATORY)

`~/.agents/context/google-eeat-guideline/searchqualityevaluatorguidelines.pdf` is Google's
own **Search Quality Rater Guidelines** (2025 edition, 182 pages). It is the canonical
definition of E-E-A-T and of what Google rates Lowest. It sits in the GLOBAL context store,
not in this repo, because every client project reasons from the same copy.

**On any E-E-A-T question, read that PDF before answering.** Not a blog post, not training
data, not this file. Summaries of E-E-A-T are wrong often enough to matter, and a wrong
answer here shapes every page produced. If the PDF and any other source disagree, the PDF
wins, including when the other source is `AGENTS.md` or
`~/.claude/agents/local-content-writer.md`.

Sections worth going to directly:

| Question | Section |
| :--- | :--- |
| What E-E-A-T actually means | 3.4 (p. 26) |
| Reputation, and what to do when there is none | 3.3.4 - 3.3.5 (p. 25) |
| Scaled content abuse, AI-generated content | 4.6.5 - 4.6.6 (p. 42) |
| Copied or paraphrased content | 4.6.6 - 4.6.7 (p. 42-44) |
| What Lowest quality requires | 4.0 - 4.1 (p. 29-31) |
| Thin information about the business | 5.5 - 5.6 (p. 63) |
| What High quality looks like | 7.0 - 7.3 (p. 71-73) |

Three points from it that are routinely stated wrong elsewhere, so do not restate them
from memory:

1. **Trust is the centre of E-E-A-T, not a fourth peer.** Experience, Expertise and
   Authoritativeness exist to support the assessment of Trust. "If a page is untrustworthy
   for any reason, it has low E-E-A-T."
2. **Authoritativeness means being a go-to source for the topic**, not linking out to
   authoritative sources. Google's example: a local business is the authoritative source
   for information about itself.
3. **Missing reputation is not a negative signal for a small business.** "This is not
   indicative of high or low quality", and a page "can still receive a High rating without
   reputation information."

### Freshness Dates (MANDATORY)

EVERY time a page or post's content is created or modified, update its modification date in
**every** place that carries one, in the same change. Never leave one behind.

**Why this is not bookkeeping.** Freshness is a Trust signal under Google's E-E-A-T
guidance: a page that states when it was last reviewed is making a checkable claim about
its own currency, and a stale or absent date on advice that changes over time (pricing,
regulations, platform behaviour) reads as content nobody maintains. Dates that disagree
across the sitemap, the structured data, and the visible page are worse than no dates at
all, because they show the maintenance is not real. One change, every place, same value.

The places, and the order to touch them:

1. **The route's `lastModified` field** (ISO `YYYY-MM-DD`). This is the ONLY place the last
   content change is recorded. Both `/sitemap.xml` and the human sitemap at
   `/{locale}/sitemap/` read it, and `defineContentPage` derives the page's schema
   `dateModified` and OpenGraph `modifiedTime` from it, so one edit updates all four.
   Which file holds it depends on where the route comes from:
   - **Hand-written pages** (home, legal, the digital card): `STATIC_ROUTES` in
     `lib/routes.ts`.
   - **Data-derived pages**: the data source itself, because that is where the route is
     defined. Portfolio detail pages live in `lib/portfolio-data.json`, one
     `lastModified` per entry, alongside the content it describes.

   The rule of thumb: the date lives next to the content, never in a second list that has
   to be kept in step with it. A content page config has no `dateModified` field at all,
   deliberately: it used to, and one fact in two files kept in step by this very procedure
   is what let the schema date drift from the sitemap date.
2. **The visible byline** - `src/components/ArticleByline.astro` renders the same date in a
   `<time dateTime>` element. Readers and crawlers must see the same value.
3. **`datePublished`** - set once, on creation. NEVER bump it on an edit. Rewriting the
   publication date of an existing page to look fresh is a trust problem, not an SEO tactic.
   This one genuinely lives on the page config: the registry has no equivalent.

**Stored as a date, emitted as a datetime.** Every one of these places stores a plain
`YYYY-MM-DD`. JSON-LD date properties and OpenGraph `article:published_time` /
`article:modified_time` emit it through `schemaDateTime` (`lib/schema/datetime.ts`), which
turns it into midnight in Europe/Madrid with its real offset: `2026-11-24T00:00:00+01:00`. `/sitemap.xml` `<lastmod>` uses the same value (W3C Datetime, as Google reads it).
Never write a date into a schema builder by hand. Google's Rich Results Test flags a date
only value as "Invalid datetime value" and "missing a time zone". The visible
byline keeps the plain date. Likewise `about` and `mentions` are always typed objects
(`@type`, `@id`, `url`, `name`), never a bare URL string, which Google reads as a Thing named
after the URL. `src/components/JsonLd.astro` asserts both rules on every object it renders, so a
violation fails the build and the page tests.

Two rules that are easy to get wrong:

- **Do not use a build timestamp.** `lastModified` is hand-maintained on purpose. A
  `new Date()` at build time claims every page changed on every deploy, which teaches
  crawlers to ignore the field entirely. The sitemap generator used to do this; it no longer does.
- **Bump only on meaningful content change.** A typo fix or a class rename is not a content
  change. Inflating the date on cosmetic edits devalues the signal exactly like a build
  timestamp does.

This site is a static export, so a date change only reaches production on redeploy. An
updated date that has not been deployed is not an updated page.

### No "AI" Typographic Characters (MANDATORY)

NEVER insert AI-tell typographic characters into ANY file (content, code, comments, commits, tests, scripts). Use plain ASCII equivalents:

| Forbidden | Char | Use instead |
| :--- | :--- | :--- |
| Em dash | `—` | comma, colon, period, or `(parentheses)` per context; `-` in code/labels |
| En dash | `–` | `-` (hyphen) or `to` for ranges |
| Curly single quotes | `‘` `’` | `'` (straight apostrophe) |
| Curly double quotes | `“` `”` | `"` (straight quote) |
| Ellipsis | `…` | `...` (three dots) |
| Non-breaking space | ` ` | normal space |

This applies to `messages/*.json`, `lib/*.json`, all `.astro/.tsx/.ts` (copy, markup, comments), scripts, and commit messages. When choosing a replacement for `—`, pick punctuation that fits the sentence: do not blindly swap for a hyphen in prose.

**No hyphens in site copy either.** Visible text (`messages/*.json`, the text fields of
`lib/*.json`, `public/llms.txt`, and any copy written into components) never joins words with
`-` and never uses a spaced ` - ` as a dash. Hyphenated compounds such as "high-performance" or
"conversion-optimized" read as generated copy on this site. Rewrite them:

| Instead of | Write |
| :--- | :--- |
| A compound modifier (`high-performance`, `mobile-first`) | Open form (`high performance`), or rephrase (`built to convert`) when the open form reads badly |
| A prefix (`multi-device`, `non-commercial`) | Closed form (`multidevice`, `noncommercial`). In Spanish this is also the RAE norm: `multidispositivo`, `multiplataforma` |
| A range (`7-14 days`) | `7 to 14 days` / `7 a 14 dias` |
| A spaced dash (`A - B`) | comma, colon, period or parentheses |

Exceptions, where the hyphen is part of the name or the syntax: proper and technical names
(`JSON-LD`, `Wi-Fi`), URLs, slugs, ids, ISO dates, phone numbers, code, and the leading `- ` of a
Markdown list item. `tests/i18n/copy-hyphens.test.ts` enforces this; extend its allowlist only for
a genuine proper or technical name, never to silence a compound.

## Project Ownership

- **Lead Orchestrator**: Antigravity
- **Methodology**: Test-Driven Development (TDD) + Spec-Driven Development (SDD)
- **Design System**: Custom Glassmorphism (Vanilla CSS + Tailwind 4)
- **Tech Stack (this site)**: Astro 7 (static output), Tailwind CSS v4, Bun, Playwright, Cloudflare Workers.
- **Client delivery stack (Software / Mobile App Development service)**: Flutter (frontend) + full-stack backend, targeting all devices and screens. Not the stack of this repo.
