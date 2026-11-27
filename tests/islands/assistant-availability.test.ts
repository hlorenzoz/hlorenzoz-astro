import { describe, it, expect, vi } from 'vitest';
import {
    AVAILABILITY_KEY,
    AVAILABILITY_TTL_MS,
    agentAvailability,
    probeAgent,
    readAvailability,
    saveAvailability,
    type ProbeSocket,
} from '@/src/islands/assistant-availability';

function memoryStorage(initial: Record<string, string> = {}) {
    const data = new Map(Object.entries(initial));
    return {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => void data.set(key, value),
        data,
    };
}

/** A socket the test drives: it records what the probe sends and lets the test answer or close. */
function fakeSocket() {
    const socket = {
        sent: [] as string[],
        closed: false,
        onopen: null as ProbeSocket['onopen'],
        onmessage: null as ProbeSocket['onmessage'],
        onclose: null as ProbeSocket['onclose'],
        onerror: null as ProbeSocket['onerror'],
        send(data: string) {
            socket.sent.push(data);
        },
        close() {
            socket.closed = true;
        },
    };
    return socket;
}

describe('readAvailability / saveAvailability', () => {
    it('returns nothing when no state was saved', () => {
        expect(readAvailability(memoryStorage(), 1000)).toBeNull();
    });

    it('returns a saved state while it is younger than the TTL', () => {
        const storage = memoryStorage();
        saveAvailability(storage, false, 1000);
        expect(readAvailability(storage, 1000 + AVAILABILITY_TTL_MS - 1)).toBe(false);
        saveAvailability(storage, true, 1000);
        expect(readAvailability(storage, 1000 + AVAILABILITY_TTL_MS - 1)).toBe(true);
    });

    it('forgets a state once it is older than the TTL, so credits coming back are noticed', () => {
        const storage = memoryStorage();
        saveAvailability(storage, false, 1000);
        expect(readAvailability(storage, 1000 + AVAILABILITY_TTL_MS)).toBeNull();
    });

    it('ignores garbage and storage that throws (private mode)', () => {
        expect(readAvailability(memoryStorage({ [AVAILABILITY_KEY]: 'not json' }), 1000)).toBeNull();
        const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
        expect(readAvailability(broken, 1000)).toBeNull();
        expect(() => saveAvailability(broken, true, 1000)).not.toThrow();
        expect(readAvailability(null, 1000)).toBeNull();
    });
});

describe('probeAgent', () => {
    it('reports available once the agent sends its initiation metadata, and closes at once', async () => {
        const socket = fakeSocket();
        const result = probeAgent(() => socket);
        socket.onopen?.();
        expect(JSON.parse(socket.sent[0])).toMatchObject({ type: 'conversation_initiation_client_data' });
        socket.onmessage?.({ data: JSON.stringify({ type: 'conversation_initiation_metadata' }) });
        await expect(result).resolves.toBe(true);
        expect(socket.closed).toBe(true);
    });

    it('reports unavailable when the agent closes the session before starting (no credits)', async () => {
        const socket = fakeSocket();
        const result = probeAgent(() => socket);
        socket.onopen?.();
        socket.onclose?.({ code: 3000, reason: 'The AI agent you are trying to reach is not available.' });
        await expect(result).resolves.toBe(false);
    });

    it('reports unknown when the check cannot finish (network error or no answer)', async () => {
        const failing = fakeSocket();
        const errored = probeAgent(() => failing);
        failing.onerror?.();
        await expect(errored).resolves.toBeNull();

        vi.useFakeTimers();
        const silent = fakeSocket();
        const timedOut = probeAgent(() => silent, 5000);
        vi.advanceTimersByTime(5000);
        await expect(timedOut).resolves.toBeNull();
        expect(silent.closed).toBe(true);
        vi.useRealTimers();
    });

    it('reports unknown when no socket can be opened', async () => {
        await expect(probeAgent(() => { throw new Error('no WebSocket'); })).resolves.toBeNull();
    });
});

describe('agentAvailability', () => {
    it('uses a fresh saved state without probing', async () => {
        const storage = memoryStorage();
        saveAvailability(storage, false, 1000);
        const probe = vi.fn();
        await expect(agentAvailability(storage, 2000, probe)).resolves.toBe(false);
        expect(probe).not.toHaveBeenCalled();
    });

    it('probes when nothing is saved and saves a definite answer', async () => {
        const storage = memoryStorage();
        await expect(agentAvailability(storage, 1000, async () => false)).resolves.toBe(false);
        expect(readAvailability(storage, 1001)).toBe(false);
    });

    it('does not save an unknown answer, so the next page tries again', async () => {
        const storage = memoryStorage();
        await expect(agentAvailability(storage, 1000, async () => null)).resolves.toBeNull();
        expect(storage.data.size).toBe(0);
    });
});
