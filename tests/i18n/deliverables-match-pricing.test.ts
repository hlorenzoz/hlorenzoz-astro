import { describe, it, expect } from 'vitest';
import en from '@/messages/en.json';
import es from '@/messages/es.json';

/**
 * The service pages and the homepage pricing section both answer "what do I
 * get for my money", from two separate places in `messages/*.json`.
 *
 * That is a genuine duplication, and it had already drifted: the voice tier
 * listed 8 features while its service page promised 12. The two lists are not
 * merged, because they do different jobs (the card is a scannable checklist,
 * the deliverables are grouped and benefit-framed) and mechanically deriving
 * one from the other would flatten that. Instead this test holds the
 * relationship they must keep: the service page may say MORE, but it may
 * never silently DROP something the pricing section already promised.
 *
 * Matching is on a normalized keyword core rather than exact strings, since
 * "NFC Technology" legitimately becomes "NFC tap-to-share, no app required".
 */
const ADD_ONS = ['websiteDevelopment', 'aiVoiceReceptionist', 'softwareDevelopment'] as const;

/** Words that carry no distinguishing meaning when matching a feature line. */
const STOPWORDS = new Set([
    'the', 'and', 'for', 'with', 'your', 'you', 'a', 'an', 'of', 'to', 'in', 'on',
    'best', 'optional', 'standard', 'up', 'as', 'or', 'is', 'it', 'per',
    'de', 'la', 'el', 'los', 'las', 'y', 'con', 'tu', 'tus', 'para', 'en', 'un', 'una',
    'opcional', 'por', 'del', 'al', 'que', 'se',
]);

function significantTerms(feature: string): string[] {
    return feature
        .toLowerCase()
        .replace(/\([^)]*\)/g, ' ')
        .split(/[^a-z0-9áéíóúñü]+/i)
        .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

function deliverableCorpus(messages: typeof en, serviceKey: string): string {
    const services = messages.services as unknown as Record<
        string,
        { deliverables: { groups: { label: string; items: string[] }[] } }
    >;
    return services[serviceKey].deliverables.groups
        .flatMap((group) => [group.label, ...group.items])
        .join(' ')
        .toLowerCase();
}

describe.each(['en', 'es'] as const)('deliverables cover the priced features (%s)', (locale) => {
    const messages = locale === 'en' ? en : es;

    const expectCovered = (card: string, serviceKey: string, features: string[]) => {
        const corpus = deliverableCorpus(messages, serviceKey);
        for (const feature of features) {
            const terms = significantTerms(feature);
            if (terms.length === 0) continue;

            expect(
                terms.some((term) => corpus.includes(term)),
                `pricing card "${card}" promises "${feature}", but no deliverable on the ` +
                `${serviceKey} page mentions any of: ${terms.join(', ')}. ` +
                'A visitor who reads the pricing section and then the service page would find ' +
                'the offer quietly smaller.'
            ).toBe(true);
        }
    };

    for (const serviceKey of ADD_ONS) {
        it(`${serviceKey} keeps every feature its pricing card promises`, () => {
            const card = messages.home.pricing.addOns[serviceKey];
            expectCovered(card.title, serviceKey, card.features);
        });
    }

    /**
     * The core plan lists its four pillars on the home page, and the Local SEO
     * page lists what each one delivers. Same rule, same direction.
     */
    it('localSeo keeps every item the core plan card promises, pillar by pillar', () => {
        const core = messages.home.pricing.core;
        expect(core.groups).toHaveLength(4);
        expectCovered(core.title, 'localSeo', core.groups.flatMap((group) => group.items));
    });

    it('names the same four pillars on the home page and on the Local SEO page', () => {
        const onPage = messages.services.localSeo.deliverables.groups.map((group) => group.label);
        expect(messages.home.pricing.core.groups.map((group) => group.label)).toEqual(onPage);
        expect(messages.home.solutions.items.map((item) => item.title)).toEqual(onPage);
    });
});

/**
 * A deliverable is a promise. Where the FAQ qualifies a capability, the
 * deliverable that echoes it has to carry the qualifier too.
 *
 * CRM integration is the live case: the FAQ says it works "e.g. HubSpot,
 * Salesforce, GoHighLevel" but that "technical specifications and API access
 * must be provided". Shipping the bare phrase "CRM integration (HubSpot,
 * Salesforce, GoHighLevel)" in the deliverables list drops the condition and
 * promises unconditionally what the FAQ qualifies.
 */
describe.each(['en', 'es'] as const)('conditional capabilities keep their condition (%s)', (locale) => {
    const messages = locale === 'en' ? en : es;

    it('does not promise CRM integration without naming its precondition', () => {
        const crmDeliverable = messages.services.aiVoiceReceptionist.deliverables.groups
            .flatMap((group) => group.items)
            .find((item) => /crm/i.test(item));

        expect(crmDeliverable, 'expected a CRM deliverable to exist').toBeDefined();

        // Some marker that access has to be supplied: "API access", "acceso API",
        // "subject to", "si", "provided", etc. The point is that the line is not
        // a bare unconditional promise.
        expect(
            crmDeliverable,
            `"${crmDeliverable}" promises CRM integration flatly; the FAQ conditions it on ` +
            'technical specifications and API access being provided.'
        ).toMatch(/api|acceso|access|provided|proporcion/i);
    });
});
