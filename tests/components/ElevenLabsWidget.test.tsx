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
        // A chat reply shows after the brief typing pause.
        const log = await screen.findByRole('log');
        await waitFor(() => {
            const bubbles = [...log.children].map((el) => el.textContent).filter(Boolean);
            expect(bubbles).toEqual(['Hola', 'Hola, en que puedo ayudarte?']);
        }, { timeout: 2000 });
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
        await waitFor(() => expect(log).toHaveTextContent('Me dijiste que tu clinica esta en Madrid.'), { timeout: 2000 });
        expect(log).not.toHaveTextContent('Hi! How can I help today?');
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

describe('ElevenLabsWidget - what each session starts with', () => {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastSession = (): any => mockConversation.startSession.mock.lastCall?.[0];

    it('opens a new chat with the translated greeting and the five dynamic variables', async () => {
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);
        fireEvent.change(await screen.findByPlaceholderText('Or send a message'), { target: { value: 'hola' } });
        fireEvent.click(screen.getByRole('button', { name: /send message/i }));

        await waitFor(() => expect(mockConversation.startSession).toHaveBeenCalled());
        const session = lastSession();
        expect(session.overrides.agent.firstMessage).toBe(en.assistant.greeting);
        expect(session.overrides.agent).not.toHaveProperty('language');
        const vars = session.dynamicVariables;
        expect(Object.keys(vars).sort()).toEqual(['cost_of_waiting', 'locale', 'page_title', 'page_url', 'visitor_timezone']);
        for (const value of Object.values(vars)) expect(typeof value).toBe('string');
        expect(vars.locale).toBe('en');
        expect(vars.visitor_timezone).not.toBe('');
        expect(vars.cost_of_waiting).toBe('not used');
    });

    it('opens a new call with the greeting too', async () => {
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);
        fireEvent.click(await screen.findByRole('button', { name: en.assistant.startCall }));
        await waitFor(() => expect(mockConversation.startSession).toHaveBeenCalled());
        expect(lastSession().overrides.agent.firstMessage).toBe(en.assistant.greeting);
    });

    it('resumes a chat with no greeting', async () => {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: 'chat', messages: [{ role: 'user', text: 'hola' }] }));
        render(<ElevenLabsWidget locale="es" labels={es.assistant} />);
        await waitFor(() => expect(mockConversation.startSession).toHaveBeenCalled());
        expect(lastSession().overrides.agent.firstMessage).toBe('');
        expect(lastSession().dynamicVariables.locale).toBe('es');
    });

    // With the empty first message honored the agent never greets, so its first message after the
    // visitor speaks is a real reply: the safety net that hides a repeated greeting must not eat it.
    it('shows the first reply in a resumed chat once the visitor has typed', async () => {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: 'chat', messages: [{ role: 'user', text: 'hola' }] }));
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);
        await waitFor(() => expect(mockConversation.startSession).toHaveBeenCalled());
        mockConversation.status = 'connected';
        fireEvent.change(screen.getByPlaceholderText('Or send a message'), { target: { value: 'And the price?' } });
        fireEvent.click(screen.getByRole('button', { name: /send message/i }));
        act(() => mockConversation.options.onMessage({ message: 'The entry price is 500 EUR plus VAT.', role: 'agent' }));
        const log = await screen.findByRole('log');
        await waitFor(() => expect(log).toHaveTextContent('The entry price is 500 EUR plus VAT.'), { timeout: 2000 });
    });

    it('starts a call from a chat with messages with no greeting', async () => {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: 'call', messages: [{ role: 'user', text: 'hola' }] }));
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);
        fireEvent.click(await screen.findByRole('button', { name: en.assistant.startCall }));
        await waitFor(() => expect(mockConversation.startSession).toHaveBeenCalled());
        expect(lastSession().connectionType).toBe('webrtc');
        expect(lastSession().overrides.agent.firstMessage).toBe('');
    });

    it('reads the visitor figures from the calculator when it is on the page', async () => {
        document.body.insertAdjacentHTML(
            'beforeend',
            '<section data-cost-of-waiting><input name="missed" type="number" value="3"><input name="value" type="number" value="200"></section>'
        );
        try {
            render(<ElevenLabsWidget locale="en" labels={en.assistant} />);
            fireEvent.click(await screen.findByRole('button', { name: en.assistant.startCall }));
            await waitFor(() => expect(mockConversation.startSession).toHaveBeenCalled());
            expect(lastSession().dynamicVariables.cost_of_waiting).toContain('600 EUR a day');
        } finally {
            document.querySelector('[data-cost-of-waiting]')?.remove();
        }
    });
});

