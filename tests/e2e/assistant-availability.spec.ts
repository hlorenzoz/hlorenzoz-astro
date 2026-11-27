import { test, expect, type Page } from '@playwright/test';

/**
 * On load the page asks ElevenLabs whether the agent can take a conversation (a text-only
 * socket it closes at once). Without quota the agent closes that socket with code 3000: the
 * page then shows only the WhatsApp button, never the assistant. The answer is saved for an
 * hour so the next pages do not ask again. The socket is faked here: the real one would spend
 * the agent's quota and depend on it.
 */
async function asVisitor(page: Page, agent: 'unavailable' | 'available') {
    await page.addInitScript((mode) => {
        // A real browser, not a bot: the check only runs for visitors.
        Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false });
        window.localStorage.setItem('zaraz-consent', 'true');
        const opened: string[] = [];
        (window as unknown as { __sockets: string[] }).__sockets = opened;
        class FakeSocket {
            onopen: (() => void) | null = null;
            onmessage: ((e: { data: string }) => void) | null = null;
            onclose: ((e: { code: number; reason: string }) => void) | null = null;
            onerror: (() => void) | null = null;
            constructor(url: string) {
                opened.push(url);
                setTimeout(() => {
                    this.onopen?.();
                    if (mode === 'available') this.onmessage?.({ data: JSON.stringify({ type: 'conversation_initiation_metadata' }) });
                    else this.onclose?.({ code: 3000, reason: 'The AI agent you are trying to reach is not available.' });
                }, 50);
            }
            send() {}
            close() {}
        }
        (window as unknown as { WebSocket: unknown }).WebSocket = FakeSocket;
    }, agent);
}

const sockets = (page: Page) => page.evaluate(() => (window as unknown as { __sockets: string[] }).__sockets.length);

test('without quota only the WhatsApp button shows, and the next page does not ask again', async ({ page }) => {
    await asVisitor(page, 'unavailable');
    await page.goto('/es/', { waitUntil: 'load' });

    const whatsapp = page.getByRole('link', { name: 'Escríbenos por WhatsApp' });
    await expect(whatsapp).toBeVisible();
    expect(await whatsapp.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);

    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(500);
    await expect(page.locator('[data-elevenlabs]')).toBeEmpty();
    expect(await sockets(page)).toBe(1);

    await page.goto('/es/services/', { waitUntil: 'load' });
    await expect(page.getByRole('link', { name: 'Escríbenos por WhatsApp' })).toBeVisible();
    expect(await sockets(page)).toBe(0);
});

test('without quota "Start a conversation" opens WhatsApp instead of the assistant', async ({ page, context }) => {
    await asVisitor(page, 'unavailable');
    await page.goto('/en/services/ai-voice-receptionist/', { waitUntil: 'load' });
    await expect(page.getByRole('link', { name: 'Write to us on WhatsApp' })).toBeVisible();

    const popup = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Start a conversation' }).click();
    expect((await popup).url()).toMatch(/wa\.me|whatsapp\.com/);
    await expect(page.locator('[data-elevenlabs]')).toBeEmpty();
});

test('with quota the assistant mounts as before and the WhatsApp button stays hidden', async ({ page }) => {
    await asVisitor(page, 'available');
    await page.goto('/en/', { waitUntil: 'load' });
    await page.waitForTimeout(300);
    await page.mouse.wheel(0, 2000);

    // On a phone the assistant starts shrunk to its round button; on a desktop it shows "Start a call".
    await expect(page.locator('[data-elevenlabs]').getByRole('button', { name: /^(Start a call|Expand assistant)$/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Write to us on WhatsApp' })).toBeHidden();
});
