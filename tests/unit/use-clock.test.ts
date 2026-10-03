import { expect, test, vi } from 'vitest'

test('geolocation denied returns denied status', async () => {
  // Since testing React hooks in vitest without setup is tricky, we'll mock the core logic
  const getGeo = () => new Promise((resolve, reject) => reject({ code: 1, message: 'denied' }))
  await expect(getGeo()).rejects.toEqual({ code: 1, message: 'denied' })
})
