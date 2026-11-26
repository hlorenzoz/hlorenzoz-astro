---
description: Write three English Upwork proposals for one job posting, each leading with a different angle, mapped to Lorenzoz Agency services: local SEO (with review management), website development, AI voice receptionist, and custom software development
argument-hint: [job title on the first line, then the job description below it, optionally with the Upwork job URL]
allowed-tools: Read, Grep, Glob, Write, Bash(pwd), Bash(date:*), Bash(echo:*), Bash(mkdir:*), Bash(rg:*), Bash(fd:*), mcp__plugin_engram_engram__mem_save, mcp__plugin_engram_engram__mem_current_project
---

CONTEXT:
- Working directory: !`pwd`
- Today: !`date +%Y-%m-%d`
- Year: !`date +%Y`
- Month: !`date +%m`
- Day: !`date +%d`
- Raw input: $ARGUMENTS

INPUT RESOLUTION:
- The first non-empty line of `$ARGUMENTS` is the job title.
- Job URL, optional. Scan all of `$ARGUMENTS` for the first Upwork URL (`https://www.upwork.com/...`,
  usually `/jobs/~0...` or `/freelance-jobs/apply/...`). If one is found it becomes `jobUrl`. If that
  URL occupied a line of its own, drop that line from the job description body so it is not stored
  twice. If no URL is present, `jobUrl` stays `""`. Never ask for it and never invent it. It is
  genuinely optional.
- Everything left after the title is the job description.
- If `$ARGUMENTS` is empty, ask for the job title and the job description, then STOP. Do not invent
  a job posting.

TASK:
Write three Upwork proposals in English, in the first person, for ONE job. Each shows this specific
client how the service or services offered on this website solve their specific problem, each leads
with a different angle so there is a real choice to make, and each closes with a call to action
pointing at the Upwork profile. Recommend one of them. Then save them to disk with a success
counter so future runs can learn from the proposals that worked.

This command is self contained. Do not load any skill. Everything needed is below.

## Why this is hard

The client will receive twenty to fifty proposals, most of them AI generated, most of them
interchangeable. Polished, formal, and empty. They archive those on sight. Roughly ten to fifteen
seconds decide whether yours gets read. So the proposal has to prove, in its first sentence, that a
person read their post. Everything below serves that.

## Reference lookup, before writing anything

Sweep `upwork/proposal/**/*.md` recursively. Proposals are nested under `YYYY/MM/DD/`, so a
non-recursive glob will silently find nothing and the command will still write a file. Read only
the frontmatter of each one.

Keep that glob on `*.md`. Each proposal also has three `.txt` twins holding the variant bodies
without frontmatter, so broadening the sweep to every file counts every proposal four times and
finds a `score` on none of them.

Keep the proposals that share a service with the current job and have `score` greater than `0`,
sorted by `score` descending, and take the best three. Read the body of those three and use them as
a reference for angle and tone. Never copy their sentences. If none scores above `0`, carry on with
no reference and say so in the output.

Read only the variant its frontmatter names in `sent`. That is the one the client saw and the one
the score belongs to. The other two were rejected, and mining them for angle is learning from the
drafts that lost. If `sent` is empty on a scored proposal, treat the score as unattributable, skip
that file, and say so in the output so the field gets filled in.

`sent` also tells you something the score alone cannot: which ANGLE keeps winning. If the scored
references are mostly `b`, this client base responds to proof, and variant `b` deserves the
recommendation unless this particular post argues otherwise.

## Source of truth

Read these before writing a single word, in this order:

1. `AGENTS.md`. Positioning (a partner: needs analysis first, then implementation), the four
   services, how we work, and the commercial guardrails. It declares itself the
   single versioned source of truth for proposals.
2. `public/llms.txt`. A one page summary already reconciled with the four services.
3. `lib/site-config.ts`. Identity, contact, served markets.
4. `messages/en.json` under `services.*`. Copy and deliverables for each service.
5. `lib/portfolio-data.json`. The projects that can be cited.

Do not read `lib/pricing.ts`: it holds no price. See the pricing rule below.

