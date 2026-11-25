/**
 * Cloudflare Image Resizing URLs, ported from the Next.js custom loader.
 * Images live on the R2-backed CDN and are transformed at the edge, so the
 * build never processes them.
 */
const CDN = 'https://cdn.hlorenzoz.com/';

/** Same breakpoints the Next.js build used (deviceSizes + imageSizes). */
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

/**
 * `srcset` matching next/image: with `sizes` every breakpoint is offered (`w`
 * descriptors); with a fixed `width` only 1x and 2x are.
 */
export function imageSrcSet(src: string, opts: { sizes?: string; width?: number; quality?: number }): string {
    if (opts.width && !opts.sizes) {
        const pick = (w: number) => ALL_SIZES.find((s) => s >= w) ?? ALL_SIZES[ALL_SIZES.length - 1];
        return [1, 2].map((x) => `${imageUrl(src, pick(opts.width! * x), opts.quality)} ${x}x`).join(', ');
    }
    const widths = opts.sizes ? ALL_SIZES : DEVICE_SIZES;
    return widths.map((w) => `${imageUrl(src, w, opts.quality)} ${w}w`).join(', ');
}

/** The `src` fallback next/image emitted: the largest candidate. */
export function imageFallbackSrc(src: string, opts: { sizes?: string; width?: number; quality?: number }): string {
    if (opts.width && !opts.sizes) {
        const w = ALL_SIZES.find((s) => s >= opts.width! * 2) ?? 3840;
        return imageUrl(src, w, opts.quality);
    }
    return imageUrl(src, 3840, opts.quality);
}
