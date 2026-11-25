import { imageFallbackSrc, imageSrcSet } from '@/lib/image';

const SRC = 'https://cdn.hlorenzoz.com/hlorenzoz.com/portfolio/gerp-dj/cover.webp';
const firstWidth = (srcset: string) => srcset.split(', ')[0].split(' ')[1];

describe('imageSrcSet matches next/image getWidths', () => {
    it('starts at the smallest vw ratio of the device sizes', () => {
        expect(firstWidth(imageSrcSet(SRC, { sizes: '(max-width: 768px) 100vw, 681px' }))).toBe('640w');
        expect(firstWidth(imageSrcSet(SRC, { sizes: '(max-width: 1280px) 50vw, 640px' }))).toBe('384w');
    });

    it('keeps every width when sizes has no vw value', () => {
        expect(firstWidth(imageSrcSet(SRC, { sizes: '44px' }))).toBe('16w');
    });

    it('emits deduped 1x/2x candidates for a fixed width', () => {
        expect(imageSrcSet(SRC, { width: 64 })).toBe(
            'https://cdn.hlorenzoz.com/cdn-cgi/image/width=64,quality=50,format=auto/hlorenzoz.com/portfolio/gerp-dj/cover.webp 1x, ' +
                'https://cdn.hlorenzoz.com/cdn-cgi/image/width=128,quality=50,format=auto/hlorenzoz.com/portfolio/gerp-dj/cover.webp 2x'
        );
        expect(imageSrcSet(SRC, { width: 3840 }).split(', ')).toHaveLength(1);
        expect(imageFallbackSrc(SRC, { width: 64 })).toContain('width=128');
    });

    it('falls back to device sizes with neither sizes nor width', () => {
        expect(firstWidth(imageSrcSet(SRC, {}))).toBe('640w');
        expect(imageFallbackSrc(SRC, {})).toContain('width=3840');
    });
});
