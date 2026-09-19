import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import {
  generateDerivatives,
  processUploadedImage,
  readOrientedSize,
  type ObjectStore
} from '@/lib/images/process'

const UUID = '3f2b8c1e-9d4a-4f6b-8a21-5c7e9b0d1f23'

class MemoryStore implements ObjectStore {
  objects = new Map<string, { body: Buffer; contentType: string }>()
  log: string[] = []
  failOnPut: string | null = null

  async get(key: string) {
    const object = this.objects.get(key)
    if (!object) throw new Error(`NoSuchKey: ${key}`)
    return object.body
  }

  async put(key: string, body: Buffer, contentType: string) {
    if (this.failOnPut && key.endsWith(this.failOnPut)) {
      throw new Error(`put failed: ${key}`)
    }
    this.objects.set(key, { body, contentType })
    this.log.push(`put ${key}`)
  }

  async copy(fromKey: string, toKey: string, contentType: string) {
    const object = this.objects.get(fromKey)
    if (!object) throw new Error(`NoSuchKey: ${fromKey}`)
    this.objects.set(toKey, { body: object.body, contentType })
    this.log.push(`copy ${fromKey} -> ${toKey}`)
  }

  async delete(key: string) {
    this.objects.delete(key)
    this.log.push(`delete ${key}`)
  }
}

async function fixture(
  width: number,
  height: number,
  options: { orientation?: number; format?: 'jpeg' | 'png' } = {}
) {
  let image = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 80, b: 40 }
    }
  })
  if (options.orientation) {
    image = image.withMetadata({ orientation: options.orientation })
  }
  return options.format === 'png'
    ? image.png().toBuffer()
    : image.jpeg().toBuffer()
}

async function widthOf(store: MemoryStore, key: string) {
  const meta = await sharp(store.objects.get(key)!.body).metadata()
  return meta.width
}

