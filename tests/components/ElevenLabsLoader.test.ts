import { describe, it, expect } from 'vitest';
import { renderAstro } from '@/tests/helpers/render';
import ElevenLabsLoader from '@/src/components/ElevenLabsLoader.astro';
import { ORGANIZATION } from '@/lib/site-config';
import es from '@/messages/es.json';
import en from '@/messages/en.json';

describe('ElevenLabsLoader WhatsApp button', () => {
    it('ships hidden: the script shows it only when the assistant has no quota', async () => {
        const { body } = await renderAstro(ElevenLabsLoader, { locale: 'en' });
        const link = body.querySelector('a[data-assistant-whatsapp]');
        expect(link).not.toBeNull();
        expect(link).toHaveAttribute('hidden');
    });

    it('opens WhatsApp on the agency number with a greeting in the page language', async () => {
        for (const [locale, messages] of [['es', es], ['en', en]] as const) {
            const { body } = await renderAstro(ElevenLabsLoader, { locale });
            const link = body.querySelector('a[data-assistant-whatsapp]')!;
            expect(link).toHaveAttribute('aria-label', messages.assistant.whatsapp);
            const url = new URL(link.getAttribute('href')!);
            expect(url.origin + url.pathname).toBe(`https://wa.me/${ORGANIZATION.telephone.replace(/\D/g, '')}`);
            expect(url.searchParams.get('text')).toBe(messages.assistant.whatsappMessage);
            expect(link).toHaveAttribute('target', '_blank');
            expect(link.getAttribute('rel')).toContain('noopener');
        }
    });
});
