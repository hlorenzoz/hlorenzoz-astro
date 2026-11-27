// @vitest-environment jsdom
// The island stays React, so it keeps React Testing Library and a DOM env.
// `@testing-library/user-event` is not a dependency here: `fireEvent` drives it.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';

// Controllable mock of the ElevenLabs conversation hook.
// `options` captures the config the widget passes (onMessage, callbacks, etc.).
const mockConversation = {
    status: 'disconnected' as string,
    isSpeaking: false,
    startSession: vi.fn(),
    endSession: vi.fn(),
    sendUserMessage: vi.fn(),
    sendUserActivity: vi.fn(),
    sendContextualUpdate: vi.fn(),
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

import { ElevenLabsWidget } from '@/src/islands/ElevenLabsWidget';
import en from '@/messages/en.json';
import es from '@/messages/es.json';

// jsdom has no layout, so no scrollIntoView: stub it to observe the call.
HTMLElement.prototype.scrollIntoView = vi.fn();

describe('ElevenLabsWidget - text vs voice decoupling', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
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
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);

        const input = await screen.findByPlaceholderText('Or send a message');
        fireEvent.change(input, { target: { value: 'Hola' } });
        fireEvent.click(screen.getByRole('button', { name: /send message/i }));

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
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);

        fireEvent.click(await screen.findByRole('button', { name: /start a call/i }));

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
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);

        const input = await screen.findByPlaceholderText('Or send a message');
        fireEvent.change(input, { target: { value: 'Hola' } });
        fireEvent.click(screen.getByRole('button', { name: /send message/i }));

        await waitFor(() =>
            expect(mockConversation.sendUserMessage).toHaveBeenCalledWith('Hola')
        );
        expect(mockConversation.startSession).not.toHaveBeenCalled();
        expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
    });

    // The SDK only echoes VOICE input (user_transcript) through onMessage; typed text goes out as
    // user_message and never comes back, so the widget must add it to the transcript itself.
    it('shows a typed message in the transcript over an open connection', async () => {
        mockConversation.status = 'connected';
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);

        const input = await screen.findByPlaceholderText('Or send a message');
        fireEvent.change(input, { target: { value: 'What do you offer?' } });
        fireEvent.click(screen.getByRole('button', { name: /send message/i }));

        const log = await screen.findByRole('log');
        expect(log).toHaveTextContent('What do you offer?');
        expect(screen.getByText('What do you offer?').className).toContain('self-end');
    });

    it('shows the first typed message once a text session starts, in order before the reply', async () => {
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);

        const input = await screen.findByPlaceholderText('Or send a message');
        fireEvent.change(input, { target: { value: 'Hola' } });
        fireEvent.click(screen.getByRole('button', { name: /send message/i }));

        await waitFor(() => expect(mockConversation.sendUserMessage).toHaveBeenCalledWith('Hola'));
        act(() => {
            mockConversation.options.onMessage({ message: 'Hola, en que puedo ayudarte?', source: 'ai', role: 'agent' });
        });
        const log = await screen.findByRole('log');
        const bubbles = [...log.children].map((el) => el.textContent).filter(Boolean);
        expect(bubbles).toEqual(['Hola', 'Hola, en que puedo ayudarte?']);
    });

    it('does not show a typed message when the text session fails to start', async () => {
        mockConversation.startSession.mockRejectedValueOnce(new Error('network'));
        vi.spyOn(console, 'error').mockImplementation(() => {});
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);

        const input = await screen.findByPlaceholderText('Or send a message');
        fireEvent.change(input, { target: { value: 'Lost message' } });
        fireEvent.click(screen.getByRole('button', { name: /send message/i }));

        await waitFor(() => expect(mockConversation.startSession).toHaveBeenCalled());
        expect(screen.queryByRole('log')).toBeNull();
        expect(mockConversation.sendUserMessage).not.toHaveBeenCalled();
    });

    it('renders incoming messages (user and agent) in a transcript', async () => {
        mockConversation.status = 'connected';
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);
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
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);
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
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);

        expect(screen.getByTestId('icon-minimize').className).toMatch(/\btext-gray-900\b/);
    });

    it('gives the shrink control a resting background, not only a hover one', () => {
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);

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
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);

        const iconClasses = screen.getByTestId('icon-minimize').className.split(/\s+/);
        const unconditional = iconClasses.filter((c) => /^text-/.test(c));

        expect(unconditional.length).toBeGreaterThan(0);
    });

    it('still shrinks the widget when activated', async () => {
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);

        fireEvent.click(shrinkButton());

        expect(screen.getByRole('button', { name: /expand assistant/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /shrink widget/i })).toBeNull();
    });
});

describe('ElevenLabsWidget - avatar', () => {
    it('renders the avatar as a lazy CDN image with a responsive srcset', async () => {
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);
        const img = await screen.findByAltText('Hector Lorenzoz');
        expect(img).toHaveAttribute('loading', 'lazy');
        expect(img).toHaveAttribute('sizes', '64px');
        expect(img.getAttribute('srcset')).toContain('cdn.hlorenzoz.com/cdn-cgi/image/width=64,quality=50,format=auto/');
    });
});

describe('ElevenLabsWidget - translated text', () => {
    it('renders every label it is given, so a Spanish page shows Spanish', async () => {
        render(<ElevenLabsWidget locale="es" labels={es.assistant} />);
        expect(await screen.findByPlaceholderText('O envía un mensaje')).toBeInTheDocument();
        expect(screen.getByText('¿En qué puedo ayudarte?')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Enviar mensaje' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Minimizar el asistente' })).toBeInTheDocument();
        expect(screen.getByText('Iniciar una llamada')).toBeInTheDocument();
    });
});