## Identity, non negotiable

- The proposal is written in the first person as **Hector Luis Lorenzo Zaldivar**, Founder and AI
  Architect at **Lorenzoz Agency**, per `lib/site-config.ts`.
- The only valid catalog is the four services on this website. Any service not present in
  `lib/routes.ts` and `messages/en.json` does not exist, no matter how well it would fit the job.
- Never claim a tool, certification, or past project that is not evidenced in this repo. If the job
  asks for something we do not do, say so plainly or do not bid. See the service matching rules.

## Step one, hidden client instructions

Before anything else, read the job post end to end, including the dull parts. Clients bury tests to
filter out AI spam, and most applicants miss them. They look like:

- "Write HOWDY at the top of your application"
- "What is 2+2? Include the answer"
- "Mention the word banana somewhere"
- A question in the middle of a paragraph that expects a direct answer

If you find one, follow it EXACTLY as written and put the answer where they asked for it, usually
the very top. This is the cheapest filter to pass and the most common one to fail. Do it first.

## Proposal structure

Six parts. The client scans before they read, so keep it skimmable.

| Part | Length | Purpose |
|---|---|---|
| Hook | 25 words | Their specific problem, named back to them |
| Relevance | 50 to 75 words | Comparable work, with a real result |
| Solution | 50 to 75 words | How you would tackle THIS project, in numbered steps |
| Proof | 30 to 50 words | One or two portfolio projects with concrete detail |
| Timeline | 15 to 25 words | A specific duration, never "ASAP" |
| CTA | 15 to 20 words | One next step, pointing at the Upwork profile |

There is no Investment part. Pricing never appears. See the pricing rule.

**Hook.** Greeting plus their specific problem. Lead with their problem, never with your
credentials. They care about their situation first.
Bad: "I am writing to express my interest in your project."
Good: "Your patients cannot find your opening hours or book from a phone."

**Relevance.** Comparable work with something concrete attached. Prefer a real number pulled from
the repo, such as a PageSpeed score, over an adjective.

**Solution.** Numbered steps specific to their project, not a list of general capabilities. This is
the part that shows you understood the brief.

**Proof.** Name the artifact. "I rebuilt Malaga Event Gear off an aging WordPress install, it now
scores 93 on mobile PageSpeed" beats "I have built similar sites."

**Timeline.** A specific duration grounded in what the repo documents. Never "ASAP", never
"quickly", never "as soon as possible".

**Length.** Target 180 to 250 words for the full proposal. Under 100 reads as low effort, over 400
gets skimmed instead of read. If it can be said in fewer words, say it in fewer words.

## Service matching

The proposal focuses on the service or services that best solve THAT client's problem, not on the
catalog. Read the job, name the real problem, and only then choose.

| Signals in the job | Service |
|---|---|
| website, landing page, redesign, WordPress migration, speed, Core Web Vitals, conversion | Website Development |
| phone, calls, receptionist, answering service, after hours, missed leads, appointment booking | AI Voice Receptionist |
| Google Business Profile, map pack, near me, citations, multi location | Local SEO |
| reviews, reputation, Google reviews, testimonials, feedback loop | Local SEO (review management is one of its four pillars, never sold on its own) |
| app, mobile, iOS, Android, Flutter, SaaS, backend, platform, dashboard | Software Development |

Selection rules:

- **One** service when one solves the problem. This is the normal case and the one that converts best.
- **Two** only when they genuinely interlock and the second reinforces the first, for example a new
  site that also needs to show up in the map pack. Justify the link inside the proposal, do not just
  list them.
- **Never three or more.** Naming half the catalog signals that the job was not read.
- If **no service fits**, for example a Rust backend or a logo design, do not force the match.
  Return `status: blocked`, explain why there is no fit, and recommend not applying. Skipping a bid
  beats promising something we do not offer. Five well matched proposals beat twenty five stretched
  ones, and a stretched one costs credibility we do not get back.

The chosen service goes into the `services` frontmatter field. That is what lets future runs find
comparable references.

