import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ServiceHero } from '@/components/services/ServiceHero';

describe('ServiceHero', () => {
    it('renders title, subtitle and CTA link', () => {
        render(
            <ServiceHero
                title="Website Development"
                subtitle="Fast, modern sites built to convert."
                ctaLabel="Book a call"
                ctaHref="/en/services/website-development/#booking"
            />
        );

        expect(screen.getByRole('heading', { level: 1, name: 'Website Development' })).toBeInTheDocument();
        expect(screen.getByText('Fast, modern sites built to convert.')).toBeInTheDocument();

        const cta = screen.getByRole('link', { name: 'Book a call' });
        // next/link normalizes a trailing slash immediately before a hash.
        expect(cta).toHaveAttribute('href', '/en/services/website-development#booking');
    });

    it('renders the eyebrow when provided', () => {
        render(
            <ServiceHero
                eyebrow="Local SEO"
                title="Rank higher, locally"
                subtitle="Get found by nearby customers."
                ctaLabel="Get started"
                ctaHref="/en/services/local-seo/#booking"
            />
        );

        expect(screen.getByText('Local SEO')).toBeInTheDocument();
    });

    it('omits the eyebrow element when not provided', () => {
        render(
            <ServiceHero
                title="No eyebrow here"
                subtitle="Subtitle text"
                ctaLabel="Go"
                ctaHref="/en/services/local-seo/#booking"
            />
        );

        expect(screen.queryByText('Local SEO')).not.toBeInTheDocument();
    });
});
