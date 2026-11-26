import { describe, it, expect } from 'vitest';
import { renderAstro } from '@/tests/helpers/render';
import ServiceHero from '@/src/components/services/ServiceHero.astro';

describe('ServiceHero', () => {
    it('renders title, subtitle and CTA link', async () => {
        const screen = await renderAstro(ServiceHero, {
            title: 'Website Development',
            subtitle: 'Fast, modern sites built to convert.',
            ctaLabel: 'Book a call',
            ctaHref: '/en/services/website-development/#booking',
        });
        expect(screen.getByRole('heading', { level: 1, name: 'Website Development' })).toBeInTheDocument();
        expect(screen.getByText('Fast, modern sites built to convert.')).toBeInTheDocument();
        // The static build kept the trailing slash before the hash.
        expect(screen.getByRole('link', { name: 'Book a call' })).toHaveAttribute('href', '/en/services/website-development/#booking');
    });

    it('renders the eyebrow when provided', async () => {
        const screen = await renderAstro(ServiceHero, {
            eyebrow: 'Local SEO',
            title: 'Rank higher, locally',
            subtitle: 'Get found by nearby customers.',
            ctaLabel: 'Get started',
            ctaHref: '/en/services/local-seo/#booking',
        });
        expect(screen.getByText('Local SEO')).toBeInTheDocument();
    });

    it('omits the eyebrow element when not provided', async () => {
        const screen = await renderAstro(ServiceHero, {
            title: 'No eyebrow here',
            subtitle: 'Subtitle text',
            ctaLabel: 'Go',
            ctaHref: '/en/services/local-seo/#booking',
        });
        expect(screen.body.querySelector('span')).toBeNull();
    });

    it('renders the secondary link, the microcopy and the note when provided', async () => {
        const screen = await renderAstro(ServiceHero, {
            title: 'T',
            subtitle: 'S',
            ctaLabel: 'Book your free needs analysis',
            ctaHref: '#booking',
            secondaryLabel: 'See the proof first',
            secondaryHref: '#proof',
            microcopy: '15 minutes by video call. No obligation.',
            note: 'Every site is quoted to fit your business.',
        });
        expect(screen.getByRole('link', { name: 'See the proof first' })).toHaveAttribute('href', '#proof');
        expect(screen.getByText('15 minutes by video call. No obligation.')).toBeInTheDocument();
        expect(screen.getByText('Every site is quoted to fit your business.')).toBeInTheDocument();
    });

    it('renders the proof slot under the calls to action and the aside slot beside them', async () => {
        const { body } = await renderAstro(
            ServiceHero,
            { title: 'T', subtitle: 'S', ctaLabel: 'C', ctaHref: '#booking' },
            { default: '<div data-proof>proof</div>', aside: '<div data-aside>aside</div>' }
        );
        expect(body.querySelector('[data-proof]')).not.toBeNull();
        expect(body.querySelector('[data-aside]')).not.toBeNull();
    });
});
