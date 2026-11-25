/**
 * Runs a block of tests in a fixed timezone, and restores the previous one
 * correctly afterwards.
 *
 * The restore is the whole reason this exists. The obvious form is wrong:
 *
 *     const original = process.env.TZ;
 *     process.env.TZ = original;   // when `original` is undefined
 *
 * `process.env` coerces assigned values to strings, so writing `undefined` back
 * stores the literal string `"undefined"` — an unparseable zone. Node then
 * resolves no timezone at all: `Intl.DateTimeFormat().resolvedOptions().timeZone`
 * returns `undefined` for the rest of the process. `TZ` is unset by default on
 * macOS and in CI containers, so that branch is the common one, and the hook
 * written to restore state is what corrupts it.
 *
 * Deleting is the only way to restore "unset".
 */
export function setTestTimeZone(timeZone: string): () => void {
    const original = process.env.TZ;
    process.env.TZ = timeZone;

    return () => {
        if (original === undefined) {
            delete process.env.TZ;
        } else {
            process.env.TZ = original;
        }
    };
}
