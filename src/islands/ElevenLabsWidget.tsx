/**
 * The site's only React island, mounted on scroll by
 * `src/components/ElevenLabsLoader.astro` (see `mount-elevenlabs.tsx`).
 */
import { useState, useEffect, useRef } from 'react';
import { useConversation, type DisconnectionDetails } from '@elevenlabs/react';
import { Phone, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { imageFallbackSrc, imageSrcSet } from '@/lib/image';
import { localeHref } from '@/lib/routing';
import { CONVERSATION_KEY as STORAGE_KEY } from './conversation-storage';
import { costOfWaitingContext, readCostOfWaiting, type CostOfWaitingInputs } from './cost-of-waiting-context';

const AGENT_ID = 'agent_7601kjm9f042e55894dty11tqtnh';
const AVATAR = 'https://cdn.hlorenzoz.com/hlorenzoz.com/hector-profile.webp';

/** The widget's visible and accessible text: `messages/<locale>.json` `assistant`, passed in by the loader. */
export interface AssistantLabels {
    expand: string;
    shrink: string;
    avatarAlt: string;
    prompt: string;
    connecting: string;
    speaking: string;
    listening: string;
    placeholder: string;
    send: string;
    startCall: string;
    endCall: string;
    micError: string;
    chatError: string;
    /** The agent's first message in a new conversation (the `first_message` override). */
    greeting: string;
}

type Message = { role: 'user' | 'agent'; text: string };
/** A text chat (no microphone) or a voice call: the same SDK session, told apart only here. */
type Mode = 'chat' | 'call';

/**
 * A language switch loads a new page, which closes the live session, and the SDK cannot
 * resume one. So the transcript and the mode are kept for the tab in sessionStorage: the next
 * page shows the same conversation, reconnects a chat on its own and offers to call again,
 * handing the agent the conversation so far as context.
 */

function loadSaved(): { mode: Mode; messages: Message[] } | null {
    try {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null');
        return saved && (saved.mode === 'chat' || saved.mode === 'call') && Array.isArray(saved.messages) ? saved : null;
    } catch {
        return null;
    }
}

/** The conversation so far, for the agent: never shown to the visitor. */
function contextFrom(messages: Message[]): string {
    const lines = messages.slice(-20).map((m) => `${m.role === 'user' ? 'Visitor' : 'You'}: ${m.text}`);
    return `The visitor is continuing a conversation they already had with you on this site. Do not greet them again; carry on from here.\n${lines.join('\n')}`;
}

function visitorTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
        return 'UTC';
    }
}

export interface ElevenLabsWidgetProps {
    locale: string;
    labels: AssistantLabels;
}