## Proof you may cite

A proposal without proof is an opinion. Always cite previous work, and draw on **both** the live
client projects and the concept demos. The demos are often the closest match by industry, which is
exactly why they exist, and a well labelled demo in the right sector beats a live project in the
wrong one.

The full roster, as of the last refresh. Every entry is real and published:

| Project | Type | Sector | What it proves |
|---|---|---|---|
| Malaga Event Gear | live | AV and event gear rental, Malaga | WordPress rebuild, 93 mobile PageSpeed, LocalBusiness and Organization schema |
| Vicron Lopez | live | Luxury and sports car rental, Ourense | Bilingual with translated URLs and hreflang, filterable fleet, per vehicle pages, local signals |
| Masajes Orisha | live | Therapeutic massage studio, Costa Rica | Bilingual, light and dark themes, filterable treatment menu, four step booking request |
| Lorenzoz Agency | live | This agency site | Next.js 16, Tailwind 4, Cloudflare, Vitest and Playwright in CI, 95%+ PageSpeed, JSON-LD, PWA |
| Ecladent Dental Clinic | demo | Dental practice | Google Business Profile optimized content, full test coverage, 95%+ PageSpeed, PWA, structured data |
| Luxury Real Estate | demo | Property listings and agencies | Listing and rental browsing, GBP optimization, full test suite, structured data |
| Demo Massage | demo | Massage studio, Richmond London | Editorial design, clear treatment menu, frictionless booking flow, SEO driven journal |
| Investep App | demo | Multi broker investment tracking | Flutter with Hono on Cloudflare, consolidated dashboard, return projections, admin console |

URLs follow a fixed pattern, so build them rather than memorising them:

- Case study: `https://hlorenzoz.com/en/portfolio/<slug>/`
- The whole portfolio: `https://hlorenzoz.com/en/portfolio/`
- Live sites: malagaeventgear.com, www.vicronlopez.es, masajesorisha.com, hlorenzoz.com
- Demo sites: `<slug>.hlorenzoz.com`, except Investep which is investep.hlorenzoz.com

Slugs: `malaga-event-gear`, `vicron-lopez`, `masajes-orisha`, `lorenzoz-agency`, `dental-clinic-1`,
`real-estate`, `demo-massages`, `investep-app`.

Never write a `localhost` URL into a proposal. Production URLs only.

Labelling rule, and it is not optional:

- **live** is a real client project. Name it and link it freely.
- **demo** is a **concept demo**, built to show capability, not commissioned by a client. Say so in
  the same sentence that mentions it. Never let a demo read as a client engagement, not even by
  omission. Passing off a demo as a client is the one mistake here that costs the deal outright.

How to use it:

- Cite one or two projects, chosen for closeness to this client's sector and problem. A dental job
  reaches for Ecladent. A car rental job reaches for Vicron Lopez. A bookings driven local business
  reaches for Masajes Orisha.
- When nothing matches the sector closely, cite on the strength of the capability instead, and point
  at the portfolio page so they can browse the range themselves.
- Only enumerate several projects when the client explicitly asks for a body of work or a range.
  Otherwise two well chosen ones beat a list, which reads as padding and eats the word budget.

**Staleness check.** This table is a fast index, not the authority. `lib/portfolio-data.json` is.
Read it every run and confirm the projects you are about to cite still exist there with the same
`type`. If the JSON holds a project this table does not, use it and tell the user the table needs a
refresh. Never cite a project absent from the JSON, no matter how well it would fit.

## Hard facts, never invent

- Experience reads as "several years of experience". Never a number of years, a client count, or a
  revenue figure.
- The 1M+ figure is a target the agency works toward. Never a promise, never a typical result.
- The homepage testimonials, David Chen, Sarah Jenkins, Marcus Thorne, are placeholders. Never cite
  them. The same goes for "hundreds of businesses".
- The agency operates online from Spain and delivers across AU, CA, CR, IE, NZ, ES, GB, US. Do not
  confuse where it is based with where it delivers.