/** Where the widget keeps the conversation between pages (a language switch loads a new page). */
const STORAGE_KEY = 'elevenlabs-conversation';

describe('ElevenLabsWidget - chat vs call', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
        mockConversation.status = 'disconnected';
        mockConversation.isSpeaking = false;
        mockConversation.startSession.mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'mediaDevices', {
            value: { getUserMedia: vi.fn().mockResolvedValue({}) },
            configurable: true,
        });
    });

    async function chat(text: string) {
        const view = render(<ElevenLabsWidget locale="en" labels={en.assistant} />);
        const input = await screen.findByPlaceholderText('Or send a message');
        fireEvent.change(input, { target: { value: text } });
        fireEvent.click(screen.getByRole('button', { name: /send message/i }));
        await waitFor(() => expect(mockConversation.sendUserMessage).toHaveBeenCalledWith(text));
        mockConversation.status = 'connected';
        view.rerender(<ElevenLabsWidget locale="en" labels={en.assistant} />);
        return view;
    }

    it('keeps offering a call during a text chat: no "End call", no listening state', async () => {
        await chat('hola');
        expect(screen.getByRole('button', { name: en.assistant.startCall })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: en.assistant.endCall })).toBeNull();
        expect(screen.queryByText(en.assistant.listening)).toBeNull();
    });

    it('turns a chat into a call carrying the chat so far as context', async () => {
        await chat('hola');
        fireEvent.click(screen.getByRole('button', { name: en.assistant.startCall }));

        await waitFor(() => expect(mockConversation.endSession).toHaveBeenCalled());
        await waitFor(() =>
            expect(mockConversation.startSession).toHaveBeenLastCalledWith(expect.objectContaining({ connectionType: 'webrtc' }))
        );
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
        await waitFor(() => expect(mockConversation.sendContextualUpdate).toHaveBeenCalledWith(expect.stringContaining('hola')));
    });

    it('shows "End call" during a voice call', async () => {
        mockConversation.status = 'connected';
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);
        expect(await screen.findByRole('button', { name: en.assistant.endCall })).toBeInTheDocument();
        expect(screen.getByText(en.assistant.listening)).toBeInTheDocument();
    });
});

describe('ElevenLabsWidget - the conversation survives a language switch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
        mockConversation.status = 'disconnected';
        mockConversation.isSpeaking = false;
        mockConversation.startSession.mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'mediaDevices', {
            value: { getUserMedia: vi.fn().mockResolvedValue({}) },
            configurable: true,
        });
    });

    const saved = (mode: 'chat' | 'call') =>
        sessionStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ mode, messages: [{ role: 'user', text: 'hola' }, { role: 'agent', text: 'Hola, en que puedo ayudarte?' }] })
        );

    it('saves the conversation and its mode for the next page', async () => {
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);
        const input = await screen.findByPlaceholderText('Or send a message');
        fireEvent.change(input, { target: { value: 'hola' } });
        fireEvent.click(screen.getByRole('button', { name: /send message/i }));

        await waitFor(() => expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null')).toEqual({
            mode: 'chat',
            messages: [{ role: 'user', text: 'hola' }],
        }));
    });

    it('resumes a chat on the new page: same transcript, reconnected as text, with the chat as context', async () => {
        saved('chat');
        render(<ElevenLabsWidget locale="es" labels={es.assistant} />);

        const log = await screen.findByRole('log');
        expect(log).toHaveTextContent('hola');
        expect(log).toHaveTextContent('Hola, en que puedo ayudarte?');
        await waitFor(() =>
            expect(mockConversation.startSession).toHaveBeenCalledWith(expect.objectContaining({ textOnly: true }))
        );
        expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
        await waitFor(() =>
            expect(mockConversation.sendContextualUpdate).toHaveBeenCalledWith(expect.stringContaining('Hola, en que puedo ayudarte?'))
        );
    });

    it('does not repeat the agent greeting in a resumed chat, but shows the replies after it', async () => {
        saved('chat');
        render(<ElevenLabsWidget locale="es" labels={es.assistant} />);
        await waitFor(() => expect(mockConversation.startSession).toHaveBeenCalled());

        act(() => mockConversation.options.onMessage({ message: 'Hi! How can I help today?', role: 'agent' }));
        act(() => mockConversation.options.onMessage({ message: 'Me dijiste que tu clinica esta en Madrid.', role: 'agent' }));

        const log = await screen.findByRole('log');
        expect(log).not.toHaveTextContent('Hi! How can I help today?');
        expect(log).toHaveTextContent('Me dijiste que tu clinica esta en Madrid.');
    });

    it('keeps a call transcript on the new page and waits for a click to call again, with context', async () => {
        saved('call');
        render(<ElevenLabsWidget locale="es" labels={es.assistant} />);

        expect(await screen.findByRole('log')).toHaveTextContent('hola');
        expect(mockConversation.startSession).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: es.assistant.startCall }));
        await waitFor(() =>
            expect(mockConversation.startSession).toHaveBeenCalledWith(expect.objectContaining({ connectionType: 'webrtc' }))
        );
        await waitFor(() => expect(mockConversation.sendContextualUpdate).toHaveBeenCalledWith(expect.stringContaining('hola')));
    });

    it('forgets the conversation when the visitor ends the call', async () => {
        saved('call');
        mockConversation.status = 'connected';
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);

        fireEvent.click(await screen.findByRole('button', { name: en.assistant.endCall }));
        await waitFor(() => expect(mockConversation.endSession).toHaveBeenCalled());
        await waitFor(() => expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull());
    });
});
