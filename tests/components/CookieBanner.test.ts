import { describe, it, expect } from 'vitest';
import { renderAstro } from '@/tests/helpers/render';
import CookieBanner from '@/src/components/CookieBanner.astro';

/**
 * The 8 s delay, bot skip, `zaraz-consent` storage and Zaraz call are client
 * script behaviour, covered by Playwright. These pin the static markup.
 */
describe('CookieBanner', () => {
    it('renders hidden, with the translated copy and both choices', async () => {
        const { body } = await renderAstro(CookieBanner, { locale: 'en' });
        const banner = body.querySelector('[aria-label="Cookie consent banner"]')!;
        expect(banner).toHaveAttribute('role', 'region');
        expect(banner).toHaveAttribute('hidden');
        expect(body.querySelector('[data-testid="cookie-accept"]')).not.toBeNull();
        expect(body.querySelector('[data-testid="cookie-reject"]')).not.toBeNull();
    });

    it('links the preferences to the localized cookie policy', async () => {
        for (const locale of ['en', 'es']) {
            const { body } = await renderAstro(CookieBanner, { locale });
            expect(body.querySelector('a')).toHaveAttribute('href', `/${locale}/cookie-policy/`);
        }
    });
});