- Never oversell. If part of the job sits outside what we do, saying so builds more trust than
  papering over it, and it filters out engagements that would go badly anyway.

## No pricing, hard rule

The proposal NEVER carries a monetary figure. No EUR, no USD, no hourly rate, no range, no "starting
from", no "around". The agency publishes no price for any service: every solution is quoted
after a free first call, which is the needs analysis, and a service may even come included in the
solution. Quotes exclude VAT, and 50% of the agreed quote is paid up front; those terms belong to
the quote, not to the proposal.

- There is no Investment part in the structure, by design.
- If the job explicitly asks for a budget or a rate, do not ignore it and do not invent one.
  Acknowledge it in a single line and say the quote comes out of a free first call that analyses
  what they need. That is honest and it pushes toward the conversation, which is where we want to be.
- `lib/pricing.ts` holds no price any more, and nothing in a proposal needs it.
- The site copy and `public/llms.txt` no longer carry figures either, but the rule holds on
  discipline, not on the figures being absent: an older proposal under `upwork/proposal/` may still
  carry one, and whatever the source, no monetary amount reaches the proposal.
- Before writing the file, reread the proposal hunting for currency symbols, EUR, USD, `/mo`, `per
  month`, `per hour`, `starting from`. If one survived, cut it.

## Technical standards that ship with every build

These are the pillars documented on the portfolio case studies in `messages/en.json`, under
`portfolio.<slug>.features_carousel.slides`. They are evidence, not claims, and most freelancers
bidding against this cannot show any of them. They are the strongest differentiator available.

| Pillar | What can be said, and it is verifiable |
|---|---|
| Performance | PageSpeed Insights 95%+ across the portfolio. Malaga Event Gear scores 93 on mobile, with 100 in Accessibility, Best Practices and SEO. Clients can run the test themselves |
| Core Web Vitals | Lighthouse tracks Core Web Vitals in the pipeline, not checked once at launch and forgotten |
| Functionals and QA | Vitest for functional and component tests, Playwright for end to end, QA pass before every launch |
| CI/CD | GitHub Actions pipeline, so releases are repeatable rather than hand deployed |
| Structured data | JSON-LD for rich results. Breadcrumbs, LocalBusiness and Organization schemas, validated with Google's Rich Results Test |
| OpenGraph | Custom social metadata, so shared links render properly instead of as a bare URL |
| SEO, AEO and GEO | Optimized for traditional search, for AI answers, and for geographic results |
| Google Business Profile | Content built and optimized around the GBP profile, which is what moves the map pack |
| Multi device | Verified on mobile, tablet and desktop before launch, every layout and interaction |
| PWA | Installable, works offline, app like without an app store |
| Bilingual | Translated URLs with hreflang pairs, indexed as one site. Shipped on Vicron Lopez and Masajes Orisha |
| GDPR | Granular cookie consent where analytics and marketing can be rejected one by one, not a banner that only says accept. Shipped on Vicron Lopez |
| Tech stack | Next.js 16, Tailwind 4, Cloudflare CDN |

**Pick by job signal, never list the whole table.** Two or three pillars that answer their stated
problem, woven into the solution steps rather than bolted on as a spec sheet:

| What the client complains about | Pillars to reach for |
|---|---|
| Slow site, bad on phones | Performance with the real numbers, Core Web Vitals, multi device |
| Not showing up locally, map pack | Google Business Profile, structured data, SEO AEO GEO |
| Site looks broken when shared | OpenGraph |
| Burned by a previous freelancer, wants reliable or maintainable | Functionals and QA, CI/CD |
| Multi language or multi market | Bilingual with hreflang |
| European client, privacy or compliance sensitive | GDPR |
| Wants an app but has a small budget | PWA |

Do NOT reach for this table on a quick fix, a small one off, or a simple content change. There it
reads as padding and burns words the proposal needs elsewhere. And never quote a figure that does
not appear in the repo. The numbers above are the ceiling, not a starting point to round up from.

## Risk reduction

Clients hire to reduce risk. When the project is large or the client sounds unsure, lower the
perceived stakes instead of pushing harder:

