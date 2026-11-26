import { describe, it, expect } from 'vitest';
import { renderAstro } from '@/tests/helpers/render';
import ScoreStrip from '@/src/components/services/ScoreStrip.astro';
import FeatureSection from '@/src/components/services/FeatureSection.astro';
import ProofFigure from '@/src/components/services/ProofFigure.astro';
import TileGrid from '@/src/components/services/TileGrid.astro';
import LiveSitesGrid from '@/src/components/services/LiveSitesGrid.astro';
import LanguageChips from '@/src/components/services/LanguageChips.astro';
import DossierDownload from '@/src/components/services/DossierDownload.astro';
import TryAssistant from '@/src/components/services/TryAssistant.astro';

describe('ScoreStrip', () => {
    it('renders every score with its label, the caption and the verification link', async () => {
        const screen = await renderAstro(ScoreStrip, {
            scores: [
                { label: 'Performance', value: '98' },
                { label: 'SEO', value: '100' },
            ],
            caption: 'This website, on mobile',
            linkLabel: 'Run the test yourself',
            href: 'https://pagespeed.web.dev/analysis?url=x',
        });
        expect(screen.getByText('98')).toBeInTheDocument();
        expect(screen.getByText('Performance')).toBeInTheDocument();
        expect(screen.getByText('100')).toBeInTheDocument();
        expect(screen.getByText('This website, on mobile')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Run the test yourself' })).toHaveAttribute('href', 'https://pagespeed.web.dev/analysis?url=x');
    });
});

describe('FeatureSection', () => {
    const base = { eyebrow: 'Performance', title: 'Speed matters', paragraphs: ['First.', 'Second.'] };

    it('renders the eyebrow, an h2 title, every paragraph and the link', async () => {
        const screen = await renderAstro(FeatureSection, { ...base, link: { label: 'Check it', href: 'https://example.com/' }, note: 'Scores vary.' });
        expect(screen.getByRole('heading', { level: 2, name: 'Speed matters' })).toBeInTheDocument();
        expect(screen.getByText('Performance')).toBeInTheDocument();
        expect(screen.getByText('First.')).toBeInTheDocument();
        expect(screen.getByText('Second.')).toBeInTheDocument();
        expect(screen.getByText('Scores vary.')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Check it' })).toHaveAttribute('href', 'https://example.com/');
    });

    it('renders the media slot and the extra content slot', async () => {
        const { body } = await renderAstro(FeatureSection, base, { default: '<p data-extra>extra</p>', media: '<div data-media>media</div>' });
        expect(body.querySelector('[data-extra]')).not.toBeNull();
        expect(body.querySelector('[data-media]')).not.toBeNull();
    });

    it('takes an id so the hero can link to it', async () => {
        const { body } = await renderAstro(FeatureSection, { ...base, id: 'case' });
        expect(body.querySelector('section#case')).not.toBeNull();
    });
});

describe('ProofFigure', () => {
    it('renders the CDN image with its alt text and the caption', async () => {
        const screen = await renderAstro(ProofFigure, {
            src: 'https://cdn.hlorenzoz.com/hlorenzoz.com/portfolio/me/structured-data.webp',
            alt: 'Rich Results Test',
            caption: 'Three valid items.',
            width: 1280,
            height: 709,
        });
        const img = screen.getByAltText('Rich Results Test');
        expect(img.getAttribute('srcset')).toContain('cdn.hlorenzoz.com');
        expect(screen.getByText('Three valid items.').tagName).toBe('FIGCAPTION');
    });
});

describe('TileGrid', () => {
    it('renders each tile, and a tile with an href as a link', async () => {
        const screen = await renderAstro(TileGrid, {
            items: [
                { title: 'Installable', text: 'No store' },
                { title: 'llms.txt', text: 'See ours', href: '/llms.txt' },
            ],
        });
        expect(screen.getByText('Installable')).toBeInTheDocument();
        expect(screen.getByText('No store')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'See ours' })).toHaveAttribute('href', '/llms.txt');
    });
});

