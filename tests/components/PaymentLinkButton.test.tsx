import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PaymentLinkButton } from '@/components/services/PaymentLinkButton';

describe('PaymentLinkButton', () => {
    it('renders an external link to the Stripe Payment Link, opened in a new tab', () => {
        render(<PaymentLinkButton href="https://buy.stripe.com/test_abc123" label="Pay Securely Online" />);

        const link = screen.getByRole('link', { name: 'Pay Securely Online' });
        expect(link).toHaveAttribute('href', 'https://buy.stripe.com/test_abc123');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
});
