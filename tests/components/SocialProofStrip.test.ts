import { describe, it, expect } from 'vitest';
import { renderAstro } from '@/tests/helpers/render';
import SocialProofStrip from '@/src/components/services/SocialProofStrip.astro';

const items = [
    { quote: 'They shipped our site in two weeks.', author: 'Maria Gomez', position: 'Owner, Gomez Dental' },
    { quote: 'Never miss a call anymore.', author: 'Luis Fernandez', position: 'Founder, Fernandez Plumbing' },
];

describe('SocialProofStrip', () => {
    it('renders quote, author and position for every item', async () => {
        const screen = await renderAstro(SocialProofStrip, { items });
        for (const item of items) {
            expect(screen.getByText(new RegExp(item.quote))).toBeInTheDocument();
            expect(screen.getByText(item.author)).toBeInTheDocument();
            expect(screen.getByText(item.position)).toBeInTheDocument();
        }
    });

    it('renders nothing when there are no items', async () => {
        const { body } = await renderAstro(SocialProofStrip, { items: [] });
        expect(body).toBeEmptyDOMElement();
    });

    it('never renders an em dash or en dash', async () => {
        const { body } = await renderAstro(SocialProofStrip, { items });
        expect(body.textContent).not.toMatch(/[–—]/);
    });
});
