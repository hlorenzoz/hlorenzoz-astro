/**
 * Tokens for copy that has to state a price or a term.
 *
 * `messages/*.json` never carries a figure (see AGENTS.md, "Where the prices
 * live in code"). Most price-bearing strings are single messages interpolated
 * by next-intl, but FAQ items are read with `t.raw` as plain data and handed to
 * both the accordion and the JSON-LD, so they need the same substitution done
 * by hand. This is that substitution, with the values coming from
 * `lib/pricing.ts`.
 */
import { BUNDLE_DISCOUNT, PRICING, UPFRONT_SHARE, formatAmount } from '@/lib/pricing';

export type CopyTokens = Record<string, string | number>;

/**
 * Replaces `{name}` tokens. An unknown token throws: a silent blank in a
 * sentence about money is worse than a failed build, and this runs during the
 * static export.
 */
export function fillTokens(text: string, values: CopyTokens): string {
    return text.replace(/\{(\w+)\}/g, (_, key: string) => {
        if (!(key in values)) throw new Error(`Copy uses unknown token {${key}}`);
        return String(values[key]);
    });
}

/**
 * The values every price-bearing line may use, for one locale.
 *
 * `tax` is the "+ VAT" / "+ IVA" marker. It is passed in because it is copy,
 * and this module does not read the message catalogue.
 */
export function copyTokens(locale: string, tax: string): CopyTokens {
    const plan = PRICING.localSeo.base.amount;
    return {
        price: formatAmount(plan, locale),
        annual: formatAmount(plan * 12, locale),
        discount: Math.round(BUNDLE_DISCOUNT * 100),
        upfront: Math.round(UPFRONT_SHARE * 100),
        tax,
    };
}

export interface FaqItem {
    question: string;
    answer: string;
}

/**
 * FAQ items with their tokens resolved.
 *
 * Input is `unknown` on purpose: it comes from `t.raw`, which returns whatever
 * the message file holds. Anything that is not a question and answer pair is
 * dropped rather than passed on to the accordion and the structured data.
 */
export function resolveFaq(items: unknown, values: CopyTokens): FaqItem[] {
    if (!Array.isArray(items)) return [];
    return items.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const { question, answer } = item as Partial<FaqItem>;
        if (typeof question !== 'string' || typeof answer !== 'string') return [];
        return [{ question: fillTokens(question, values), answer: fillTokens(answer, values) }];
    });
}
