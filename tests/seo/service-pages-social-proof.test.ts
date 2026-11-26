import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { LOCALES } from '@/lib/routing';

/**
 * Social proof on the service pages, and the honesty rule around it.
 *
 * The site used to show three quotes (David Chen, Sarah Jenkins, Marcus
 * Thorne) on the AI Voice Receptionist page. They came over from the Next.js
 * scaffold and were not from real clients, so they were removed on
 * 2026-11-26: a made-up testimonial is a false claim about the business
 * (Trust, the centre of E-E-A-T) and a fake review under consumer law.
 *
 * Until the business supplies real, attributable quotes, no service page
 * renders a social-proof section, and the old placeholder copy cannot come
 * back through the messages. `SocialProofStrip` and the layout's `after-hero`
 * slot stay, ready for real quotes.
 */
const SERVICE_PAGES_DIR = path.resolve(__dirname, '../../src/pages/[locale]/services');

const SERVICE_SLUGS = [
    'local-seo',
    'website-development',
    'ai-voice-receptionist',
    'software-development',
    // Paused, in a private folder. It is not routed, but the file is kept and
    // brought back unchanged, so the rule has to hold there too.
    '_digital-business-card',
] as const;

function readPage(slug: string): string {
    return readFileSync(path.join(SERVICE_PAGES_DIR, slug, 'index.astro'), 'utf-8');
}

describe('service pages: social proof', () => {
    it.each(SERVICE_SLUGS)('%s renders no social-proof section without real quotes', (slug) => {
        expect(readPage(slug)).not.toMatch(/<SocialProofStrip|testimonials/);
    });

    it.each(LOCALES)('messages/%s.json holds no placeholder testimonials', (locale) => {
        const messages = JSON.parse(readFileSync(path.resolve(__dirname, `../../messages/${locale}.json`), 'utf-8'));
        expect(messages.home.testimonials).toBeUndefined();
        expect(JSON.stringify(messages)).not.toMatch(/Marcus Thorne|Sarah Jenkins|David Chen/);
    });

    it('keeps the after-hero slot under the hero, before benefits and price', () => {
        // The conversion framework's scroll order is promise -> trust ->
        // offer: when real social proof arrives, it fills this slot.
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
});
