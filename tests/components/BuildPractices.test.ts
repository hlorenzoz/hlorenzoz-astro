import { describe, it, expect } from 'vitest';
import { renderAstro } from '@/tests/helpers/render';
import BuildPractices from '@/src/components/services/BuildPractices.astro';
import { pagespeedUrl } from '@/src/components/services/proof';
import en from '@/messages/en.json';

const PAGESPEED_URL = pagespeedUrl('en');

const build = en.landing.softwareDevelopment.build;
const props = {
    eyebrow: build.eyebrow,
    title: build.title,
    subtitle: build.subtitle,
    items: build.items,
    figures: [
        { value: '98', label: build.figures.pagespeed },
        build.figures.tests,
        build.figures.checks,
        { value: '9', label: build.figures.languages },
    ],
    footnote: build.footnote,
    link: { label: build.linkLabel, href: PAGESPEED_URL },
};

describe('BuildPractices', () => {
    it('renders the title as an h2 and one numbered h3 card per practice', async () => {
        const screen = await renderAstro(BuildPractices, props);
        expect(screen.getByRole('heading', { level: 2, name: build.title })).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(build.items.map((i) => i.title));
        expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(5);
        expect(screen.getByText('01')).toBeInTheDocument();
        expect(screen.getByText('05')).toBeInTheDocument();
    });

    it('lists the three points of every card, 15 in all', async () => {
        const screen = await renderAstro(BuildPractices, props);
        const points = build.items.flatMap((i) => i.points);
        expect(points).toHaveLength(15);
        for (const point of points) expect(screen.getByText(point)).toBeInTheDocument();
    });

    it('shows the four figures with their labels', async () => {
        const screen = await renderAstro(BuildPractices, props);
        for (const figure of props.figures) {
            expect(screen.getByText(figure.value)).toBeInTheDocument();
            expect(screen.getByText(figure.label)).toBeInTheDocument();
        }
        expect(screen.getByText(build.figures.tests.label).closest('ul')!.children).toHaveLength(4);
    });

    it('ends with the footnote and a link to run PageSpeed', async () => {
        const screen = await renderAstro(BuildPractices, props);
        expect(screen.getByText(build.footnote)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: build.linkLabel })).toHaveAttribute('href', PAGESPEED_URL);
    });
});

describe('pagespeedUrl', () => {
    it("points the report at the reader's own language", () => {
        expect(pagespeedUrl('en')).toBe('https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fhlorenzoz.com%2Fen%2F');
        expect(pagespeedUrl('es')).toBe('https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fhlorenzoz.com%2Fes%2F');
    });
});
