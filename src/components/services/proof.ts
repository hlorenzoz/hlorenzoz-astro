/**
 * The checkable proof the service landing pages show: links to Google's own
 * tests of this site, and the screenshots of their results. `width`/`height`
 * are each image's intrinsic size, so its space is reserved while it loads.
 */
export const PAGESPEED_URL = 'https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fhlorenzoz.com%2F';
export const RICH_RESULTS_URL = 'https://search.google.com/test/rich-results?url=https%3A%2F%2Fhlorenzoz.com%2F';
export const LLMS_TXT_PATH = '/llms.txt';

/** PageSpeed Insights on mobile, 25 November 2026, in the order of `landing.websiteDevelopment.scores.labels`. */
export const PAGESPEED_SCORES = ['98', '100', '100', '100'];

const CDN = 'https://cdn.hlorenzoz.com/hlorenzoz.com/portfolio';

export const PROOF_IMAGES = {
    pagespeed: { src: `${CDN}/hlorenzoz/lorenzoz-agency-pagespeed-insights.webp`, width: 3338, height: 1862 },
    richResults: { src: `${CDN}/me/structured-data.webp`, width: 1280, height: 709 },
    pwa: { src: `${CDN}/dental-clinic-1/dental_clinic_1_pwa.webp`, width: 1280, height: 706 },
    investepDark: { src: `${CDN}/investep-app/investep-app-0.webp`, width: 3250, height: 1860 },
    investepLight: { src: `${CDN}/investep-app/investep-app-9.webp`, width: 3324, height: 1860 },
} as const;
