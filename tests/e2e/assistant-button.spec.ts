import { test, expect } from '@playwright/test';

/**
 * The AI Voice Receptionist page lets a visitor talk to the site's own
 * assistant. The assistant normally mounts on scroll (and never for bots, so
 * Lighthouse stays clean); a click on "Start a conversation" is an explicit
 * request, so it mounts the assistant at once and puts the focus on its start
 * button. The microphone is only requested when the visitor presses that one.
 */
test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('zaraz-consent', 'true'));
});

test('Start a conversation opens the assistant and focuses its start button', async ({ page }) => {
    await page.goto('/en/services/ai-voice-receptionist/', { waitUntil: 'load' });
    const container = page.locator('[data-elevenlabs]');
    await expect(container).toBeEmpty();

    await page.getByRole('button', { name: 'Start a conversation' }).click();

    const start = container.getByRole('button', { name: 'Start a call' });
    await expect(start).toBeVisible();
    await expect(start).toBeFocused();
});

test('on a phone it expands the shrunk assistant before focusing it', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/services/ai-voice-receptionist/', { waitUntil: 'load' });

    await page.getByRole('button', { name: 'Start a conversation' }).click();

    await expect(page.locator('[data-elevenlabs]').getByRole('button', { name: 'Start a call' })).toBeFocused();
});
