import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import enMessages from '@/messages/en.json';

/**
 * Social proof on the service pages, and the honesty rule around it.
 *
 * `home.testimonials` holds three real, unmodified quotes (David Chen, Sarah
 * Jenkins, Marcus Thorne). All three are about the AI voice receptionist:
 * call handling, response time, support volume. Sarah Jenkins names it
 * outright. So `ai-voice-receptionist` is the ONLY service that can carry
 * them without putting words in a client's mouth about a service they never
 * mentioned.
 *
 * The other pages therefore render no social-proof section at all. They
 * used to render `<SocialProofStrip items={[]} />`, which is dead markup: the
 * component returns null on an empty list, so it produced nothing while
 * looking like the conversion element was handled. Removing it is the code
 * fix; the content fix is a real quote per service, which the business has to
 * supply. These tests hold BOTH halves in place: no dead call, and no quote
 * borrowed across services.
 */
const SERVICE_PAGES_DIR = path.resolve(__dirname, '../../src/pages/[locale]/services');

const SLUGS_WITHOUT_TESTIMONIALS = [
    'local-seo',
    'website-development',
    'software-development',
    // Paused, in a private folder. It is not routed, but the file is kept and
    // brought back unchanged, so the rule has to hold there too.
    '_digital-business-card',
] as const;

function readPage(slug: string): string {
    return readFileSync(path.join(SERVICE_PAGES_DIR, slug, 'index.astro'), 'utf-8');
}

describe('service pages: social proof', () => {
    it('ai-voice-receptionist reuses the real home.testimonials quotes', () => {
        const source = readPage('ai-voice-receptionist');
        expect(source).toMatch(/testimonials\.items/);
        expect(source).not.toMatch(/<SocialProofStrip[^>]*items=\{\[\]\}/);
    });

    it.each(SLUGS_WITHOUT_TESTIMONIALS)(
        '%s renders no social-proof section rather than an empty one',
        (slug) => {
            const source = readPage(slug);
            // The dead call is the regression being guarded against: it renders
            // nothing, so it silently reads as "handled" in review.
            expect(source).not.toMatch(/<SocialProofStrip/);
        }
    );

    it.each(SLUGS_WITHOUT_TESTIMONIALS)(
        '%s does not borrow a voice-receptionist testimonial',
        (slug) => {
            const source = readPage(slug);
            for (const testimonial of enMessages.home.testimonials.items) {
                expect(source).not.toContain(testimonial.author);
                expect(source).not.toContain(testimonial.quote);
            }
        }
    );

    it('places social proof directly under the hero, before benefits and price', () => {
        // The conversion framework's scroll order is promise -> trust ->
        // offer: the trust signal has to arrive before the objections it
        // exists to pre-empt, not after the whole offer and process.
        // The shared layout owns the order; the page fills its `after-hero` slot.
        expect(readPage('ai-voice-receptionist')).toMatch(/<SocialProofStrip[^>]*slot="after-hero"/);

        const layout = readFileSync(path.join(SERVICE_PAGES_DIR, '_ServicePage.astro'), 'utf-8');
        const heroAt = layout.indexOf('<ServiceHero');
        const proofAt = layout.indexOf('<slot name="after-hero"');
        const benefitsAt = layout.indexOf('<BenefitsList');
        const deliverablesAt = layout.indexOf('<ServiceDeliverables');

        expect(heroAt).toBeGreaterThanOrEqual(0);
        expect(proofAt).toBeGreaterThan(heroAt);
        expect(proofAt).toBeLessThan(benefitsAt);
        expect(proofAt).toBeLessThan(deliverablesAt);
    });

    it('keeps every testimonial attributed to a named person and role', () => {
        // A quote with no attributable source is not social proof.
        for (const testimonial of enMessages.home.testimonials.items) {
            expect(testimonial.author.trim()).toBeTruthy();
            expect(testimonial.position.trim()).toBeTruthy();
            expect(testimonial.quote.trim()).toBeTruthy();
        }
    });
});
