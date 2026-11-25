/**
 * Localized prose describing an offer's terms, for the `Offer.description` in
 * JSON-LD.
 *
 * This is a deliberate third layer, between `lib/pricing.ts` (the figures) and
 * `lib/schema` (the JSON-LD shapes). It exists because the sentences were
 * originally assembled inside `lib/schema` in hardcoded English, and shipped: a
 * Spanish service page published "Includes 1 Tarjeta Digital, maintenance
 * included, at no charge" on a node that declares `inLanguage: es`. An English
 * sentence with Spanish nouns in it is worse than either language alone,
 * because it reads as machine output to the one audience the description exists
 * to serve.
 *
 * `lib/schema` stays free of i18n and receives finished strings. The figures
 * stay in `lib/pricing.ts`. Only the wording lives here.
 */
import { BUNDLE_DISCOUNT, UPFRONT_SHARE, type ServiceOffer } from '@/lib/pricing';

type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * Sentences stating the conditions attached to an offer's price.
 *
 * Every one of them is a fact a reader would otherwise have to assume: that a
 * floor is a floor, that the discount needs the core offer, that half is paid
 * first, and that the figure is before tax. A bare "750" answers none of those.
 *
 * `translate` is the page's ROOT translator: the core offer's display name is
 * read from `services.localSeo.name` so the sentence names it in the page's own
 * language instead of leaking an English label or a camelCase key.
 */
export function offerNotes(offer: ServiceOffer, translate: Translate): string[] {
    const notes: string[] = [];

    if (offer.base.from) {
        notes.push(translate('offer.from'));
    }

    if (offer.role === 'addOn') {
        notes.push(
            translate('offer.bundleDiscount', {
                discount: Math.round(BUNDLE_DISCOUNT * 100),
                name: translate('services.localSeo.name'),
            })
        );
    }

    notes.push(translate('offer.upfront', { upfront: Math.round(UPFRONT_SHARE * 100) }));
    notes.push(translate('offer.beforeTax'));

    return notes;
}
