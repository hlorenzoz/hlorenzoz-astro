/**
 * Where the assistant keeps a conversation in progress for the tab (sessionStorage), so a
 * language switch, which loads a new page, can show it again. Its own module so the loader
 * can check for it without downloading React.
 */
export const CONVERSATION_KEY = 'elevenlabs-conversation';

/** True when the previous page left a conversation in progress. */
export function hasSavedConversation(): boolean {
    try {
        return sessionStorage.getItem(CONVERSATION_KEY) !== null;
    } catch {
        return false;
    }
}