export function ElevenLabsWidget({ locale, labels }: ElevenLabsWidgetProps) {
    const [error, setError] = useState<string | null>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isShrunk, setIsShrunk] = useState(false);
    const [mounted, setMounted] = useState(false);
    // Read once: what the previous page left (a language switch), if anything.
    const [restored] = useState(loadSaved);
    const [messages, setMessages] = useState<Message[]>(() => restored?.messages ?? []);
    const [mode, setMode] = useState<Mode | null>(() => restored?.mode ?? null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    // True once the page is going away: that disconnect is not the end of the conversation.
    const leavingRef = useRef(false);
    const resumedRef = useRef(false);
    // A session that continues a conversation (a chat after a language switch, or a call after
    // a chat) starts with an empty first message. Safety net for an agent that greets anyway:
    // an agent message before the visitor says anything in that session is not shown.
    const skipGreetingRef = useRef(false);
    // ElevenLabs closes a session whose overrides the agent does not allow (agent Security tab,
    // Overrides). The greeting is a nicety, the answer is not: once rejected, sessions go without it.
    const overridesRejectedRef = useRef(false);
    // Typed messages the agent has not answered yet: resent when a rejected session is retried.
    const unansweredRef = useRef<string[]>([]);
    const modeRef = useRef(mode);
    modeRef.current = mode;

    /**
     * What every session starts with: the translated greeting for a new conversation, none when
     * it continues one (the agent ignores an empty first message and waits), and the dynamic
     * variables the agent's prompt reads. The language is not overridden: the agent detects it.
     */
    const sessionBase = (continuing: boolean) => ({
        agentId: AGENT_ID,
        ...(overridesRejectedRef.current ? {} : { overrides: { agent: { firstMessage: continuing ? '' : labels.greeting } } }),
        dynamicVariables: {
            page_title: document.title,
            page_url: location.origin + location.pathname,
            locale,
            visitor_timezone: visitorTimezone(),
            cost_of_waiting: costOfWaitingContext(readCostOfWaiting()),
        },
    });

    // Keep the newest message in view as the conversation grows.
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages]);

    // Keep the conversation for the next page while it is going on; forget it once it ends.
    useEffect(() => {
        try {
            if (mode) sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, messages }));
            else sessionStorage.removeItem(STORAGE_KEY);
        } catch {
            // Storage unavailable (private mode): the conversation simply does not carry over.
        }
    }, [mode, messages]);

    useEffect(() => {
        const leave = () => (leavingRef.current = true);
        window.addEventListener('pagehide', leave);
        return () => window.removeEventListener('pagehide', leave);
    }, []);

    // Default to shrunk on mobile, unless a conversation carried over from the previous page.
    useEffect(() => {
        const checkMobile = () => {
            if (window.innerWidth < 768 && !restored) {
                setIsShrunk(true);
            }
        };
        checkMobile();
        setMounted(true);
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [restored]);

    const conversation = useConversation({
        onConnect: () => setError(null),
        onMessage: ({ message, role }: { message: string; role: 'user' | 'agent' }) => {
            if (role === 'user') skipGreetingRef.current = false;
            if (role === 'agent' && skipGreetingRef.current) {
                skipGreetingRef.current = false;
                return;
            }
            if (role === 'agent') unansweredRef.current = [];
            setMessages((prev) => [...prev, { role, text: message }]);
        },
        onDisconnect: (details: DisconnectionDetails) => {
            if (leavingRef.current) return;
            if (details.reason === 'error' && /override/i.test(details.message) && !overridesRejectedRef.current) {
                console.warn('11Labs rejected the session overrides, retrying without them:', details.message);
                overridesRejectedRef.current = true;
                const pending = unansweredRef.current;
                if (modeRef.current === 'chat' && pending.length) {
                    const live = conversationRef.current;
                    live.startSession({ ...sessionBase(false), connectionType: 'websocket', textOnly: true })
                        .then(() => {
                            for (const text of pending) live.sendUserMessage(text);
                        })
                        .catch((err: unknown) => {
                            console.error('Failed to restart the chat:', err);
                            setMode(null);
                            setError(labels.chatError);
                        });
                    return;
                }
            }
            setMode(null);
            // The server or the network ended the session: say so instead of leaving the visitor waiting.
            if (details.reason === 'error') setError(modeRef.current === 'call' ? labels.micError : labels.chatError);
        },
        onError: (err: Error | string) => {
            console.error('11Labs Error:', err);
            setError(typeof err === 'string' ? err : err.message);
        },
        clientTools: {
            show_cost_of_waiting: () => {
                const section = document.getElementById('cost-of-waiting');
                if (section) {
                    section.scrollIntoView({ behavior: 'auto' });
                } else {
                    window.location.assign(`${localeHref(locale, '')}#cost-of-waiting`);
                }
                return 'Showed the visitor the cost of waiting calculator.';
            },
            navigate_to_contact: () => {
                const contactSection = document.getElementById('contact');
                if (contactSection) {
                    contactSection.scrollIntoView({ behavior: 'auto' });
                } else {
                    // The home page of the current locale: no root redirect hop.
                    window.location.assign(`${localeHref(locale, '')}#contact`);
                }
                return "Navigated securely to contact section.";
            },
        }
    });
    // The listener below outlives renders; it reads the live session through this ref.
    const conversationRef = useRef(conversation);
    conversationRef.current = conversation;

    // The visitor changes the calculator during a session: tell the agent once they stop typing.
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const onChange = (event: Event) => {
            const text = costOfWaitingContext((event as CustomEvent<CostOfWaitingInputs>).detail);
            clearTimeout(timer);
            timer = setTimeout(() => {
                const live = conversationRef.current;
                if (live.status === 'connected' && text !== 'not used') live.sendContextualUpdate(text);
            }, 800);
        };
        window.addEventListener('cost-of-waiting:change', onChange);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('cost-of-waiting:change', onChange);
        };
    }, []);

    // The SDK only echoes voice input (user_transcript) through onMessage; typed text is sent as
    // user_message and never comes back, so it joins the transcript here, when it is sent.
    // A chat carried over from the previous page reconnects on its own, without the microphone.
    useEffect(() => {
        if (restored?.mode !== 'chat' || resumedRef.current) return;
        resumedRef.current = true;
        skipGreetingRef.current = true;
        conversation
            .startSession({ ...sessionBase(true), connectionType: 'websocket', textOnly: true })
            .then(() => conversation.sendContextualUpdate(contextFrom(restored.messages)))
            .catch((err: unknown) => {
                console.error('Failed to resume the chat:', err);
                setMode(null);
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const sendText = (text: string) => {
        skipGreetingRef.current = false;
        setMessages((prev) => [...prev, { role: 'user', text }]);
        unansweredRef.current = [...unansweredRef.current, text];
        conversation.sendUserMessage(text);
        setInputValue('');
    };

    // All hooks must run before this guard - never call a hook after an early return.
    if (!mounted) return null;

    const isConnected = conversation.status === 'connected';
    const isConnecting = conversation.status === 'connecting';
    // A connected text chat is not a call: it keeps offering one instead of "End call".
    const isCall = isConnected && mode !== 'chat';

    const toggleConversation = async () => {
        if (isCall) {
            await conversation.endSession();
            setMode(null);
            return;
        }
        setError(null);
        try {
            // A chat in progress becomes a call: the text session closes, the transcript stays.
            if (isConnected) await conversation.endSession();
            await navigator.mediaDevices.getUserMedia({ audio: true });
            setMode('call');
            skipGreetingRef.current = messages.length > 0;
            await conversation.startSession({ ...sessionBase(messages.length > 0), connectionType: 'webrtc' });
            if (messages.length) conversation.sendContextualUpdate(contextFrom(messages));
        } catch (err: unknown) {
            console.error("Failed to start conversation:", err);
            setMode(null);
            setError(labels.micError);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end isolate">
            {isShrunk ? (
                <button
                    key="shrunk"
                    onClick={() => setIsShrunk(false)}
                    className="bg-[#227747] hover:bg-[#1c6b3d] text-white p-4 rounded-full shadow-2xl flex items-center justify-center border-none"
                    aria-label={labels.expand}
                >
                    <Phone className="w-6 h-6 fill-white" />
                </button>
            ) : (
                <div
                    key="expanded"
                    className="flex flex-col items-end"
                >
                    {error && (
                        <div className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-2 rounded-2xl shadow-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    {/* Main Card */}
                    <div className="backdrop-blur-2xl bg-white/70 dark:bg-[#1a1a1a]/70 rounded-[2rem] p-3 shadow-2xl border border-white/10 dark:border-white/20 w-[340px] relative">

                        {/* Shrink Button */}
                        <button
                            onClick={() => setIsShrunk(true)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/25 dark:hover:bg-white/40 z-10 focus:outline-none border-none"
                            aria-label={labels.shrink}
                        >
                            <Minimize2 className="w-4 h-4 text-gray-900 dark:text-white" strokeWidth={2.5} aria-hidden="true" />
                        </button>

                        {/* Top Section: Icon and Text */}
                        <div className="flex items-center gap-4 mt-2 mb-6 px-3">
                            {/* Avatar */}
                            <div className="relative flex items-center justify-center w-14 h-14 rounded-full flex-shrink-0 shadow-sm border-2 border-white dark:border-[#333] overflow-hidden">
                                <img
                                    src={imageFallbackSrc(AVATAR, { sizes: '64px' })}
                                    srcSet={imageSrcSet(AVATAR, { sizes: '64px' })}
                                    sizes="64px"
                                    alt={labels.avatarAlt}
                                    width={64}
                                    height={64}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            {/* Text */}
                            <div className="text-black dark:text-white font-semibold text-[20px] leading-tight flex-1 pr-8">
                                {isCall ?
                                    (conversation.isSpeaking ? labels.speaking : labels.listening) :
                                    (isConnecting ? labels.connecting : labels.prompt)}
                            </div>
                        </div>

                        {/* Transcript (shown once messages arrive) */}
                        {messages.length > 0 && (
                            <div
                                className="px-3 pb-3 mb-1 max-h-72 overflow-y-auto flex flex-col gap-2"
                                role="log"
                                aria-live="polite"
                            >
                                {messages.map((m, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "max-w-[80%] px-3 py-2 rounded-2xl text-[14px] leading-snug shadow-sm",
                                            m.role === 'user'
                                                ? "self-end bg-blue-500 text-white"
                                                : "self-start bg-white/80 dark:bg-white/10 text-black dark:text-white"
                                        )}
                                    >
                                        {m.text}
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        )}

                        {/* Text Input Section (Always shown) */}
                        <div className="px-3 pb-3">
                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (inputValue.trim()) {
                                        if (!isConnected) {
                                            try {
                                                // Text-only session: no microphone, no WebRTC audio.
                                                setMode('chat');
                                                await conversation.startSession({
                                                    ...sessionBase(false),
                                                    connectionType: 'websocket',
                                                    textOnly: true,
                                                });
                                                sendText(inputValue);
                                            } catch (err: unknown) {
                                                console.error("Failed to start text conversation:", err);
                                                setMode(null);
                                                setError(labels.chatError);
                                            }
                                        } else {
                                            sendText(inputValue);
                                        }
                                    }
                                }}
                                className="relative flex items-center"
                            >
                                <input
                                    type="text"
                                    placeholder={labels.placeholder}
                                    value={inputValue}
                                    onChange={(e) => {
                                        setInputValue(e.target.value);
                                        if (isConnected) {
                                            conversation.sendUserActivity();
                                        }
                                    }}
                                    className="w-full bg-white/50 dark:bg-white/5 border border-gray-300 dark:border-white/40 rounded-[1rem] pl-4 pr-12 py-3 text-[15px] text-black dark:text-white placeholder-gray-700 dark:placeholder-white/60 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium shadow-sm"
                                />
                                <button
                                    type="submit"
                                    aria-label={labels.send}
                                    disabled={!inputValue.trim() || isConnecting}
                                    className="absolute right-1.5 p-2 bg-black/10 dark:bg-white/20 text-black dark:text-white rounded-[0.8rem] disabled:opacity-40 hover:bg-black/20 dark:hover:bg-white/30 dark:border dark:border-white/20"
                                >
                                    {isConnecting ? (
                                        <svg className="animate-spin h-4 w-4 text-black dark:text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M3.4 20.4l17.45-7.48c.81-.35.81-1.49 0-1.84L3.4 3.6c-.66-.29-1.39.2-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.06-.87.48-.87.99l.01 4.61c0 .71.73 1.2 1.39.92z" />
                                        </svg>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Bottom Section: Action Button */}
                        <div className="p-1">
                            <button
                                onClick={toggleConversation}
                                disabled={isConnecting}
                                onMouseEnter={() => setIsHovered(true)}
                                onMouseLeave={() => setIsHovered(false)}
                                style={{
                                    color: '#ffffff',
                                    backgroundColor: isConnecting ? '#000000' : (isCall ? (isHovered ? '#b00010' : '#d70015') : (isHovered ? '#1c6b3d' : '#227747'))
                                }}
                                className={cn(
                                    "w-full flex items-center justify-center gap-2.5 py-4 rounded-[1.5rem] font-medium text-[17px] !text-white shadow-md border border-transparent dark:border-white/10",
                                    isConnecting ? "opacity-70 cursor-wait" : ""
                                )}
                            >
                                {isConnecting ? (
                                    <svg className="animate-spin h-5 w-5 !text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : isCall ? (
                                    <>
                                        <svg aria-hidden="true" className="!text-white" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path>
                                            <line x1="22" y1="2" x2="2" y2="22"></line>
                                        </svg>
                                        <span>{labels.endCall}</span>
                                    </>
                                ) : (
                                    <>
                                        <svg aria-hidden="true" className="!text-white" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                        </svg>
                                        <span>{labels.startCall}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
