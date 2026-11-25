/**
 * Guards the restore path of `setTestTimeZone`.
 *
 * A cleanup helper that silently corrupts the thing it restores is worse than
 * no helper, and the failure is invisible from inside the test that caused it —
 * it only surfaces in whatever runs next. So it gets its own test.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { setTestTimeZone } from './timezone';

describe('setTestTimeZone', () => {
    const saved = process.env.TZ;

    afterEach(() => {
        if (saved === undefined) delete process.env.TZ;
        else process.env.TZ = saved;
    });

    it('applies the requested zone', () => {
        setTestTimeZone('America/Los_Angeles');
        expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/Los_Angeles');
    });

    it('restores an unset TZ by deleting it, not by writing "undefined"', () => {
        delete process.env.TZ;

        const restore = setTestTimeZone('America/Los_Angeles');
        restore();

        // The naive `process.env.TZ = original` stores the STRING "undefined"
        // here, which is the entire defect this helper exists to prevent.
        expect(process.env.TZ).toBeUndefined();
        expect(process.env.TZ).not.toBe('undefined');
    });

    it('leaves the timezone resolvable after restoring an unset TZ', () => {
        delete process.env.TZ;

        const restore = setTestTimeZone('America/Los_Angeles');
        restore();

        // Under the bug this is `undefined`: an unparseable TZ leaves Node
        // resolving no zone at all for every later test in the worker.
        const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
        expect(resolved).toBeTruthy();
        expect(resolved).not.toBe('America/Los_Angeles');
    });

    it('restores a previously set TZ to its exact value', () => {
        process.env.TZ = 'Europe/Madrid';

        const restore = setTestTimeZone('America/Los_Angeles');
        expect(process.env.TZ).toBe('America/Los_Angeles');

        restore();
        expect(process.env.TZ).toBe('Europe/Madrid');
    });
});