describe('ElevenLabsWidget - client tools', () => {
    it('offers navigate_to_contact and show_cost_of_waiting, and no create_booking', () => {
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);
        const tools = mockConversation.options.clientTools;
        expect(tools).toHaveProperty('navigate_to_contact');
        expect(tools).toHaveProperty('show_cost_of_waiting');
        expect(tools).not.toHaveProperty('create_booking');
    });

    it('show_cost_of_waiting scrolls to the calculator when it is on the page', () => {
        document.body.insertAdjacentHTML('beforeend', '<section id="cost-of-waiting"></section>');
        try {
            render(<ElevenLabsWidget locale="en" labels={en.assistant} />);
            const scrollSpy = HTMLElement.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
            scrollSpy.mockClear();
            const reply = mockConversation.options.clientTools.show_cost_of_waiting();
            expect(scrollSpy.mock.contexts[0]).toBe(document.getElementById('cost-of-waiting'));
            expect(typeof reply).toBe('string');
        } finally {
            document.getElementById('cost-of-waiting')?.remove();
        }
    });
});

describe('ElevenLabsWidget - calculator changes reach the agent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
        mockConversation.isSpeaking = false;
    });

    const change = (missed: number, value: number) =>
        window.dispatchEvent(new CustomEvent('cost-of-waiting:change', { detail: { missed, value } }));

    it('sends one debounced contextual update with the latest figures during a session', () => {
        mockConversation.status = 'connected';
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);
        vi.useFakeTimers();
        try {
            change(2, 200);
            change(3, 200);
            vi.advanceTimersByTime(300);
            expect(mockConversation.sendContextualUpdate).not.toHaveBeenCalled();
            vi.advanceTimersByTime(1000);
            expect(mockConversation.sendContextualUpdate).toHaveBeenCalledTimes(1);
            expect(mockConversation.sendContextualUpdate).toHaveBeenCalledWith(
                expect.stringContaining('600 EUR a day, 3000 EUR a week, 13000 EUR a month, 156000 EUR a year')
            );
        } finally {
            vi.useRealTimers();
        }
    });

    it('sends nothing when no session is connected', () => {
        mockConversation.status = 'disconnected';
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);
        vi.useFakeTimers();
        try {
            change(3, 200);
            vi.advanceTimersByTime(2000);
            expect(mockConversation.sendContextualUpdate).not.toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('ElevenLabsWidget - a session the server ends', () => {
    const OVERRIDE_REJECTED = "Override for field 'first_message' is not allowed by config.";

    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
        mockConversation.status = 'disconnected';
        mockConversation.isSpeaking = false;
        mockConversation.startSession.mockResolvedValue(undefined);
    });

    async function chat(text: string) {
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);
        const input = await screen.findByPlaceholderText('Or send a message');
        fireEvent.change(input, { target: { value: text } });
        fireEvent.click(screen.getByRole('button', { name: /send message/i }));
        await waitFor(() => expect(mockConversation.sendUserMessage).toHaveBeenCalledWith(text));
    }

    const disconnect = (details: object) => act(() => mockConversation.options.onDisconnect(details));

    it('retries a chat without overrides when the agent rejects them, and resends the unanswered message', async () => {
        await chat('hola');
        expect(mockConversation.startSession.mock.calls[0][0]).toHaveProperty('overrides');

        await disconnect({ reason: 'error', message: OVERRIDE_REJECTED, closeCode: 1008 });

        await waitFor(() => expect(mockConversation.startSession).toHaveBeenCalledTimes(2));
        const retry = mockConversation.startSession.mock.calls[1][0];
        expect(retry).not.toHaveProperty('overrides');
        expect(retry).toEqual(expect.objectContaining({ textOnly: true, connectionType: 'websocket', dynamicVariables: expect.any(Object) }));
        await waitFor(() => expect(mockConversation.sendUserMessage).toHaveBeenCalledTimes(2));
        expect(mockConversation.sendUserMessage).toHaveBeenLastCalledWith('hola');
        expect(screen.queryByText(en.assistant.chatError)).toBeNull();
    });

    it('keeps later sessions without the rejected overrides', async () => {
        await chat('hola');
        await disconnect({ reason: 'error', message: OVERRIDE_REJECTED, closeCode: 1008 });
        await waitFor(() => expect(mockConversation.startSession).toHaveBeenCalledTimes(2));

        await disconnect({ reason: 'agent', closeCode: 1000 });
        fireEvent.change(screen.getByPlaceholderText('Or send a message'), { target: { value: 'again' } });
        fireEvent.click(screen.getByRole('button', { name: /send message/i }));
        await waitFor(() => expect(mockConversation.startSession).toHaveBeenCalledTimes(3));
        expect(mockConversation.startSession.mock.calls[2][0]).not.toHaveProperty('overrides');
    });

    it('tells the visitor when the connection drops for any other reason', async () => {
        await chat('hola');
        await disconnect({ reason: 'error', message: 'The connection was closed by the server.', closeCode: 1011 });
        expect(await screen.findByText(en.assistant.chatError)).toBeInTheDocument();
        expect(mockConversation.startSession).toHaveBeenCalledTimes(1);
    });

    it('shows no error when the conversation simply ends', async () => {
        await chat('hola');
        await disconnect({ reason: 'agent', closeCode: 1000 });
        expect(screen.queryByText(en.assistant.chatError)).toBeNull();
    });
});

