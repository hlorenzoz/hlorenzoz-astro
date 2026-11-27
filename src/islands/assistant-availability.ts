/**
 * Whether the ElevenLabs agent can take a conversation right now.
 *
 * No public HTTP endpoint says so: with the account out of credits the token and widget
 * endpoints still answer 200, and the usage API needs the secret key. The only public
 * signal is the conversation socket itself: the agent closes it before starting (code 3000,
 * "not available") when it cannot answer, and sends its initiation metadata when it can.
 * So the page opens a text-only session, waits for one of the two, closes it at once and
 * remembers the answer for an hour, so a visitor browsing several pages checks only once.
 * The loader shows the WhatsApp button instead of the assistant when the answer is "no".
 */

export const AGENT_ID = 'agent_7601kjm9f042e55894dty11tqtnh';
export const AVAILABILITY_KEY = 'assistant-availability';
export const AVAILABILITY_TTL_MS = 60 * 60 * 1000;
const SOCKET_URL = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${AGENT_ID}`;

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

/** The part of a WebSocket the probe uses, so tests can drive it. */
export interface ProbeSocket {
    send(data: string): void;
    close(): void;
    onopen: (() => void) | null;
    onmessage: ((event: { data: unknown }) => void) | null;
    onclose: ((event: { code: number; reason: string }) => void) | null;
    onerror: (() => void) | null;
}

/** The saved answer while it is fresh; null when there is none, it expired or storage is unusable. */
export function readAvailability(storage: Storage | null, now: number): boolean | null {
    try {
        const saved = JSON.parse(storage?.getItem(AVAILABILITY_KEY) ?? 'null') as { available?: unknown; at?: unknown } | null;
        if (typeof saved?.available !== 'boolean' || typeof saved.at !== 'number') return null;
        return now - saved.at < AVAILABILITY_TTL_MS ? saved.available : null;
    } catch {
        return null;
    }
}

export function saveAvailability(storage: Storage | null, available: boolean, now: number): void {
    try {
        storage?.setItem(AVAILABILITY_KEY, JSON.stringify({ available, at: now }));
    } catch {
        // Storage unavailable (private mode): the next page simply checks again.
    }
}

/**
 * Opens a text-only session and resolves true when the agent starts it, false when it closes
 * the session first, and null when the check cannot finish (network error, no answer in time).
 * No message is sent, so the agent never generates a reply.
 */
export function probeAgent(
    open: (url: string) => ProbeSocket = (url) => new WebSocket(url) as unknown as ProbeSocket,
    timeoutMs = 8000
): Promise<boolean | null> {
    return new Promise((resolve) => {
        let socket: ProbeSocket;
        try {
            socket = open(SOCKET_URL);
        } catch {
            return resolve(null);
        }
        let done = false;
        const finish = (answer: boolean | null) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            try {
                socket.close();
            } catch {
                // Already closed.
            }
            resolve(answer);
        };
        const timer = setTimeout(() => finish(null), timeoutMs);
        socket.onopen = () =>
            socket.send(JSON.stringify({ type: 'conversation_initiation_client_data', conversation_config_override: { conversation: { text_only: true } } }));
        socket.onmessage = (event) => {
            try {
                if ((JSON.parse(String(event.data)) as { type?: string }).type === 'conversation_initiation_metadata') finish(true);
            } catch {
                // Not JSON: keep waiting for the initiation metadata.
            }
        };
        socket.onclose = () => finish(false);
        socket.onerror = () => finish(null);
    });
}

/** The fresh saved answer, or a new check whose definite answer is saved for the next pages. */
export async function agentAvailability(
    storage: Storage | null,
    now: number,
    probe: () => Promise<boolean | null> = () => probeAgent()
): Promise<boolean | null> {
    const saved = readAvailability(storage, now);
    if (saved !== null) return saved;
    const answer = await probe();
    if (answer !== null) saveAvailability(storage, answer, now);
    return answer;
}