- Propose a first phase. "Let's start with the rebuild, then move to the local search work once you
  see how it performs."
- Offer visibility. Progress updates, a staging link, something they can watch.

Use this when it fits. Do not bolt it onto every proposal.

## Call to action

Every proposal closes with a CTA pointing at `https://www.upwork.com/freelancers/hlorenzoz`,
inviting the client to look through other delivered projects and to get in touch to move the project
forward. One next step, written as an invitation rather than a plea.

Workable shapes, to adapt rather than paste:

- "You can see other projects I have delivered on my Upwork profile. Message me and we will scope
  yours."
- "Other work is on my Upwork profile. When would you like to kick off?"
- "Have a look through my Upwork profile, then send me a message and I will walk you through how I
  would approach your practice specifically."

Banned: "Please let me know if you have any questions." It is passive and it closes nothing.

## Voice

Write like a person who read the post, not like a template that was filled in.

- **Use contractions.** "I'd", "you're", "can't", "I'll". Not "I would be", "you are", "I am
  confident that".
- **Mirror their language.** If they wrote workflow, write workflow, not process. If they wrote
  practice, write practice, not business. Casual post, casual reply. Technical post, technical reply.
- **Name two or more specifics from their post.** This is what proves a human read it.
- **Numbers over adjectives.** "93 on mobile PageSpeed" beats "excellent performance". "Live in 7 to
  14 days" beats "quick turnaround".
- **Lead with their problem, not your credentials.**
- **Short paragraphs.** Long blocks get skimmed past.

Greeting: open with "Hi {name}," when the job names a person, "Hi there," when it does not. No
emoji.

Anti-patterns, each of which marks a proposal as AI slop:

| Anti-pattern | Why it fails |
|---|---|
| "Dear Hiring Manager" | Screams template |
| "I hope this message finds you well" | The single most common AI tell |
| "I am writing to express my interest" | Robotic, says nothing |
| "I'm the perfect fit for this role" | Everyone writes this |
| Opening with your credentials | They care about their problem first |
| Listing every service or skill | Irrelevant to their job, and it shows |
| Restating their job description back at them | Adds nothing |
| "ASAP" as a timeline | Vague, means nothing |
| "Please let me know if you have any questions" | Passive, no next step |
| Multiple emoji | Reads as unprofessional |
| Vague claims: extensive experience, proven track record | Unfalsifiable, so it is ignored |

## Character restrictions

These apply to the proposal body. Frontmatter is metadata, not prose.

- Banned characters: em dash, en dash, a lone hyphen used as a dash, semicolon, curly quotes, the
  ellipsis character, bullet characters.
- Allowed: hyphens inside compound words such as `well-designed` and `e-commerce`, numbered lists,
  commas, and periods.
- Banned vocabulary, the tells that give an AI away: "delve", "leverage", "seamless", "robust
  solution", "in today's fast-paced world", "I hope this message finds you well".

## Three variants, one job

Every run produces **three** complete proposals for the same job, labelled `a`, `b` and `c`, so the
choice of angle is made by someone who knows the client, not by the first draft that appeared.

They are not three rewordings of one idea. Rewordings are useless to choose between. Each variant
leads with a different read of what will actually win this client, and the lead is what changes:

| Variant | Leads with | Send it when |
|---|---|---|
| `a` Problem-led | The risk or pain they described, named back to them | Default. The post reveals a problem worth naming, and no explicit portfolio demand |
| `b` Proof-led | The closest comparable project and its hardest number | They asked for examples, samples, or a portfolio, or the post reads as sceptical of freelancers |
| `c` Plan-led | The concrete steps, in order, for their exact brief | They wrote a detailed spec and want evidence you read and understood all of it |

Rules that hold across all three, without exception:

- The six-part structure applies to each one, and each one lands in 180 to 250 words with its own
  short version. A variant that skips Proof or Timeline is not a variant, it is an unfinished draft.
- Every hard rule in this file applies three times over: no monetary figures, no invented claims,
  every demo labelled a concept demo, the same CTA target, plain ASCII.
