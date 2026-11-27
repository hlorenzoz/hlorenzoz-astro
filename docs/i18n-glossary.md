# Translation glossary

Shared by everyone who writes copy for the 9 site locales, so every page names the same
thing the same way. Source of truth for the facts is `AGENTS.md`; this file only fixes the
words. If a translator finds a better established term, change it here first, then in copy.

## Rules for every locale

- Write natively for that market: never a literal translation of the English or Spanish.
  `en` is the reference text; `es` helps for `gl` and `pt`.
- Keep the ICU placeholders exactly (`{name}`, `{index}`...), the
  rich tags (`<meg>`, `<trad>`, `<br>`) and the JSON structure (same keys, same array lengths).
- Plain ASCII punctuation only: no em/en dashes, curly quotes, ellipsis character or
  non-breaking spaces. Letters keep their accents and diacritics (a, c, n with tilde, umlauts...).
- No hyphen joining words in visible copy (`tests/i18n/copy-hyphens.test.ts`). German and
  Dutch: write closed compounds (`Webentwicklung`, `websiteontwikkeling`) and rephrase
  acronym compounds instead of hyphenating them (`Agentur fur lokales SEO` with its umlaut,
  not `SEO-Agentur`). Proper and technical names keep theirs (`JSON-LD`, `Wi-Fi`).
- No price, figure, range or discount ever appears in copy: every solution is quoted after
  the free first call (`tests/seo/no-published-prices.test.ts`). Where copy mentions a quote,
  it says the quote excludes VAT, with the tax name below.
- No service is a "core" offer: the five services are building blocks of one tailored
  solution.
- No promises of rankings or results; the first position on Google is a goal, never a
  guarantee. "Several years of experience" is never turned into a number.
- Brand and product names stay as they are: Lorenzoz Agency, ElevenLabs, Google Business
  Profile, PageSpeed Insights, Astro, Next.js...
- `en-gb` is British English: British spelling (optimise, organisation, colour), "VAT",
  dates like 25 November 2026.

## Terms

| Concept | en | en-gb | es | gl | pt (pt-PT) | it | fr | de | nl |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| VAT (quotes exclude it) | VAT | VAT | IVA | IVE | IVA | IVA | TVA | MwSt. | btw |
| Local SEO | Local SEO | Local SEO | SEO Local | SEO local | SEO local | SEO locale | SEO local | Lokales SEO | Lokale SEO |
| Website Development | Website Development | Website Development | Desarrollo Web | Desenvolvemento web | Desenvolvimento web | Sviluppo web | Creation de sites web | Webentwicklung | Websiteontwikkeling |
| AI Voice Receptionist | AI Voice Receptionist | AI Voice Receptionist | Recepcionista de Voz IA | Recepcionista de voz con IA | Rececionista de voz com IA | Receptionist vocale con IA | Receptionniste vocal IA | Telefonassistent mit KI | Telefoonreceptionist met AI |
| AI Business Automation | AI Business Automation | AI Business Automation | Automatizacion de Negocio con IA | Automatizacion de negocio con IA | Automacao de negocio com IA | Automazione aziendale con IA | Automatisation d'entreprise par IA | Geschaeftsautomatisierung mit KI | Bedrijfsautomatisering met AI |
| Software Development | Software Development | Software Development | Desarrollo de Software | Desenvolvemento de software | Desenvolvimento de software | Sviluppo software | Developpement logiciel | Softwareentwicklung | Softwareontwikkeling |
| Portfolio | Portfolio | Portfolio | Portafolio | Portfolio | Portfolio | Portfolio | Portfolio | Portfolio | Portfolio |
| News | News | News | Noticias | Novas | Noticias | Notizie | Actualites | Neuigkeiten | Nieuws |
| Case study | Case study | Case study | Caso de estudio | Caso de estudo | Caso de estudo | Caso di studio | Etude de cas | Fallstudie | Case study |
| Book a consultation | Book Consultation | Book a consultation | Reservar Consulta | Reservar consulta | Marcar consulta | Prenota una consulenza | Reserver une consultation | Beratung buchen | Consult boeken |

Accents are omitted in this table only to keep it ASCII; write them in copy (Creation ->
Création, Developpement -> Développement, Actualites -> Actualités, Rececionista ->
Rececionista, Noticias -> Notícias in pt, Automatizacion -> Automatización, Automacao de
negocio -> Automação de negócio, Geschaeftsautomatisierung -> Geschäftsautomatisierung).
