/**
 * Loaded only through the dynamic import in `ElevenLabsLoader.astro`, so React
 * and the ElevenLabs SDK stay out of the initial page load.
 */
import { createRoot } from 'react-dom/client';
import { ElevenLabsWidget } from './ElevenLabsWidget';

export function mount(container: HTMLElement, locale: string) {
    createRoot(container).render(<ElevenLabsWidget locale={locale} />);
}
