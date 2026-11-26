/**
 * Tokens for copy that states a term.
 *
 * `messages/*.json` never carries a figure: a term that needs one is a `{name}`
 * token filled from code. Most strings are interpolated by the translator
 * (`lib/i18n.ts`), but FAQ items are read with `t.raw` as plain data and handed
 * to both the accordion and the JSON-LD, so they need the same substitution
 * done by hand.
 */

export type CopyTokens = Record<string, string | number>;

/**
 * Replaces `{name}` tokens. An unknown token throws: a silent blank in a
 * sentence about terms is worse than a failed build, and this runs during the
 * static export.
 */
export function fillTokens(text: string, values: CopyTokens): string {
    return text.replace(/\{(\w+)\}/g, (_, key: string) => {
        if (!(key in values)) throw new Error(`Copy uses unknown token {${key}}`);
        return String(values[key]);
    });
}

/**
 * The values every term-bearing line may use. Empty since the fee model states
 * no figure: a `{token}` left in the copy now fails the build instead of
 * publishing a stale number.
 */
export function copyTokens(): CopyTokens {
    return {};
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
