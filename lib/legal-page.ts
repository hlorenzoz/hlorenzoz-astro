/**
 * Shared metadata + JSON-LD builders for the legal pages (privacy, terms,
 * cookies). They only differ by their footer label index, the translation key
 * used as the description, and their slug — everything else (canonical,
 * hreflang, WebPage + breadcrumb schema) is identical, so it lives here once.
 */
import { getTranslations } from '@/lib/i18n';
import { webPage, type JsonLdObject } from '@/lib/schema';
import { pageMetadata, type Metadata } from '@/lib/page-metadata';
import { absoluteUrl, metaDescription, SITE_NAME } from '@/lib/site-config';

export interface LegalPageConfig {
    /** Route slug, e.g. 'privacy-policy'. */
    slug: string;
    /** Index into the `footer.legal.items` translation array for the title. */
    labelIndex: number;
    /** Translation key whose content seeds the meta description. */
    contentKey: string;
}

export async function legalMetadata(locale: string, cfg: LegalPageConfig): Promise<Metadata> {
    const t = getTranslations(locale);
    return pageMetadata({
        locale,
        path: cfg.slug,
        title: `${t(`footer.legal.items.${cfg.labelIndex}.label`)} | ${SITE_NAME}`,
        description: metaDescription(t(cfg.contentKey)),
    });
}

/**
 * The legal page's breadcrumb trail. The page builds it once and hands the same
 * array to `legalPageSchema` and to the visible `Breadcrumbs`, so the marked-up
 * trail is the one readers see.
 */
export async function legalCrumbs(locale: string, cfg: LegalPageConfig): Promise<{ name: string; url: string }[]> {
    const t = getTranslations(locale);
    return [
        { name: t('navigation.home'), url: absoluteUrl(locale) },
        { name: t(`footer.legal.items.${cfg.labelIndex}.label`), url: absoluteUrl(locale, cfg.slug) },
    ];
}

export async function legalPageSchema(
    locale: string,
    cfg: LegalPageConfig,
    crumbs: { name: string; url: string }[]
): Promise<JsonLdObject> {
    const t = getTranslations(locale);
    return webPage({
        locale,
        name: t(`footer.legal.items.${cfg.labelIndex}.label`),
        description: metaDescription(t(cfg.contentKey)),
        url: absoluteUrl(locale, cfg.slug),
        crumbs,
    });
}