- The facts stay identical across variants. The angle changes, the truth does not. If `a` says 7 to
  14 days, `c` cannot say 5. If they contradict each other, one of them is wrong and would have
  been sent.
- The service match is decided once, for the job, and is the same in all three. Three variants are
  three ways to open a conversation about ONE service fit, not a hedge across the catalog. If you
  find yourself matching a different service per variant, the job was not read closely enough.
- Proof may differ between variants. `b` should reach for the strongest comparable, `a` and `c` can
  cite more briefly to spend their words elsewhere.

**Recommend one.** A flat menu of three pushes the decision back onto the user, which is the work
this command exists to do. State which variant to send and why, in one or two sentences, grounded
in something the client actually wrote. The user overrides it whenever they know the client better,
and that override is the whole point of generating three.

## File write

Every run writes **four files** into the day folder, sharing one slug base. They serve different
readers and none replaces another:

| File | Reader | Contents |
|---|---|---|
| `<slug>.md` | you, later | The full record: frontmatter, the job posting, all three variants with their short versions |
| `<slug>-a.txt` | Upwork, right now | Variant `a`, the proposal body alone |
| `<slug>-b.txt` | Upwork, right now | Variant `b`, the proposal body alone |
| `<slug>-c.txt` | Upwork, right now | Variant `c`, the proposal body alone |

The `.txt` files exist so the chosen proposal can be pasted without editing anything out of it.
Opening the `.md` to send means scrolling past frontmatter, the whole job posting and two variants
you rejected, then selecting around a heading, which is exactly where a stray `## Variant b` ends
up in a client's inbox.

1. Create the day tree with `mkdir -p upwork/proposal/YYYY/MM/DD` using the year, month, and day
   injected in CONTEXT. Month and day stay two digits, `08` not `8`, so alphabetical order matches
   chronological order.
2. Write `upwork/proposal/YYYY/MM/DD/<job-title-slug>.md` with this shape:

```markdown
---
date: YYYY-MM-DD
jobTitle: <the job title>
jobUrl: <the Upwork URL, or "">
services: [<matched service slugs>]
recommended: <a | b | c>
sent: ""
score: 0
notes: ""
---

# <the job title>

<Job URL as a markdown link, only when one was detected>

## Job posting

<the original job description, verbatim>

## Variant a, problem-led

<the full proposal, 180 to 250 words>

### Short version

<the condensed version, 100 to 150 words>

## Variant b, proof-led

<the full proposal, 180 to 250 words>

### Short version

<the condensed version, 100 to 150 words>

## Variant c, plan-led

<the full proposal, 180 to 250 words>

### Short version

<the condensed version, 100 to 150 words>
```

3. Write the three `.txt` files, `<slug>-a.txt`, `<slug>-b.txt` and `<slug>-c.txt`. Each holds its
   own proposal body and NOTHING else. No frontmatter, no title, no `## Variant` heading, no job
   posting, no short version, no surrounding commentary. It opens, you select all, you paste, you
   send.

   The short versions deliberately stay out. Two blocks in one file breaks select-all, which is the
   only reason these files exist. They live in the `.md` and on screen.

   Body only means body only: from `Hi there,` through the CTA line, with the blank lines between
   paragraphs preserved so it lands in Upwork already formatted.

4. If that slug base already exists **in that day's folder**, suffix the BASE with `-2`, `-3`, and
   carry it into all four names: `<slug>-2.md`, `<slug>-2-a.txt`, `<slug>-2-b.txt`,
   `<slug>-2-c.txt`. The collision suffix goes on the base, never on the variant letter, or `-2`
   and variant `b` become indistinguishable. NEVER overwrite an existing file. Doing so would wipe
   a `score` and a `sent` that were set by hand. Identical slugs on different days coexist fine,
   they live in separate folders.

5. The files must agree. Each `.txt` body is the same text that sits under its `## Variant` heading
   in the `.md`, character for character. Generate the `.txt` files by extracting from the `.md`
   rather than retyping, so they cannot drift. A `.txt` that drifts from its record is worse than
   no `.txt`, because the record stops describing what the client actually received.