describe('ElevenLabsWidget - message box', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
        mockConversation.status = 'disconnected';
        mockConversation.startSession.mockResolvedValue(undefined);
    });

    it('is a multiline box, so a long message stays visible while it is written', async () => {
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);
        const box = await screen.findByPlaceholderText('Or send a message');
        expect(box.tagName).toBe('TEXTAREA');
    });

    it('sends with Enter and keeps the line break with Shift+Enter', async () => {
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);
        const box = await screen.findByPlaceholderText('Or send a message');
        fireEvent.change(box, { target: { value: 'first line' } });
        fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
        expect(mockConversation.startSession).not.toHaveBeenCalled();

        fireEvent.change(box, { target: { value: 'first line\nsecond line' } });
        fireEvent.keyDown(box, { key: 'Enter' });
        await waitFor(() => expect(mockConversation.sendUserMessage).toHaveBeenCalledWith('first line\nsecond line'));
        expect(box).toHaveValue('');
    });

    it('does not send while an input method is composing', async () => {
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);
        const box = await screen.findByPlaceholderText('Or send a message');
        fireEvent.change(box, { target: { value: 'nihon' } });
        fireEvent.keyDown(box, { key: 'Enter', isComposing: true });
        expect(mockConversation.startSession).not.toHaveBeenCalled();
    });
});

