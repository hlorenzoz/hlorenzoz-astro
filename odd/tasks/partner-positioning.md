# partner-positioning

Objective: reposition the agency as a partner that analyses each client's needs and implements a tailored solution, publish no prices, and rebuild the four service pages as landing pages, in 9 locales. Branch: `feat/partner-positioning` (merged to `main` only when all 9 locales are done, since `main` deploys). Delivery: work-unit commits; push after the user's go-ahead. Test runner: Vitest, Playwright, Lighthouse CI. Plan: `~/.claude/plans/spicy-seeking-gizmo-of-74c2fce9-48f8-410f-9aaa-7e4023b5e282.md`.

## Specs

- **S1** Website Development landing (verbatim): "Necesito actualizar la página (estilo landing page) y añadir nuevas secciones sobre el performance (incluir la imagen de PageSpeed del sitio con un link para que se pueda comprobar) y su importancia para la experiencia de usuario, datos estructurados (imagen) con su link y texto descriptivo sobre la importancia, PWA, portafolio, traducciones, llms.txt (importancia para la IA)." Design approved on the canvas https://claude.ai/artifact/7PNuXPACkPbz7ahwusFPTq.
- **S2** Translation (verbatim): "Traducir la página actualizada a los múltiples idiomas".
- **S3** Design first (verbatim): "Crear diseño previo a aprobar".
- **S4** Other services (verbatim): "Actualiza también las páginas de los demás servicios con sus respectivos diseños".
- **S5** Prices (verbatim): "No pongas el precio directamente. Déjalo abierto. Se definirá según las necesidades del usuario y durante un primer contacto gratuito"; answers: Website Development price removed from the "Whole site"; other services "All on quote".
- **S6** Positioning (verbatim): "Ahora, se van a empezar a ofrecer servicios personalizados basados en la necesidad del cliente. Es decir, ahora somos partners enfocados en el éxito de nuestros clientes. Primero hacemos el análisis de sus necesidades. Luego continuamos con la implementación de las soluciones. Actualiza el copy del sitio web, así como las respectivas páginas de servicios. No especifiques precios. Los servicios pueden venir incluidos en la solución incluso gratis, según las necesidades del cliente". Answer: the needs analysis is "The free first call".
- **S7** Assumptions approved with the plan: A1 the four services are building blocks of one tailored solution, no "core" offer, no 30% bundle discount; A2 quotes exclude VAT and 50% of the agreed quote is paid up front; A3 the home `#numbers` section is removed.
- **S8** Conventions that keep applying (AGENTS.md): no AI typographic characters, no hyphen-joined words in copy, E-E-A-T (no invented claims, the first position on Google is never promised), every alt/caption/aria-label in messages.

## Tasks

| ID | Specs | Task | Route | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- |
| T1 | S3, S4, S6 | English copy and designs: Home landing + 4 service landings, for approval | inline (canvas) | done | approved 2026-11-26; canvas https://claude.ai/artifact/7PNuXPACkPbz7ahwusFPTq; sources in scratchpad `wd-design/canvas/project/*.dc.html` |
| T2 | S5, S7 | Remove the price machinery (lib/pricing, numbers, offer notes, payment links, pricing cards, JSON-LD offers and priceRange) | delegated writer (context backstop: parent session past ~150k) | in progress | |
| T3 | S1, S4 | Landing section components and the four service pages | inline | pending | |
| T4 | S6 | English copy into messages/en.json | inline | pending | |
| T5 | S2 | Translate into es, en-gb, gl, pt, it, fr, de, nl | 8 agents, one per locale | pending | |
| T6 | S5, S6 | AGENTS.md, README, glossary, llms.txt, dossier, agent and command docs | inline | pending | |
| T7 | all | Validate, build, Lighthouse, e2e; push after go-ahead | inline | pending | |

## Log

- **L1** (2026-11-26, user, verbatim): "Bien, ahora vamos a actualizar la página de http://localhost:4321/en-gb/services/website-development/ Necesito actualizar la página (estilo landing page) y añadir nuevas secciones sobre el performance (incluir la imagen de PageSpeed del sitio con un link para que se pueda comprobar) y su importancia para la experiencia de usuario, datos estructurados (imagen) con su link y texto descriptivo sobre la importancia, PWA, portafolio, traducciones, llms.txt (importancia para la IA). Traducir la página actualizada a los múltiples idiomas. Crear diseño previo a aprobar"
- **L2** (2026-11-26, evidence): the PWA image `pwa-tech.webp` is an illustration of an invented app ("SYNTHIA", "$184,210"), so the design uses the real install prompt of the dental demo instead. The Rich Results screenshot dates from 6 April 2026 (old Next.js site at www.hlorenzoz.com).
- **L3** (2026-11-26, evidence): the Stripe payment ledger is stale for every service (`isCurrent` rejects all four), so no page shows a pay button today; `publishedPriceRange` reduces with no initial value, so `priceRange` must go before `PRICING` empties.
- **L4** (2026-11-26, user, verbatim): "Crea los respectivos diseños primero. Incluye el dossier como descargable." and "También actualiza la Home page con sus respectivas secciones. Hazla especie de landing page, pero manteniendo las secciones que son relevantes, como las noticias, LinkedIn, ... debajo." Canvas now holds five artboards (Home, Website Development, Local SEO, AI Voice Receptionist, Software Development), each with a dossier download block. The dossier is today a local PDF build in en/es only (`just dossier`, gitignored output): publishing it is part of T6.
- **L5** (2026-11-26, evidence): claims left out of the designs because nothing in the repo backs them: "Up to 90% first call resolution" (AI Voice Receptionist) and "from a published starting price" (Software Development). The AI Voice design uses the site's own live ElevenLabs assistant as its proof; its sample dialogue is labelled illustrative.
- **L6** (2026-11-26, user, verbatim): "Approve them" (the five designs). Implementation starts; writers are delegated for the context backstop, one unit at a time (units share `messages/*.json`, `lib/routes.ts` and the home page, so they are sequential).
