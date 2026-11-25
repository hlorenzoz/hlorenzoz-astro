import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SocialProofStrip } from '@/components/services/SocialProofStrip';

const items = [
    { quote: 'They shipped our site in two weeks.', author: 'Maria Gomez', position: 'Owner, Gomez Dental' },
    { quote: 'Never miss a call anymore.', author: 'Luis Fernandez', position: 'Founder, Fernandez Plumbing' },
];

describe('SocialProofStrip', () => {
    it('renders quote, author and position for every item', () => {
        render(<SocialProofStrip items={items} />);

        for (const item of items) {
            expect(screen.getByText(new RegExp(item.quote))).toBeInTheDocument();
            expect(screen.getByText(item.author)).toBeInTheDocument();
            expect(screen.getByText(item.position)).toBeInTheDocument();
        }
    });

    it('renders nothing when there are no items', () => {
        const { container } = render(<SocialProofStrip items={[]} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('never renders an em dash or en dash', () => {
        const { container } = render(<SocialProofStrip items={items} />);
        expect(container.textContent).not.toMatch(/[–—]/);
    });
});
