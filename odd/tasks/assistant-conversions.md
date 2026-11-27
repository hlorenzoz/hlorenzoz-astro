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

## Tasks

| ID | Specs | Route | Status | Commit |
| :--- | :--- | :--- | :--- | :--- |
| T1 | S2, S3 (translations) | delegated writer + translators (parallel unit A) | pending | |
| T2 | S3, S4, S5 | delegated writer (parallel unit B) | pending | |
| T3 | seam | inline | pending | |
| T4 | S6 | inline, after the site deploy and the user's decisions | pending | |

## Log

- L1 (2026-11-27) User: "Vuelve a hacer un análisis sobre todos los puntos y trata de refutarlos. Luego crea un plan de implementación y déjamelo saber. Enfócalo en asistir lo mejor posible a los clientes, incentivarlos al booking (sin compromisos y sin presionarlos). Enfócalo también en conversiones. Que el asistente esté al tanto de la sección \"El coste de esperar\" (¿Cuánto te cuesta no hacer nada?)". Plan approved.
- L2 Baseline (since 5 Mar 2026): 29 conversations, median 1 visitor message, 5 with none, 3 reached slots, 0 bookings; 0 evaluation criteria; allowlist empty.
