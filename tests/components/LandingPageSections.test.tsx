import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import messages from '@/messages/en.json';
import HomePage from '@/app/[locale]/page';

// Mock Lucide icons to avoid SVGs in snapshot/DOM checks
vi.mock('lucide-react', async () => {
    const actual = await vi.importActual('lucide-react');
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...actual as any,
        CheckCircle2: () => <div data-testid="icon-check" />,
        Headset: () => <div data-testid="icon-headset" />,
        PhoneMissed: () => <div data-testid="icon-phone" />,
        History: () => <div data-testid="icon-history" />,
        XCircle: () => <div data-testid="icon-x" />,
        CheckCircle: () => <div data-testid="icon-check-circle" />,
        Check: () => <div data-testid="icon-check-only" />,
        ArrowRight: () => <div data-testid="icon-arrow" />,
        ShieldCheck: () => <div data-testid="icon-shield" />,
        Zap: () => <div data-testid="icon-zap" />,
        Repeat: () => <div data-testid="icon-repeat" />,
        TrendingUp: () => <div data-testid="icon-trending" />,
        BarChart3: () => <div data-testid="icon-chart" />,
        Layout: () => <div data-testid="icon-layout" />,
        Rocket: () => <div data-testid="icon-rocket" />,
        Globe: () => <div data-testid="icon-globe" />,
        AudioLines: () => <div data-testid="icon-audio" />,
        Contact: () => <div data-testid="icon-contact" />,
        Skull: () => <div data-testid="icon-skull" />,
        BellOff: () => <div data-testid="icon-bell" />,
        VolumeX: () => <div data-testid="icon-volume" />
    };
});

// Mock dynamic components to ensure they render synchronously in tests
vi.mock('next/dynamic', () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: (fn: any) => {
        const Component = (_props: unknown) => {
            // We need to call the function to get the actual component
            // but for simplicity in tests, we can just return a placeholder
            // that handles the IDs
            if (fn.toString().includes('PortfolioCarousel')) {
                return <section id="portfolio" data-testid="mock-portfolio" />;
            }
            if (fn.toString().includes('LinkedInArticles')) {
                return <section id="articles" data-testid="mock-articles" />;
            }
            if (fn.toString().includes('FaqAccordion')) {
                return <div id="faq-accordion" data-testid="mock-faq" />;
            }
            return <div />;
        };
        return Component;
    }
}));

