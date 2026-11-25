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
});
