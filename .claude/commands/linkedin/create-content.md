---
description: Create professional LinkedIn content (post, carousel or article) that promotes a page of hlorenzoz.com and links back to it, written by the linkedin-content-writer agent
argument-hint: [post | carousel | article] [topic, site page or URL to promote] [optional language, audience, tone, extra context]
allowed-tools: Read, Grep, Glob, Agent, Bash(pwd), Bash(date:*), Bash(node:*)
---

CONTEXT:
- Working directory: !`pwd`
- Today: !`date +%Y-%m-%d`
- Latest news posts (newest last): !`node -e "console.log(require('./lib/news-data.json').slice(-5).map(i => i.id).join(', '))"`
- Latest portfolio case studies (newest last): !`node -e "console.log(require('./lib/portfolio-data.json').slice(-5).map(i => i.id).join(', '))"`
- Service pages: !`node -e "console.log(require('fs').readdirSync('src/pages/[locale]/services').filter(d => !d.startsWith('_') && !d.includes('.')).join(', '))"`
- Raw input: $ARGUMENTS

INPUT RESOLUTION:
- **Type**: `post`, `carousel` or `article` anywhere in `$ARGUMENTS` (also accept the Spanish
  `publicación`, `carrusel`, `artículo`, and "document post" for carousel).
- **Topic**: the site page, URL, case study, news post or subject to write about. A
  `hlorenzoz.com` URL, a path such as `/services/local-seo/`, or an id from CONTEXT all count.
- **Language**: if `$ARGUMENTS` names one (`en`, `es`, English, español), use it. Otherwise use
  the language `$ARGUMENTS` is written in. Never ask.
- **Audience, tone**: take them from `$ARGUMENTS` if present. Otherwise leave the defaults to the
  agent (local business owners in the target markets of `AGENTS.md`; direct, expert, first
  person). Never ask.
- **Extra context**: everything else in `$ARGUMENTS`, passed through untouched.
- If the type or the topic is missing, ask for the FIRST missing one, ONE question, then STOP and
  wait. Ask for the next one only after the answer.
  - For the type, offer the three options: a post (short text, one idea, link in the first
    comment), a carousel (document post, slide by slide copy plus a design brief), or an article
    (long form with sections and inline links).
  - For the topic, offer to pick from recent site content: the latest news posts and portfolio
    case studies in CONTEXT, and the service pages. Say the content will link back to that page.
- Never invent a topic, a page or a URL.

TASK:
Launch the `linkedin-content-writer` agent once, with the Agent tool and
`subagent_type: linkedin-content-writer`, then relay its result.

The agent sees ONLY the brief you write, so make it complete. Before writing it, resolve the topic
to a real page: confirm its path with Grep in `lib/routes.ts`, `lib/portfolio-data.json` or
`lib/news-data.json`. If the topic is a subject rather than a page, pick the closest existing page
to link to and say which one you picked. If no page fits, ask the user which page to link, ONE
question, then STOP.

The brief contains, in this order:

1. Content type.
2. Topic, and the target page: its path, its locale and its canonical URL
   `https://hlorenzoz.com/<locale>/<path>/`.
3. Language, audience and tone (stated by the user, or "default").
4. The user's extra context, verbatim.
5. Today's date from CONTEXT (for the saved file name and header).
6. The user's original request, verbatim.
7. This standing rule, verbatim: "Nunca incluyas caracteres de IA en los textos". In this repo it
   means both `AGENTS.md` rules: no AI typographic characters and no hyphens in copy.

Do not restate the agent's own instructions in the brief (facts, specs, backlink rules, output
format): it already has them.

When the agent returns, print its content in chat exactly as it gave it, ready to paste, followed
by the saved file path and the "Claims left out" list. Do not rewrite the content. Never commit.
