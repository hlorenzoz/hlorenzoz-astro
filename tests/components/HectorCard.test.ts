import { describe, it, expect } from 'vitest';
import { renderAstro } from '@/tests/helpers/render';
import HectorCard from '@/src/components/HectorCard.astro';
import en from '@/messages/en.json';

describe('HectorCard', () => {
    it('renders the QR code at build time as plain SVG, with no hydrated island', async () => {
        const { html, body } = await renderAstro(HectorCard, { locale: 'en' });
        const qr = body.querySelector('svg[role="img"][viewBox="0 0 33 33"]');
        expect(qr).not.toBeNull();
        expect(qr).toHaveAttribute('width', '140');
        expect(qr).toHaveAttribute('height', '140');
        expect(html).not.toContain('astro-island');
    });

    it('encodes the short, locale-less card URL for the QR, NFC and vCard', async () => {
        const { body } = await renderAstro(HectorCard, { locale: 'es' });
        expect(body.querySelector('[data-hector-card]')).toHaveAttribute('data-card-url', 'https://hlorenzoz.com/card/hector');
    });

    it('ships the NFC writer hidden, with every status text ready for the script', async () => {
        const screen = await renderAstro(HectorCard, { locale: 'en' });
        const nfc = screen.body.querySelector<HTMLButtonElement>('[data-nfc]')!;
        expect(nfc).toHaveAttribute('hidden');
        expect(nfc.dataset.idleText).toBe(en.card.hector.nfcWrite);
        expect(nfc.dataset.writingText).toBe(en.card.hector.nfcWriting);
        expect(nfc.dataset.successText).toBe(en.card.hector.nfcSuccess);
        expect(nfc.dataset.errorText).toBe(en.card.hector.nfcError);
    });

    it('renders the contact actions with their localized labels and links', async () => {
        const screen = await renderAstro(HectorCard, { locale: 'en' });
        expect(screen.getByRole('heading', { level: 1, name: en.card.hector.name })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: en.card.hector.addContacts })).toBeInTheDocument();
        // The vCard and QR values the live card has always published.
        expect(screen.getByRole('link', { name: en.card.hector.bookCall })).toHaveAttribute('href', '/en/#contact');
        for (const label of ['LinkedIn', 'WhatsApp', 'Email', 'Phone']) {
            expect(screen.getByRole('link', { name: label })).toHaveAttribute('target', '_blank');
        }
    });
});
