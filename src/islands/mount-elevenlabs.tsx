/**
 * Loaded only through the dynamic import in `ElevenLabsLoader.astro`, so React
 * and the ElevenLabs SDK stay out of the initial page load.
 */
import { createRoot } from 'react-dom/client';
import { ElevenLabsWidget, type AssistantLabels } from './ElevenLabsWidget';

export function mount(container: HTMLElement, locale: string, labels: AssistantLabels, whatsapp?: string) {
    createRoot(container).render(<ElevenLabsWidget locale={locale} labels={labels} whatsapp={whatsapp} />);
}
