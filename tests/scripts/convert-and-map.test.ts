import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { TARGETS } from '../../scripts/convert-and-map.mjs';

/** A 4x4 PNG that is fully transparent: the case JPEG cannot represent. */
const transparentPng = () =>
    sharp({ create: { width: 4, height: 4, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .png()
        .toBuffer();

describe('convert-and-map TARGETS', () => {
    it('emits webp, avif and jpeg, each with its content type', () => {
        expect(TARGETS.map((t) => [t.format, t.contentType])).toEqual([
            ['webp', 'image/webp'],
            ['avif', 'image/avif'],
            ['jpeg', 'image/jpeg'],
        ]);
    });

    it('encodes a real JPEG and flattens transparency to white, not black', async () => {
        const jpeg = TARGETS.find((t) => t.format === 'jpeg')!;
        const out = await jpeg.encode(sharp(await transparentPng())).toBuffer();

        expect((await sharp(out).metadata()).format).toBe('jpeg');
        const { data } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
        expect([data[0], data[1], data[2]]).toEqual([255, 255, 255]);
    });
});
