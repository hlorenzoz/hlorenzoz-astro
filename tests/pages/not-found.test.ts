import NotFound from '@/src/pages/404.astro';
import { renderAstro } from '../helpers/render';

describe('404 page head', () => {
    it('is noindex and borrows no canonical, hreflang or social cards from the home page', async () => {
        const { html } = await renderAstro(NotFound, {}, {}, { url: '/404/' });
        expect(html).toContain('<meta name="robots" content="noindex">');
        expect(html).toContain('<title>Page not found | Lorenzoz Agency</title>');
        expect(html).not.toMatch(/rel="canonical"|hreflang=|property="og:|name="twitter:|name="description"|name="keywords"/);
    });
});
