/**
 * The ElevenLabs agent prompt is versioned in docs/ and pasted into the agent. It quotes the
 * dental example and names the widget's client tools: if either drifts from the code, the
 * assistant states figures the website does not show or calls a tool the page lacks.
 */
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { DENTAL_MEDIANS, OCU_SOURCE } from '@/lib/cost-example';

const prompt = readFileSync('docs/assistant-agent-prompt.md', 'utf8');
const widget = readFileSync('src/islands/ElevenLabsWidget.tsx', 'utf8');

describe('assistant agent prompt', () => {
    it('quotes the dental example with the same OCU medians as the website', () => {
        const line = prompt.split('\n').find((l) => l.includes('OCU dental survey'));
        expect(line, 'the dental example line').toBeDefined();
        const amounts = [...line!.matchAll(/(\d+) EUR/g)].map((m) => Number(m[1]));
        expect(amounts).toEqual(DENTAL_MEDIANS.map((d) => d.amount));
        expect(OCU_SOURCE.published).toBe('2024-11-27');
        expect(line).toContain('27 November 2024');
    });

    it('describes every client tool the widget offers', () => {
        const block = widget.slice(widget.indexOf('clientTools: {'));
        const tools = [...block.matchAll(/^ {12}(\w+): \(/gm)].map((m) => m[1]);
        expect(tools).toEqual(expect.arrayContaining(['calculate_cost_of_waiting', 'show_cost_of_waiting', 'navigate_to_contact']));
        for (const tool of tools) expect(prompt, tool).toMatch(new RegExp(`^${tool}: `, 'm'));
    });

    it('tells the agent the visitor never sees tool results, so it writes every figure itself', () => {
        expect(prompt).toContain('The visitor never sees what a tool returns');
        expect(prompt).toContain('Never announce a result before you have it');
    });

    it('maps the time zone of every market to its country, so it picks the right reference prices', () => {
        for (const zone of ['Europe/Madrid', 'Europe/Lisbon', 'Europe/Paris', 'Europe/Rome', 'Europe/Berlin', 'Europe/Amsterdam', 'Europe/London', 'America/Toronto', 'America/New_York', 'Australia/Sydney', 'America/Costa_Rica']) {
            expect(prompt, zone).toContain(zone);
        }
    });

    it('never asks the agent to do the arithmetic itself', () => {
        expect(prompt).toContain('Never do this arithmetic yourself');
        expect(prompt).not.toMatch(/do the arithmetic exactly/);
    });
});
