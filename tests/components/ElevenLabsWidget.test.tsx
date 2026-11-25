import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Controllable mock of the ElevenLabs conversation hook.
// `options` captures the config the widget passes (onMessage, callbacks, etc.).
const mockConversation = {
    status: 'disconnected' as string,
    isSpeaking: false,
    startSession: vi.fn(),
    endSession: vi.fn(),
    sendUserMessage: vi.fn(),
    sendUserActivity: vi.fn(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: undefined as any,
};

vi.mock('@elevenlabs/react', () => ({
    useConversation: (opts: unknown) => {
        mockConversation.options = opts;
        return mockConversation;
    },
}));

// The icons forward `className`: the shrink control's contrast is carried
// entirely by its classes, and a mock that swallows them makes the one thing
// worth guarding about that control untestable.
vi.mock('lucide-react', () => ({
    Phone: ({ className }: { className?: string }) =>
        <div data-testid="icon-phone" className={className} />,
    Minimize2: ({ className }: { className?: string }) =>
        <div data-testid="icon-minimize" className={className} />,
}));

vi.mock('@/components/FadeInImage', () => ({
    FadeInImage: () => <div data-testid="avatar" />,
}));

import { ElevenLabsWidget } from '@/components/ElevenLabsWidget';

describe('ElevenLabsWidget - text vs voice decoupling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockConversation.status = 'disconnected';
        mockConversation.isSpeaking = false;
        mockConversation.startSession.mockResolvedValue(undefined);

        // jsdom has no mediaDevices; stub it so we can assert (non-)usage.
        Object.defineProperty(navigator, 'mediaDevices', {
            value: { getUserMedia: vi.fn().mockResolvedValue({}) },
            configurable: true,
        });
    });

    it('sends a text message WITHOUT requesting the microphone (text-only session)', async () => {
        const user = userEvent.setup();
        render(<ElevenLabsWidget />);

        const input = await screen.findByPlaceholderText('Or send a message');
        await user.type(input, 'Hola');
        await user.click(screen.getByRole('button', { name: /send message/i }));

        await waitFor(() =>
            expect(mockConversation.startSession).toHaveBeenCalledWith(
                expect.objectContaining({ textOnly: true, connectionType: 'websocket' })
            )
        );
        expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
        await waitFor(() =>
            expect(mockConversation.sendUserMessage).toHaveBeenCalledWith('Hola')
        );
    });

    it('starts a VOICE session with microphone access when "Start a call" is clicked', async () => {
        const user = userEvent.setup();
        render(<ElevenLabsWidget />);

        await user.click(await screen.findByRole('button', { name: /start a call/i }));

        await waitFor(() =>
            expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
        );
        expect(mockConversation.startSession).toHaveBeenCalledWith(
            expect.objectContaining({ connectionType: 'webrtc' })
        );
        expect(mockConversation.startSession).not.toHaveBeenCalledWith(
            expect.objectContaining({ textOnly: true })
        );
    });

    it('sends text directly over an open connection without restarting the session', async () => {
        mockConversation.status = 'connected';
        const user = userEvent.setup();
        render(<ElevenLabsWidget />);

        const input = await screen.findByPlaceholderText('Or send a message');
        await user.type(input, 'Hola');
        await user.click(screen.getByRole('button', { name: /send message/i }));

        await waitFor(() =>
            expect(mockConversation.sendUserMessage).toHaveBeenCalledWith('Hola')
        );
        expect(mockConversation.startSession).not.toHaveBeenCalled();
        expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
    });

    it('renders incoming messages (user and agent) in a transcript', async () => {
        mockConversation.status = 'connected';
        render(<ElevenLabsWidget />);
        await screen.findByPlaceholderText('Or send a message');

        act(() => {
            mockConversation.options.onMessage({ message: 'Qué servicios brindan?', source: 'user', role: 'user' });
            mockConversation.options.onMessage({ message: 'Ofrecemos automatización con IA.', source: 'ai', role: 'agent' });
        });

        expect(await screen.findByText('Qué servicios brindan?')).toBeInTheDocument();
        expect(await screen.findByText('Ofrecemos automatización con IA.')).toBeInTheDocument();
    });

    it('scrolls the latest message into view when a response arrives', async () => {
        mockConversation.status = 'connected';
        const scrollSpy = HTMLElement.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
        render(<ElevenLabsWidget />);
        await screen.findByPlaceholderText('Or send a message');
        scrollSpy.mockClear();

        act(() => {
            mockConversation.options.onMessage({ message: 'Respuesta del agente.', source: 'ai', role: 'agent' });
        });

        await waitFor(() => expect(scrollSpy).toHaveBeenCalled());
    });
});

/**
 * The shrink control sits on the card's translucent background with no border
 * of its own, so its legibility comes only from the icon colour and a backing
 * circle. It shipped with a hard-coded `text-gray-900` and a background that
 * existed only on `:hover`, which measured 2.67:1 against the composited card —
 * under the 3:1 WCAG 1.4.11 floor for graphical objects, and effectively
 * invisible until the pointer was already on it.
 *
 * Class assertions rather than computed colour: jsdom applies no stylesheet, so
 * the classes are the only artefact of the fix that exists at test time.
 */
describe('ElevenLabsWidget - shrink control legibility', () => {
    beforeEach(() => {
        mockConversation.status = 'disconnected';
    });

    const shrinkButton = () => screen.getByRole('button', { name: /shrink widget/i });

    it('gives the shrink icon an explicit dark foreground', () => {
        render(<ElevenLabsWidget />);

        expect(screen.getByTestId('icon-minimize').className).toMatch(/\btext-gray-900\b/);
    });

    it('gives the shrink control a resting background, not only a hover one', () => {
        render(<ElevenLabsWidget />);

        const classes = shrinkButton().className.split(/\s+/);
        const resting = classes.filter((c) => /^bg-/.test(c));
        const hoverOnly = classes.filter((c) => /^hover:bg-/.test(c));

        // The regression is precisely "background exists, but only on hover".
        expect(resting.length).toBeGreaterThan(0);
        expect(hoverOnly.length).toBeGreaterThan(0);
    });

    it('does not depend on a dark variant for its contrast', () => {
        // `dark:` is class-gated (see tests/styles/dark-variant.test.ts) and
        // nothing adds `.dark`, so a control whose only readable colour lived
        // behind `dark:` would render unstyled.
        render(<ElevenLabsWidget />);

        const iconClasses = screen.getByTestId('icon-minimize').className.split(/\s+/);
        const unconditional = iconClasses.filter((c) => /^text-/.test(c));

        expect(unconditional.length).toBeGreaterThan(0);
    });

    it('still shrinks the widget when activated', async () => {
        const user = userEvent.setup();
        render(<ElevenLabsWidget />);

        await user.click(shrinkButton());

        expect(screen.getByRole('button', { name: /expand assistant/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /shrink widget/i })).toBeNull();
    });
});
