# ElevenLabs assistant: help, booking without pressure, conversions

Objective: the assistant helps visitors first, invites them to the free needs analysis without pressure, knows "The cost of waiting", and its conversions are measured.
Branch: `feat/partner-positioning`. Delivery: one commit per unit; site push and live agent changes only with the user's OK. Tests: Vitest, Playwright, `just validate`; agent tests with `elevenlabs agents run_tests`. Backlog: `#T0059`.

## Specs

- S1. User: "Enfócalo en asistir lo mejor posible a los clientes, incentivarlos al booking (sin compromisos y sin presionarlos). Enfócalo también en conversiones. Que el asistente esté al tanto de la sección \"El coste de esperar\" (¿Cuánto te cuesta no hacer nada?)".
- S2. `public/llms.txt` describes the cost of waiting calculator (day, week x5, month x5x52/12, year x260), the OCU dental example (Spain medians, 27 Nov 2024, an illustration not a forecast) and where it lives (`/<locale>/#cost-of-waiting`).
- S3. New conversations open with a translated welcome (`assistant.greeting`, 9 locales) through the `first_message` override; resumed conversations open with none.
- S4. The widget passes dynamic variables `page_title`, `page_url`, `locale`, `visitor_timezone`, `cost_of_waiting`; calculator changes during a session reach the agent as a contextual update.
- S5. Client tool `show_cost_of_waiting` scrolls to or opens `#cost-of-waiting`; the unused `create_booking` client tool is removed.
- S6. Agent: rules only prompt (`docs/assistant-agent-prompt.md`), `llms.txt` knowledge base with daily auto-sync, booking by email only tools removed (pending the user's decision), timeZone from `{{visitor_timezone}}`, origin allowlist, evaluation criteria and data collection, agent tests.

- S7. User: "Sí, alinea el agente con el repo porfa y arregla todos los detalles porfa. Verifica si hay un modelo mejor que brinde mejores resultados". User: "Y que tenga los respectivos tests el asistente en ElevenLabs, de forma tal que se pueda verificar cada uno de los posibles comportamientos, incluyendo timos y scams". User: "Los tests en ElevenLabs que incluyan cómo hacer el booking en el sitio, cómo hacer/modificar/cancelar la reserva con correos y números correctos/fakes, etc. Tratar de testear cada uno de los posibles escenarios porfa".
- S8. User: "Deja el análisis previo documentado, porfa." (docs/assistant-agent-evaluation.md).
- S9. Widget: the chat answers when the agent rejects an override; "ponlo en bloque (múltiples líneas para que se vea todo lo que se ha escrito)"; "que muestre algún tipo de animación que indique que se está escribiendo, aunque no por mucho tiempo".
- S10. User: "hace falta que sea capaz de poner un ejemplo para una clínica dental en caso de que no sea un negocio en específico. Y en caso de que sea un negocio en específico, que sea capaz de hacer una búsqueda sobre los precios promedios por cliente, y que haga los cálculos pertinentes, que compruebe y verifique que los resultados son correctos, y que de la respuesta." Then: "No decido todavía por el navegador. Creo que sería mejor tener una muestra de referencia (knowledge base local) que se pudiera consultar. Créalo para cada negocios por los países que brindamos servicios y que se pueda consultar y responder al usuario con sifras más específicas sin tener que hacer búsquedas web". Europe is covered by the site's six European language markets (ES, PT, FR, IT, DE, NL) plus GB; assumption, not stated by the user.

## Tasks

| ID | Specs | Route | Status | Commit |
| :--- | :--- | :--- | :--- | :--- |
| T1 | S2, S3 (translations) | delegated writer + translators (parallel unit A) | pending | |
| T2 | S3, S4, S5 | delegated writer (parallel unit B) | pending | |
| T3 | seam | inline | pending | |
| T4 | S6, S7, S8 | inline, ElevenLabs through headless sessions with the MCP | in progress | 55 tests created; model comparison in docs/assistant-agent-evaluation.md; live agent unchanged |
| T5 | S9 | inline | done | 258f4b3 (silent disconnect), c346007 (multiline box), e2a44d0 (typing indicator) |
| T6 | S10 | inline + 6 research agents | in progress | 8030352 (calculate_cost_of_waiting, prompt estimates) |

## Log

- L1 (2026-11-27) User: "Vuelve a hacer un análisis sobre todos los puntos y trata de refutarlos. Luego crea un plan de implementación y déjamelo saber. Enfócalo en asistir lo mejor posible a los clientes, incentivarlos al booking (sin compromisos y sin presionarlos). Enfócalo también en conversiones. Que el asistente esté al tanto de la sección \"El coste de esperar\" (¿Cuánto te cuesta no hacer nada?)". Plan approved.
- L2 Baseline (since 5 Mar 2026): 29 conversations, median 1 visitor message, 5 with none, 3 reached slots, 0 bookings; 0 evaluation criteria; allowlist empty.
- L3 (2026-11-27) User decisions: "Remove them (Recommended)" (booking lookup, reschedule and cancel tools) and "Those three (Recommended)" (allowlist hlorenzoz.com, www.hlorenzoz.com, localhost:4321).
- L4 (2026-11-27) T1 and T2 done (commits eb3cda0, 0edbd11): just validate 2195 passed, Playwright 92 passed. The calculator privacy note now says the assistant only sees the figures in a conversation.
- L5 (2026-11-27) Phase 2 dry run: knowledge base doc ZPvdoeWEk7Fo3s04Hjz3 (llms.txt, daily auto-sync) created, not attached; 6 agent tests created and run with agent_config_override (new prompt, kb, tools without lookup/reschedule/cancel): 6/6 passed. Live agent unchanged.
- L6 (2026-11-27) Live agent read (MCP, read only): gemini-3.1-flash-lite, generic prompt, first_message override not allowed (root cause of the silent chat), knowledge base and allowlist empty, no evaluation criteria. 49 tests created (55 with the earlier 6); 7 that can reach reserve_slot or create_booking made simulations with every tool mocked, because only simulations honour tool mocking. One pass costs 0.46 to 2.11 USD. Six models compared on the first hardened prompt: sonnet-5-5 53/55, haiku-5-5 and gemini-3.5-flash 51/55, gemini-3.8-flash 50/55, gpt-6.1-terra 49/55, live gemini-3.1-flash-lite 47/55 (docs/assistant-agent-evaluation.md). Web search for prices: no native ElevenLabs tool; the user chose a local reference price table instead.