describe('image processing', { timeout: 60_000 }, () => {
  describe('readOrientedSize', () => {
    it('returns the stored size for an unrotated image', async () => {
      expect(await readOrientedSize(await fixture(1200, 800))).toEqual({
        width: 1200,
        height: 800
      })
    })

    it('swaps width and height for EXIF orientation 6', async () => {
      const rotated = await fixture(1200, 800, { orientation: 6 })
      expect(await readOrientedSize(rotated)).toEqual({
        width: 800,
        height: 1200
      })
    })
  })

  describe('generateDerivatives', () => {
    it('writes exact tiers in both formats, then the LQIP last', async () => {
      const store = new MemoryStore()
      const key = `${UUID}_1200x800.jpeg`
      const written = await generateDerivatives(
        store,
        key,
        await fixture(1200, 800)
      )

      const expected = [
        `_derived/${key}/w480.avif`,
        `_derived/${key}/w480.webp`,
        `_derived/${key}/w960.avif`,
        `_derived/${key}/w960.webp`,
        `_derived/${key}/w1200.avif`,
        `_derived/${key}/w1200.webp`,
        `_derived/${key}/lqip.webp`
      ]
      expect(written).toEqual(expected)
      expect(store.log).toEqual(expected.map((k) => `put ${k}`))

      expect(await widthOf(store, `_derived/${key}/w480.avif`)).toBe(480)
      expect(await widthOf(store, `_derived/${key}/w960.webp`)).toBe(960)
      expect(await widthOf(store, `_derived/${key}/w1200.avif`)).toBe(1200)
      expect(await widthOf(store, `_derived/${key}/lqip.webp`)).toBe(24)

      expect(store.objects.get(`_derived/${key}/w480.avif`)!.contentType).toBe(
        'image/avif'
      )
      expect(store.objects.get(`_derived/${key}/w480.webp`)!.contentType).toBe(
        'image/webp'
      )
      expect(store.objects.get(`_derived/${key}/lqip.webp`)!.contentType).toBe(
        'image/webp'
      )
    })

    it('uses the four standard tiers for a legacy key and never upscales', async () => {
      const store = new MemoryStore()
      await generateDerivatives(store, 'legacy.jpeg', await fixture(600, 400))

      expect(await widthOf(store, '_derived/legacy.jpeg/w480.webp')).toBe(480)
      expect(await widthOf(store, '_derived/legacy.jpeg/w960.webp')).toBe(600)
      expect(await widthOf(store, '_derived/legacy.jpeg/w1440.avif')).toBe(600)
      expect(await widthOf(store, '_derived/legacy.jpeg/w2400.avif')).toBe(600)
      expect(store.log.at(-1)).toBe('put _derived/legacy.jpeg/lqip.webp')
    })

    it('bakes in the EXIF rotation and strips the orientation tag', async () => {
      const store = new MemoryStore()
      const key = `${UUID}_800x1200.jpeg`
      await generateDerivatives(
        store,
        key,
        await fixture(1200, 800, { orientation: 6 })
      )

      const meta = await sharp(
        store.objects.get(`_derived/${key}/w480.webp`)!.body
      ).metadata()
      expect(meta.width).toBe(480)
      expect(meta.height).toBe(720)
      expect(meta.orientation).toBeUndefined()
    })

    it('keeps transparency for PNG sources', async () => {
      const store = new MemoryStore()
      const transparent = await sharp({
        create: {
          width: 500,
          height: 500,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      })
        .png()
        .toBuffer()
      await generateDerivatives(store, `${UUID}_500x500.png`, transparent)

      const meta = await sharp(
        store.objects.get(`_derived/${UUID}_500x500.png/w480.webp`)!.body
      ).metadata()
      expect(meta.hasAlpha).toBe(true)
    })
  })

  describe('processUploadedImage', () => {
    it('writes derivatives, renames the original, then deletes the temp key', async () => {
      const store = new MemoryStore()
      const original = await fixture(1200, 800)
      store.objects.set(`tmp/${UUID}.jpeg`, {
        body: original,
        contentType: 'image/jpeg'
      })

      const result = await processUploadedImage(store, `tmp/${UUID}.jpeg`)

      expect(result).toEqual({
        key: `${UUID}_1200x800.jpeg`,
        publicUrl: `https://static.yancey.app/${UUID}_1200x800.jpeg`,
        width: 1200,
        height: 800
      })
      const final = store.objects.get(`${UUID}_1200x800.jpeg`)!
      expect(final.contentType).toBe('image/jpeg')
      expect(final.body.equals(original)).toBe(true)
      expect(store.objects.has(`tmp/${UUID}.jpeg`)).toBe(false)
      expect(
        store.objects.has(`_derived/${UUID}_1200x800.jpeg/lqip.webp`)
      ).toBe(true)
      expect(store.log.slice(-2)).toEqual([
        `copy tmp/${UUID}.jpeg -> ${UUID}_1200x800.jpeg`,
        `delete tmp/${UUID}.jpeg`
      ])
    })

    it('names the final key after the EXIF-oriented size', async () => {
      const store = new MemoryStore()
      store.objects.set(`tmp/${UUID}.jpeg`, {
        body: await fixture(1200, 800, { orientation: 6 }),
        contentType: 'image/jpeg'
      })

      const result = await processUploadedImage(store, `tmp/${UUID}.jpeg`)
      expect(result.key).toBe(`${UUID}_800x1200.jpeg`)
    })

    it('refuses keys outside tmp/ without touching the store', async () => {
      const store = new MemoryStore()
      await expect(processUploadedImage(store, 'abc.jpeg')).rejects.toThrow(
        'Not a temporary upload key'
      )
      expect(store.log).toEqual([])
    })

    it('keeps the temp object and publishes nothing when a write fails', async () => {
      const store = new MemoryStore()
      store.failOnPut = 'lqip.webp'
      store.objects.set(`tmp/${UUID}.jpeg`, {
        body: await fixture(600, 400),
        contentType: 'image/jpeg'
      })

      await expect(
        processUploadedImage(store, `tmp/${UUID}.jpeg`)
      ).rejects.toThrow('put failed')
      expect(store.objects.has(`tmp/${UUID}.jpeg`)).toBe(true)
      expect(store.objects.has(`${UUID}_600x400.jpeg`)).toBe(false)
    })
  })
})
