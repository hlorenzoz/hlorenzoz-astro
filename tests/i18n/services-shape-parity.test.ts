/**
 * Shape parity across the `services.<slug>` subtrees.
 *
 * `messages-parity.test.ts` already catches a key missing between en/es. It
 * says nothing about one service subtree drifting from its five siblings, for
 * example a `benefits` block with only two items where the others have three,
 * or a `faq` key present on five slugs and silently absent from the sixth.
 * This test diffs the six subtrees against each other, not against the other
 * locale, so a batch-authored page that shipped a slightly different shape
 * fails here before it fails a real user in production.
 */
import { describe, it, expect } from 'vitest';
import en from '@/messages/en.json';

type Json = Record<string, unknown>;

/**
 * Flattens a message tree into sorted dot-paths, collapsing every array index
 * to `*`.
 *
 * The index used to be kept, which made this assert that all six services have
 * the SAME NUMBER of benefits, process steps, FAQ entries and deliverables.
 * That is not shape parity, it is a uniformity mandate, and it did real
 * damage: every service was authored as exactly 3 groups x 4 deliverables
 * regardless of its actual scope, so the website package silently lost
 * "Landing Page / Full Website" to keep the count at twelve. Services
 * genuinely differ in size. What must not differ is the SHAPE of an entry:
 * every deliverable group has a `label` and `items`, every FAQ entry has a
 * `question` and an `answer`.
 */
function keyPaths(value: unknown, prefix = ''): string[] {
    if (Array.isArray(value)) {
        return [...new Set(value.flatMap((item) => keyPaths(item, `${prefix}.*`)))];
    }
    if (value !== null && typeof value === 'object') {
        return Object.entries(value as Json).flatMap(([key, child]) =>
            keyPaths(child, prefix ? `${prefix}.${key}` : key)
        );
    }
    return [prefix];
}

/**
 * The five live services, plus the paused Digital Business Card. Its copy is
 * kept in the message files, dormant, so the page can come back unchanged
 * (task #T0021); holding it to the same shape is what keeps that true.
 */
const SERVICE_SLUGS = [
    'localSeo',
    'websiteDevelopment',
    'aiVoiceReceptionist',
    'aiBusinessAutomation',
    'softwareDevelopment',
    'digitalBusinessCard',
] as const;

const services = (en as Json).services as Json | undefined;

describe('services.* sibling shape parity', () => {
    it('has a services namespace', () => {
        expect(services).toBeDefined();
    });

    it('has a services.hub with eyebrow/title/subtitle/cta', () => {
        const hub = services?.hub as Json | undefined;
        expect(hub).toBeDefined();
        for (const key of ['eyebrow', 'title', 'subtitle', 'cta']) {
            expect(hub?.[key], `services.hub.${key} missing`).toBeTypeOf('string');
        }
    });

    it('has navigation.services as a string label', () => {
        const navigation = (en as Json).navigation as Json | undefined;
        expect(navigation?.services).toBeTypeOf('string');
    });

    it('no longer carries copy for review management as its own service', () => {
        // It is a pillar of Local SEO now. A leftover subtree would be copy for a
        // page that does not exist.
        expect(services?.reputationReviewManagement).toBeUndefined();
    });

    it('registers every service slug', () => {
        for (const slug of SERVICE_SLUGS) {
            expect(services?.[slug], `services.${slug} missing`).toBeDefined();
        }
    });

    it('gives every service slug the identical key shape', () => {
        const shapes = SERVICE_SLUGS.map((slug) => ({
            slug,
            // Strip the slug prefix so paths compare structurally, e.g.
            // "websiteDevelopment.benefits.items.0.title" -> "benefits.items.0.title".
            paths: keyPaths(services?.[slug]).sort(),
        }));

        const [reference, ...rest] = shapes;
        for (const shape of rest) {
            expect(shape.paths, `services.${shape.slug} shape differs from services.${reference.slug}`)
                .toEqual(reference.paths);
        }
    });
});