describe('HomePage Sections', () => {
    const renderPage = async () => {
        const params = Promise.resolve({ locale: 'en' });
        const result = await HomePage({ params });
        return render(
            <NextIntlClientProvider locale="en" messages={messages}>
                {result}
            </NextIntlClientProvider>
        );
    };

    it('renders the Hero section with correct translations', async () => {
        await renderPage();
        expect(screen.getAllByText(/hero\.title/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/hero\.description/i)).toBeInTheDocument();
    });

    it('renders the Solutions section with all cards', async () => {
        await renderPage();
        expect(screen.getByText(/solutions\.title/i)).toBeInTheDocument();
        // Check for specific solutions from mock
        expect(screen.getAllByText(/Mock String/i).length).toBeGreaterThan(0);
    });

    it('renders the Pricing section', async () => {
        await renderPage();
        expect(screen.getByText(/pricing\.title/i)).toBeInTheDocument();
    });

    it('renders the News carousel directly above the LinkedIn articles', async () => {
        const { container } = await renderPage();
        const news = container.querySelector('#news');
        const articles = container.querySelector('#articles');
        expect(news).not.toBeNull();
        expect(articles).not.toBeNull();
        expect(news!.nextElementSibling).toBe(articles);
        expect(news!.querySelectorAll('li a[href^="/en/news/"]').length).toBeGreaterThan(0);
    });

    it('renders FAQ section', async () => {
         await renderPage();
         expect(screen.getByText(/faq\.title/i)).toBeInTheDocument();
    });

    it('links the solutions CTA to the Local SEO page, not #contact', async () => {
        await renderPage();
        const cta = screen.getByText(/solutions\.cta/i).closest('a');
        // The section presents the four pillars of one offer, so its "see more"
        // leads to that offer's page. It used to open the services directory,
        // back when the section listed three separate services.
        //
        // `next/link` normalizes the trailing slash `localeHref` adds off the
        // rendered anchor (see `components/ArticleByline.tsx`'s precedent and
        // `tests/components/ArticleByline.test.tsx`); the source still
        // goes through `localeHref` for the same safety-net reason.
        expect(cta).toHaveAttribute('href', '/en/services/local-seo');
    });

    it('renders the four pillars, each linking to the Local SEO page', async () => {
        const { container } = await renderPage();
        const cards = container.querySelectorAll('[data-testid="solutions-card-link"]');
        // Four pillars of ONE offer. They are not services with pages of their
        // own, so every card leads to the same place.
        expect(cards).toHaveLength(4);
        cards.forEach((card) => {
            expect(card).toHaveAttribute('href', '/en/services/local-seo');
        });
    });

    const OFFER_SLUGS = ['local-seo', 'website-development', 'ai-voice-receptionist', 'software-development'];

    it('prices one core plan and three optional services, each with a learn-more link', async () => {
        const { container } = await renderPage();
        const learnMoreLinks = container.querySelectorAll('#pricing [data-testid="pricing-learn-more"]');
        expect(learnMoreLinks).toHaveLength(4);
        // Core offer first, then the optional services in presentation order.
        OFFER_SLUGS.forEach((slug, i) => {
            expect(learnMoreLinks[i]).toHaveAttribute('href', `/en/services/${slug}`);
        });
        // Every card keeps its #contact conversion CTA.
        expect(container.querySelectorAll('#pricing a[href="#contact"]')).toHaveLength(4);
    });

    /**
     * Asserts the accessible NAME, not the mechanism that produces it.
     *
     * This used to require an `aria-label`, alongside an `sr-only` span
     * carrying the same sentence. `aria-label` overrides descendant text when
     * the accessible name is computed, so the span was dead weight for
     * assistive tech while the two strings were free to drift apart. The span
     * alone now carries the service name: it names the link for a screen
     * reader AND lands in `textContent`, which is what Lighthouse's
     * `link-text` audit reads.
     */
    it('gives each "Learn more" link a descriptive name, not a bare "Learn more"', async () => {
        const { container } = await renderPage();
        const learnMoreLinks = container.querySelectorAll('[data-testid="pricing-learn-more"]');
        expect(learnMoreLinks).toHaveLength(4);

        learnMoreLinks.forEach((link) => {
            const name = (link.textContent ?? '').trim();
            // The mocked translator echoes the key, so the bare label is
            // 'pricing.learnMore'; the offer name has to follow it.
            expect(name).not.toBe('pricing.learnMore');
            expect(name.length).toBeGreaterThan('pricing.learnMore'.length);
            // One source for the name: no aria-label competing with the text.
            expect(link).not.toHaveAttribute('aria-label');
        });
    });

    /**
     * Every published price is before tax, and the dossier marks each one. A
     * figure on the home page without the marker would state a different total
     * for the same offer.
     */
    it('marks every price as before tax', async () => {
        const { container } = await renderPage();
        const marks = (selector: string) => container.querySelectorAll(`${selector} [data-testid="tax-mark"]`);
        // The plan's price in the stats band.
        expect(marks('#stats')).toHaveLength(1);
        // Two former list prices, their total and the plan.
        expect(marks('#numbers')).toHaveLength(4);
        // The core plan and the three optional services.
        expect(marks('#pricing')).toHaveLength(4);
    });

    it('strikes the list price of each optional service and shows the bundled one', async () => {
        const { container } = await renderPage();
        const list = Array.from(container.querySelectorAll('[data-testid="addon-list-price"]')).map((n) => n.textContent);
        const bundle = Array.from(container.querySelectorAll('[data-testid="addon-bundle-price"]')).map((n) => n.textContent);
        // Straight from PRICING: 2500 / 350 / 20000, and 30% off each.
        expect(list).toEqual(['€2,500', '€350', '€20,000']);
        expect(bundle).toEqual(['€1,750', '€245', '€14,000']);
        // Only software is a floor.
        expect(container.querySelectorAll('[data-testid="addon-from"]')).toHaveLength(1);
    });

    it('shows the plan at its published price', async () => {
        const { container } = await renderPage();
        expect(container.querySelector('[data-testid="core-plan-price"]')).toHaveTextContent('€750');
        expect(container.querySelector('[data-testid="stat-plan-price"]')).toHaveTextContent('€750');
    });

    it('never advertises a free trial or a limited-time offer', async () => {
        const { container } = await renderPage();
        expect(container.textContent).not.toMatch(/trial|limited time/i);
    });

    it('renders the CalBooking component in the contact section instead of an inline iframe', async () => {
        const { container } = await renderPage();
        const iframe = container.querySelector('#contact iframe');
        expect(iframe).not.toBeNull();
        expect(iframe).toHaveAttribute('src', 'https://cal.com/hlorenzoz.com/15min?embed=true');
        expect(iframe).toHaveAttribute('loading', 'lazy');
    });

    it('contains all required section IDs for navigation', async () => {
        const { container } = await renderPage();
        const requiredIds = [
            'home', 'stats', 'markets', 'standard', 'problem',
            'solutions', 'numbers', 'portfolio', 'benefits', 'process',
            'pricing', 'contact', 'faq'
        ];

        requiredIds.forEach(id => {
            const element = container.querySelector(`#${id}`);
            if (!element) {
                console.error(`Missing section ID: ${id}`);
            }
            expect(element, `ID #${id} should exist`).not.toBeNull();
        });
    });
});
