import { describe, it, expect } from 'vitest';
import { renderAstro } from '@/tests/helpers/render';
import { imageFallbackSrc, imageSrcSet } from '@/lib/image';
import FadeInImage from '@/src/components/FadeInImage.astro';

const CDN_SRC = 'https://cdn.hlorenzoz.com/hlorenzoz.com/ai-benefits.webp';

/**
 * The fade-in itself (skeleton removed on load, blur cleared, 500 ms fallback)
 * runs in the component's client script and is covered by Playwright. These
 * pin the server-rendered initial state and the next/image attributes.
 */
describe('FadeInImage', () => {
    it('renders the image with a skeleton initially', async () => {
        const { body } = await renderAstro(FadeInImage, { src: '/test.jpg', alt: 'Test image', width: 100, height: 100 });
        expect(body.querySelector('.border-blue-500\\/10')).not.toBeNull();
        expect(body.querySelector('.blur-\\[10px\\]')).not.toBeNull();
        expect(body.querySelector('[data-fade-in]')).toHaveClass('bg-zinc-100');
    });

    it('applies custom class names to the image', async () => {
        const screen = await renderAstro(FadeInImage, { src: '/test.jpg', alt: 'Test image', width: 100, height: 100, className: 'custom-class' });
        expect(screen.getByAltText('Test image')).toHaveClass('object-cover', 'w-full', 'h-full', 'custom-class');
    });

    it('emits the lazy next/image attributes for a fixed-size image', async () => {
        const opts = { sizes: '(max-width: 768px) 100vw, 576px' };
        const screen = await renderAstro(FadeInImage, { src: CDN_SRC, alt: 'Dashboard', width: 1000, height: 1000, ...opts });
        const img = screen.getByAltText('Dashboard');
        expect(img).toHaveAttribute('loading', 'lazy');
        expect(img).toHaveAttribute('decoding', 'async');
        expect(img).toHaveAttribute('width', '1000');
        expect(img).toHaveAttribute('height', '1000');
        expect(img).toHaveAttribute('data-nimg', '1');
        expect(img).toHaveAttribute('style', 'color:transparent');
        expect(img).toHaveAttribute('sizes', opts.sizes);
        expect(img).toHaveAttribute('srcset', imageSrcSet(CDN_SRC, { ...opts, width: 1000 }));
        expect(img).toHaveAttribute('src', imageFallbackSrc(CDN_SRC, { ...opts, width: 1000 }));
        expect(img).not.toHaveAttribute('fetchpriority');
    });

    it('renders a priority fill image raw: high fetch priority, no lazy loading, no skeleton', async () => {
        const screen = await renderAstro(FadeInImage, { src: CDN_SRC, alt: 'Hero', fill: true, priority: true, sizes: '100vw' });
        const img = screen.getByAltText('Hero');
        expect(img).toHaveAttribute('fetchpriority', 'high');
        expect(img).not.toHaveAttribute('loading');
        expect(img).toHaveAttribute('data-nimg', 'fill');
        expect(img.getAttribute('style')).toContain('position:absolute;height:100%;width:100%');
        expect(img.parentElement).toHaveClass('absolute', 'inset-0', 'overflow-hidden');
        expect(screen.body.querySelector('[data-fade-in]')).toBeNull();
        expect(screen.body.querySelector('.border-blue-500\\/10')).toBeNull();
    });

    it('defaults sizes to 100vw for a fill image without sizes, like next/image', async () => {
        const screen = await renderAstro(FadeInImage, { src: CDN_SRC, alt: 'Fill', fill: true });
        const img = screen.getByAltText('Fill');
        expect(img).toHaveAttribute('sizes', '100vw');
        expect(img).toHaveAttribute('srcset', imageSrcSet(CDN_SRC, {}));
    });
});
