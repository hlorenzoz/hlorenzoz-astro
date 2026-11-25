/**
 * Cloudflare Image Resizing URLs for `<img src/srcset>`.
 * Images live on the R2-backed CDN and are transformed at the edge, so the
 * build never processes them.
 */
const CDN = 'https://cdn.hlorenzoz.com/';

/** Candidate widths: device breakpoints + smaller fixed-size image widths. */
export const DEVICE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];
export const IMAGE_SIZES = [16, 32, 48, 64, 96, 128, 256, 384, 450, 512, 600, 700, 720];
const ALL_SIZES = [...IMAGE_SIZES, ...DEVICE_SIZES].sort((a, b) => a - b);

export function imageUrl(src: string, width: number, quality = 50): string {
    // quality 50 + format=auto (AVIF/WEBP negotiated per Accept header). No
    // `fit`: only width is passed, so cropping stays in CSS (object-cover).
    const params = `width=${width},quality=${quality},format=auto`;
    if (src.startsWith(CDN)) return `${CDN}cdn-cgi/image/${params}/${src.slice(CDN.length)}`;
    if (src.startsWith('/')) return `/cdn-cgi/image/${params}${src}`;
    return src;
}

type SrcSetOptions = { sizes?: string; width?: number; quality?: number };

/**
 * Candidate widths: with `sizes`, every
 * breakpoint at or above the smallest viewport ratio it mentions (`vw`); with a
 * fixed `width`, the deduped 1x and 2x candidates; otherwise the device sizes.
 */
function getWidths({ sizes, width }: SrcSetOptions): { widths: number[]; kind: 'w' | 'x' } {
    if (sizes) {
        const percents = [...sizes.matchAll(/(^|\s)(1?\d?\d)vw/g)].map((m) => parseInt(m[2], 10));
        if (percents.length) {
            const smallestRatio = Math.min(...percents) * 0.01;
            return { widths: ALL_SIZES.filter((w) => w >= DEVICE_SIZES[0] * smallestRatio), kind: 'w' };
        }
        return { widths: ALL_SIZES, kind: 'w' };
    }
    if (typeof width !== 'number') return { widths: DEVICE_SIZES, kind: 'w' };
    const pick = (w: number) => ALL_SIZES.find((s) => s >= w) ?? ALL_SIZES[ALL_SIZES.length - 1];
    return { widths: [...new Set([width, width * 2].map(pick))], kind: 'x' };
}

/** Responsive `srcset` (`w` descriptors with `sizes`, `x` with a fixed width). */
export function imageSrcSet(src: string, opts: SrcSetOptions): string {
    const { widths, kind } = getWidths(opts);
    return widths
        .map((w, i) => `${imageUrl(src, w, opts.quality)} ${kind === 'w' ? w : i + 1}${kind}`)
        .join(', ');
}

/** The `src` fallback: the last (largest) candidate. */
export function imageFallbackSrc(src: string, opts: SrcSetOptions): string {
    const { widths } = getWidths(opts);
    return imageUrl(src, widths[widths.length - 1], opts.quality);
}