describe('LiveSitesGrid', () => {
    it('renders one card per site linking to its case study, and the portfolio link', async () => {
        const sites = [
            { title: 'Malaga Event Gear', badge: 'AV Rental', image: 'https://cdn.hlorenzoz.com/a.webp', href: '/en/news/a/' },
            { title: 'GERP DJ', badge: 'DJ', image: 'https://cdn.hlorenzoz.com/b.webp', href: '/en/news/b/' },
        ];
        const screen = await renderAstro(LiveSitesGrid, {
            id: 'proof',
            eyebrow: 'Portfolio',
            title: 'Live sites',
            subtitle: 'Online and documented.',
            cardCta: 'Read the case study',
            allLabel: 'See the full portfolio',
            allHref: '/en/portfolio/',
            sites,
        });
        expect(screen.body.querySelector('section#proof')).not.toBeNull();
        expect(screen.getByRole('heading', { level: 2, name: 'Live sites' })).toBeInTheDocument();
        const cards = screen.body.querySelectorAll('li a');
        expect([...cards].map((a) => a.getAttribute('href'))).toEqual(['/en/news/a/', '/en/news/b/']);
        expect(screen.getByAltText('Malaga Event Gear')).toBeInTheDocument();
        expect(screen.getByText('AV Rental')).toBeInTheDocument();
        expect(screen.getAllByText('Read the case study')).toHaveLength(2);
        expect(screen.getByRole('link', { name: 'See the full portfolio' })).toHaveAttribute('href', '/en/portfolio/');
    });
});

describe('LanguageChips', () => {
    it('renders the heading, one chip per language, the stats and the switch link', async () => {
        const screen = await renderAstro(LanguageChips, {
            heading: 'Live in',
            languages: ['English', 'Español'],
            stats: [{ value: '2', label: 'languages' }],
            switchLink: { label: 'Switch this page to Español', href: '/es/services/website-development/' },
        });
        expect(screen.getByText('Live in')).toBeInTheDocument();
        expect(screen.getAllByRole('listitem').map((li) => li.textContent?.trim())).toEqual(['English', 'Español']);
        expect(screen.getByText('languages')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Switch this page to Español' })).toHaveAttribute('hreflang', 'es');
    });

    it('omits the switch link when the page exists in no other language', async () => {
        const screen = await renderAstro(LanguageChips, { heading: 'Live in', languages: ['English'], stats: [] });
        expect(screen.queryByRole('link')).toBeNull();
    });
});

describe('DossierDownload', () => {
    it('renders a download link to the PDF', async () => {
        const screen = await renderAstro(DossierDownload, {
            title: 'Want it all in one document?',
            text: 'One PDF.',
            label: 'Download the dossier (PDF)',
            href: '/dossier/lorenzoz-agency-dossier-en.pdf',
        });
        expect(screen.getByRole('heading', { level: 2, name: 'Want it all in one document?' })).toBeInTheDocument();
        const link = screen.getByRole('link', { name: 'Download the dossier (PDF)' });
        expect(link).toHaveAttribute('href', '/dossier/lorenzoz-agency-dossier-en.pdf');
        expect(link).toHaveAttribute('download');
    });
});

describe('TryAssistant', () => {
    it('renders a button that asks the page to open the assistant', async () => {
        const screen = await renderAstro(TryAssistant, {
            id: 'try',
            title: 'Try it now',
            text: 'Ask it about our services.',
            label: 'Start a conversation',
            note: 'Uses your microphone.',
        });
        const button = screen.getByRole('button', { name: 'Start a conversation' });
        expect(button).toHaveAttribute('type', 'button');
        expect(button).toHaveAttribute('data-assistant-open');
        expect(screen.body.querySelector('#try')).not.toBeNull();
        expect(screen.getByText('Uses your microphone.')).toBeInTheDocument();
    });
});
