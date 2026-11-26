import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { within } from '@testing-library/dom';
import { JSDOM } from 'jsdom';
import Navbar from '@/src/components/Navbar.astro';
import { routeLocales } from '@/lib/routes';

/** Renders the Navbar as if served at `pathname` (it reads `Astro.url`). */
async function renderAt(pathname: string, locale = 'en') {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Navbar, {
        props: { locale },
        request: new Request(`https://hlorenzoz.com${pathname}`),
    });
    const { document } = new JSDOM(`<!doctype html><body>${html}</body>`).window;
    return within(document.body);
}

/**
 * Pins the link resolution that must not regress: portfolio and services are
 * real routes (`localeHref`, trailing slash), every other key is a homepage
 * anchor, bare on the home page and locale-prefixed elsewhere.
 */
describe('Navbar (pre-existing behavior, must not regress)', () => {
    it('resolves the portfolio link to the real route via localeHref, not a hash', async () => {
        const screen = await renderAt('/en/portfolio/');
        const links = screen.getAllByText('Portfolio');
        expect(links.length).toBeGreaterThan(0);
        for (const link of links) expect(link.closest('a')).toHaveAttribute('href', '/en/portfolio/');
    });

    it('resolves price/contact to locale-prefixed hashes on a non-home page', async () => {
        const screen = await renderAt('/en/portfolio/');
        for (const link of screen.getAllByText('Price')) expect(link.closest('a')).toHaveAttribute('href', '/en/#process');
        for (const link of screen.getAllByText('Contact')) expect(link.closest('a')).toHaveAttribute('href', '/en/#contact');
    });

    it('links the logo to the locale home with the canonical trailing slash', async () => {
        const screen = await renderAt('/en/portfolio/');
        expect(screen.getByRole('link', { name: 'Lorenzoz Agency Home' })).toHaveAttribute('href', '/en/');
    });
});

describe('Navbar (home page, pre-existing behavior, must not regress)', () => {
    it('resolves price/contact to bare hashes on the home page', async () => {
        const screen = await renderAt('/en/');
        for (const link of screen.getAllByText('Price')) expect(link.closest('a')).toHaveAttribute('href', '#process');
        for (const link of screen.getAllByText('Book Consultation')) expect(link.closest('a')).toHaveAttribute('href', '#contact');
    });
});

describe('Navbar Services link', () => {
    it('renders a Services link on desktop and mobile, resolving via localeHref to the services hub', async () => {
        const screen = await renderAt('/en/portfolio/');
        const serviceLinks = screen.getAllByText('Services');
        expect(serviceLinks).toHaveLength(2);
        for (const link of serviceLinks) expect(link.closest('a')).toHaveAttribute('href', '/en/services/');
    });
});

describe('Navbar language switcher', () => {
    it('links each locale to the same path, in the dropdown and the mobile menu', async () => {
        const screen = await renderAt('/en/services/local-seo/');
        expect(screen.getByTestId('lang-option-es')).toHaveAttribute('href', '/es/services/local-seo/');
        expect(screen.getByTestId('lang-option-en')).toHaveAttribute('href', '/en/services/local-seo/');
        expect(screen.getByTestId('mobile-lang-option-es')).toHaveAttribute('href', '/es/services/local-seo/');
    });

    it('marks the current locale and translates the labels', async () => {
        const screen = await renderAt('/es/', 'es');
        expect(screen.getByTestId('lang-option-es')).toHaveClass('text-blue-700');
        expect(screen.getByTestId('lang-option-en')).toHaveClass('text-gray-900');
        expect(screen.getByTestId('mobile-lang-option-es')).toHaveClass('bg-black');
        expect(screen.getAllByText('Servicios').length).toBe(2);
    });

    it('offers exactly the locales the page is built in, named natively', async () => {
        const screen = await renderAt('/es/portfolio/', 'es');
        const options = screen.getAllByTestId(/^lang-option-/).map((a) => a.getAttribute('data-testid'));
        expect(options).toEqual(routeLocales('portfolio').map((l) => `lang-option-${l}`));
        expect(options[0]).toBe('lang-option-en');
        expect(screen.getByTestId('lang-option-es')).toHaveTextContent('Español');
        expect(screen.getByTestId('mobile-lang-option-en')).toHaveTextContent('English');
    });

    it('names the switcher with the visible locale code in each language', async () => {
        const screen = await renderAt('/es/', 'es');
        expect(screen.getByTestId('language-switcher')).toHaveAttribute('aria-label', 'ES, abrir menú de idioma');
    });

    it('falls back to the locale home on a path without a locale (404)', async () => {
        const screen = await renderAt('/404/');
        expect(screen.getByTestId('lang-option-es')).toHaveAttribute('href', '/es/');
    });
});

describe('Navbar initial (closed) state, toggled by the client script', () => {
    it('renders both menus closed with matching ARIA', async () => {
        const screen = await renderAt('/en/');
        const lang = screen.getByTestId('language-switcher');
        expect(lang).toHaveAttribute('aria-expanded', 'false');
        expect(lang).toHaveAttribute('aria-label', 'EN, open language menu');
        expect(lang.nextElementSibling).toHaveClass('hidden');

        const toggle = screen.getByTestId('mobile-menu-toggle');
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(toggle).toHaveAttribute('aria-label', 'Open navigation menu');
        expect(toggle.ownerDocument.querySelector('[data-mobile-menu]')).toHaveClass('hidden');
        expect(toggle.ownerDocument.querySelector('[data-mobile-menu-panel]')).toHaveClass('translate-x-full');
    });

    it('hands the script translated open and close labels, so no English reaches a Spanish page', async () => {
        const screen = await renderAt('/es/', 'es');
        const lang = screen.getByTestId('language-switcher');
        expect(lang.dataset.labelOpen).toBe('ES, abrir menú de idioma');
        expect(lang.dataset.labelClose).toBe('ES, cerrar menú de idioma');
        const toggle = screen.getByTestId('mobile-menu-toggle');
        expect(toggle).toHaveAttribute('aria-label', 'Abrir menú de navegación');
        expect(toggle.dataset.labelClose).toBe('Cerrar menú de navegación');
        expect(screen.getByRole('link', { name: 'Inicio de Lorenzoz Agency' })).toHaveAttribute('href', '/es/');
        for (const text of ['Navegación', 'Idioma', 'Escríbenos']) expect(screen.getByText(text)).toBeInTheDocument();
    });
});
