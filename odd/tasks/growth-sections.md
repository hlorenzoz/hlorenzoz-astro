# Growth sections, new fee model, Local SEO with three pillars

Objective: implement the approved canvas designs (home calculators, fee model, Local SEO three pillars, Software "How we build", services hub copy) in 9 locales.
Branch: `feat/partner-positioning`. Delivery: one commit per unit, no push without the user's OK. Tests: Vitest (`bun run test`), Playwright (`playwright.static.config.ts`), `just validate`. Backlog: `#T0054`.

## Specs

- S1. Home "What changes for your business" redesigned as in the canvas: eyebrow, title + gradient, subtitle, image `https://cdn.hlorenzoz.com/hlorenzoz.com/portfolio/me/multiple-screens.webp` with three chips, three cards with a "Today" and a "With us" line. Copy: `home.benefits.*`.
- S2. Home "cost of waiting" calculator: inputs customers lost per working day (default 1) and first visit value (default 140); outputs day, week (x5), month (x5x52/12), year (x260); 0 or empty shows "-". Dental clinic example table from the OCU dental survey of 27 Nov 2024 (Spain medians: cleaning 60, filling 80, root canal 250, implant 1850, orthodontics 2000 EUR), per week and per month for one lost patient a day. User: "Add numbers de forma tal que el cliente pueda ver cuánto le cuesta no hacerlo. En un diseño anterior hacía un cálculo por cliente diario, y de ahí salía cuánto perdía semanal y mensualmente. Añade un ejemplo basado en los precios estándares de mercado para una clínica dental". Copy: `home.costOfWaiting.*`; amounts in `lib/cost-example.ts`, not in messages.
- S3. Home "What is a new customer costing you today?" calculator: spend (1500), customers (10), worth (400); outputs cost per customer, worth, return ratio. Copy: `home.acquisition.*`.
- S4. Fee model, user: "pago inicial bajo al comenzar los servicios, y luego mensualidad basada en resultados, cubierta por la captación automatizada de nuevos clientes (win-win)". Replaces "50% of the agreed quote up front" on the home (`home.fees.*`, FAQ 3), terms page, dossier, llms.txt, AGENTS.md, README, CLAUDE.md. `UPFRONT_SHARE` and the `{upfront}` token are removed. No price published; quotes exclude VAT.
- S5. Local SEO, user: "Quita los servicios de backlinks y sitacions". Three pillars in all 9 locales, the dossier, llms.txt and docs.
- S6. Software Development "How we build" section, user: "Añade una sección de seguridad, eficiencia, automatización, pruebas, DevOps CI/CD" and "Esta sección va en la página de desarrollo de software". Copy: `landing.softwareDevelopment.build.*`.
- S7. Services hub hero copy matches the partner model (`services.hub.title/subtitle`).
- S8. Every new or changed key translated in en-gb, gl, pt, it, fr, de, nl.

## Tasks

| ID | Specs | Route | Status | Commit |
| :--- | :--- | :--- | :--- | :--- |
| T1 | S1-S8 en/es copy, pillar deletion in 9 locales | inline (parent owns messages) | done | |
| T2 | S1-S3, S4 home part | delegated W1, finished inline after the weekly limit | done | see Log |
| T3 | S4 terms, dossier, docs; S5 dossier and docs | delegated W2 | done | see Log |
| T4 | S6, S7 | delegated W3 | done | see Log |
| T5 | S8 | delegated translators; pt clitics and fr hub title fixed inline | done | see Log |
| T6 | seam: dossier PDFs, dates, build, validate, e2e | inline; independent verifier unavailable (weekly limit) | done | see Log |

## Log

- L1 (2026-11-26) User: "Perfecto. Implementa los cambios en el diseño. Me encantó la idea de la calculadora." and "Usa múltiples agentes para la implementaciones porfa". Earlier: "Usa múltiples agentes para la implementación, traducción, y actualización de referencias porfa".
- L2 Plan approved (plan file spicy-seeking-gizmo). Phase 1 copy written in en/es; rollout locales lost Local SEO pillar index 1 in benefits and deliverables.
- L3 (2026-11-26) All seven agents stopped on the weekly usage limit after writing their files; W3 reported done. The parent finished W1 tests and e2e, fixed the pt clitic hyphens and the fr hub title (43 > 42 chars), rebuilt the dossier PDFs.
- L4 (2026-11-26) User: "Porfa, quita la parte superior de la sección "What is a new customer costing you today?" pero deja "How our fees work: when you win, we win"". S3 dropped: home.acquisition removed in 9 locales, AcquisitionCost.astro replaced by FeesModel.astro (#fees).
- L5 (2026-11-26) User: "En la sección "What changes" cambia la imagen o actualiza la sección. Esa imagen no es relevante". The image is replaced by a three step journey panel built from home.benefits.chips; imageAlt removed in 9 locales.
- L6 (2026-11-26) User: "Pon el tamaño de la tarjeta de la sección "FROM LINKEDIN" (imagen 1) del mismo tamaño que las de la sección "NEWS" (imagen 2)". LinkedIn cards now use the News card widths (293 px = 293 px measured).
- L7 (2026-11-26) Evidence: just build-pages 0 MISSING_MESSAGE; just validate 81 files, 2058 passed; Playwright chromium + Mobile Chrome 88 passed; dist grep for "50% of the agreed", "paid up front", "Backlinks and citations" returns nothing outside news.
- L8 (2026-11-26) User: "En los datos estructurados, considera el precio de entrada en 500 euros para una implementación previa que comprometa ambas partes y dar los primeros pasos". Answer to the follow up question: "Visible + JSON-LD". Tracked as #T0055.
