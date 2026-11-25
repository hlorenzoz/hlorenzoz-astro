import { describe, it, expect } from 'vitest';
import { renderAstro } from '@/tests/helpers/render';
import PaymentLinkButton from '@/src/components/services/PaymentLinkButton.astro';

describe('PaymentLinkButton', () => {
    it('renders an external link to the Stripe Payment Link, opened in a new tab', async () => {
        const screen = await renderAstro(PaymentLinkButton, { href: 'https://buy.stripe.com/test_abc123', label: 'Pay Securely Online' });
        const link = screen.getByRole('link', { name: 'Pay Securely Online' });
        expect(link).toHaveAttribute('href', 'https://buy.stripe.com/test_abc123');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
});