`recommended` is written by the command. `sent`, `score` and `notes` are the user's, and the
command only ever writes their empty starting values.

`sent` records which variant was actually sent, as `a`, `b` or `c`. It is not bookkeeping. A scored
proposal whose `sent` is empty teaches a future run nothing, because there is no way to tell which
of three angles earned the score, and the wrong one gets copied.

`score` starts at `0` and the user raises it manually as the proposal advances. A consistent scale:
`0` sent, `1` viewed, `2` replied, `3` interview, `5` hired. The command only ever writes `0` and
only ever sorts by the value it reads.

## Output on screen

- All three proposals, each ready to paste, each as one uninterrupted block under its own heading
  naming the variant and its angle. No commentary threaded into them, no notes between their
  paragraphs. Anything you want to say about a variant goes after it, never inside it.
- The short version of the recommended variant only. Three more blocks would bury the proposals
  themselves, and the other two short versions are in the `.md` if they are wanted.
- The recommendation, with the reason, in one or two sentences.
- The paths, labelled so it is obvious which one to open: three `.txt` to paste, the `.md` to keep.
- Which past proposals were used as a reference, with the variant each one sent, or a note that
  none is scored yet.
- A reminder to set `sent` in the frontmatter once a variant goes out. Without it the score cannot
  be attributed to an angle, and the next run learns nothing.

## Checklist before writing the file

- [ ] Read the ENTIRE job post, hidden test instructions included, and followed them first
- [ ] Named two or more specifics from their post
- [ ] Led with their problem, not with credentials
- [ ] Matched one or two services, and justified the link if two
- [ ] Cited previous work, drawn from the roster and confirmed against `lib/portfolio-data.json`
- [ ] Every demo cited is labelled a concept demo in the same sentence, no exceptions
- [ ] No `localhost` URL anywhere
- [ ] Technical pillars, if used, answer a problem the client actually stated, and read as two or
      three woven into the solution rather than a spec sheet
- [ ] Zero monetary figures
- [ ] Specific timeline, no "ASAP"
- [ ] CTA points at the Upwork profile and asks for one next step
- [ ] Contractions used, no banned phrase or character present
- [ ] 180 to 250 words, plus a short version
- [ ] Nothing claimed that this repo does not evidence

Then, because there are three of them:

- [ ] Three variants written, each complete, each leading with a genuinely different angle rather
      than a reworded opening
- [ ] The facts agree across all three: same timeline, same service match, same claims
- [ ] Every rule above verified against EACH variant, not just the recommended one
- [ ] One variant recommended, with a reason grounded in something the client wrote
- [ ] All four files written on one slug base, and each `.txt` holds its proposal body alone with
      no heading, no frontmatter and no short version
- [ ] Each `.txt` is character for character identical to its `## Variant` section in the `.md`,
      because it was extracted from it rather than retyped
- [ ] `recommended` set in the frontmatter, `sent` left empty for the user

## Result contract

Return:
- `status`: `done` | `blocked` | `partial`
- `executive_summary`: what the client's real problem is and which service answers it
- `services_matched`: the service slugs used
- `proof_cited`: which portfolio projects were referenced, and their type
- `proposal_path`: the `.md` record that was written
- `paste_paths`: the three `.txt` files, keyed by variant
- `recommended`: which variant to send, and the reason in one sentence
- `references_used`: past proposals used as reference, with their scores and the variant each one
  sent, or `none`
- `next_recommended`: what to do next, highest impact first

## Persistence

Call `mem_save` with `topic_key: "upwork/proposals/{job-slug}"`, `type: "pattern"`, recording the
job, the service matched, the angle each of the three variants took, and which one was recommended
and why. Derive `{job-slug}` from the job title.

Write plain ASCII only in the proposal: no em dashes, en dashes, spaced hyphens used as a dash,
semicolons, curly quotes, ellipsis characters, or bullet characters. Keep hyphens only inside
compound words, URL slugs, file names, and code.