describe('ElevenLabsWidget - typing indicator', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
        mockConversation.status = 'disconnected';
        mockConversation.startSession.mockResolvedValue(undefined);
    });

    async function chat(text: string) {
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);
        const box = await screen.findByPlaceholderText('Or send a message');
        fireEvent.change(box, { target: { value: text } });
        fireEvent.keyDown(box, { key: 'Enter' });
        await waitFor(() => expect(mockConversation.sendUserMessage).toHaveBeenCalledWith(text));
    }

    const agentSays = (message: string) => act(() => mockConversation.options.onMessage({ message, role: 'agent' }));

    it('shows that the assistant is typing once a chat message is sent', async () => {
        await chat('hola');
        expect(screen.getByRole('status', { name: en.assistant.typing })).toBeInTheDocument();
    });

    it('holds an instant reply briefly behind the indicator, then shows it', async () => {
        await chat('hola');
        await agentSays('Hi there');
        expect(screen.queryByText('Hi there')).toBeNull();
        expect(await screen.findByText('Hi there', {}, { timeout: 2000 })).toBeInTheDocument();
        expect(screen.queryByRole('status', { name: en.assistant.typing })).toBeNull();
    });

    it('keeps the order of several replies', async () => {
        await chat('hola');
        await agentSays('first');
        await agentSays('second');
        await screen.findByText('second', {}, { timeout: 3000 });
        const texts = screen.getAllByText(/^(first|second)$/).map((el) => el.textContent);
        expect(texts).toEqual(['first', 'second']);
    });

    it('does not delay what the agent says in a voice call', async () => {
        mockConversation.status = 'connected';
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);
        await screen.findByRole('button', { name: en.assistant.endCall });
        await agentSays('Hello by voice');
        expect(screen.getByText('Hello by voice')).toBeInTheDocument();
    });
});

describe('ElevenLabsWidget - calculate_cost_of_waiting client tool', () => {
    it('lets the agent get exact figures from the calculator arithmetic', async () => {
        render(<ElevenLabsWidget locale="en" labels={en.assistant} />);
        await screen.findByPlaceholderText('Or send a message');
        const tool = mockConversation.options.clientTools.calculate_cost_of_waiting;
        expect(tool({ customers_per_day: 1, value_per_customer: 250 })).toContain('1250 EUR a week, 5417 EUR a month, 65000 EUR a year');
        expect(tool({ customers_per_day: 0, value_per_customer: 250 })).toMatch(/^Cannot calculate/);
        expect(tool({ customers_per_day: 1, value_per_customer: 90, currency: 'USD' })).toContain('450 USD a week');
    });
});

describe('ElevenLabsWidget - WhatsApp when the assistant is unavailable', () => {
    const WHATSAPP = '34643844720';

    beforeEach(() => {
        vi.clearAllMocks();
        sessionStorage.clear();
        mockConversation.status = 'disconnected';
    });

    async function type(text: string, whatsapp?: string) {
        render(<ElevenLabsWidget locale="en" labels={en.assistant} whatsapp={whatsapp} />);
        const box = await screen.findByPlaceholderText('Or send a message');
        fireEvent.change(box, { target: { value: text } });
        fireEvent.keyDown(box, { key: 'Enter' });
    }

    it('offers WhatsApp with the typed message when the chat cannot start', async () => {
        mockConversation.startSession.mockRejectedValue(new Error('The AI agent you are trying to reach is not available.'));
        await type('hola, quiero una web', WHATSAPP);
        const link = await screen.findByRole('link', { name: en.assistant.whatsapp });
        const url = new URL(link.getAttribute('href')!);
        expect(url.origin + url.pathname).toBe(`https://wa.me/${WHATSAPP}`);
        expect(url.searchParams.get('text')).toBe(`${en.assistant.whatsappMessage} hola, quiero una web`);
        expect(link).toHaveAttribute('target', '_blank');
        expect(screen.getByText(en.assistant.chatError)).toBeInTheDocument();
    });

    it('offers WhatsApp when the server ends the chat', async () => {
        mockConversation.startSession.mockResolvedValue(undefined);
        await type('hola', WHATSAPP);
        await waitFor(() => expect(mockConversation.sendUserMessage).toHaveBeenCalledWith('hola'));
        await act(() => mockConversation.options.onDisconnect({ reason: 'error', message: 'The connection was closed by the server.' }));
        const link = await screen.findByRole('link', { name: en.assistant.whatsapp });
        expect(new URL(link.getAttribute('href')!).searchParams.get('text')).toBe(`${en.assistant.whatsappMessage} hola`);
    });

    it('shows no WhatsApp link while the assistant works', async () => {
        mockConversation.startSession.mockResolvedValue(undefined);
        await type('hola', WHATSAPP);
        await waitFor(() => expect(mockConversation.sendUserMessage).toHaveBeenCalled());
        expect(screen.queryByRole('link', { name: en.assistant.whatsapp })).toBeNull();
    });
});
