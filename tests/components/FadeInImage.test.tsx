import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FadeInImage } from '@/components/FadeInImage';

// Mock Next.js Image component
vi.mock('next/image', () => ({
    default: ({ src, alt, className, priority: _priority, fetchPriority: _fetchPriority, fill: _fill, ...props }: Record<string, unknown>) => (
        <img
            src={src as string}
            alt={alt as string}
            className={className as string}
            {...props}
        />
    ),
}));


describe('FadeInImage', () => {
    it('renders the image with a skeleton initially', () => {
        const { container } = render(
            <FadeInImage
                src="/test.jpg"
                alt="Test image"
                width={100}
                height={100}
            />
        );

        // Initially, the loading placeholder should be visible
        const skeleton = container.querySelector('.border-blue-500\\/10');
        expect(skeleton).not.toBeNull();
    });

    it('hides the skeleton and fades in when loaded', () => {
        const { container } = render(
            <FadeInImage
                src="/test.jpg"
                alt="Test image"
                width={100}
                height={100}
            />
        );

        const img = screen.getByAltText('Test image');
        fireEvent.load(img);

        // The skeleton should be removed from DOM
        const skeleton = container.querySelector('.border-blue-500\\/10');
        expect(skeleton).toBeNull();
    });

    it('applies custom class names to the image', () => {
        render(
            <FadeInImage
                src="/test.jpg"
                alt="Test image"
                width={100}
                height={100}
                className="custom-class"
            />
        );

        const img = screen.getByAltText('Test image');
        expect(img).toHaveClass('custom-class');
    });
});
