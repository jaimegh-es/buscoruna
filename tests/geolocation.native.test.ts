import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => true),
  },
}));

vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
    getCurrentPosition: vi.fn(),
    watchPosition: vi.fn(async () => { throw new Error('no watch'); }),
    clearWatch: vi.fn(async () => undefined),
  },
}));

import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { getPosition } from '../src/utils/geolocation';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(Geolocation.watchPosition).mockImplementation(async () => { throw new Error('no watch'); });
});

function makePosition(lat = 43.3623, lon = -8.4115) {
  return { coords: { latitude: lat, longitude: lon } } as unknown as Parameters<typeof Geolocation.getCurrentPosition>[0];
}

describe('getPosition() in the native (Capacitor) app', () => {
  it('returns the device GPS position when permission is granted', async () => {
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue({ location: 'granted' } as never);
    vi.mocked(Geolocation.getCurrentPosition).mockResolvedValue(makePosition() as never);

    const result = await getPosition();

    expect(result).toEqual({ lat: 43.3623, lon: -8.4115 });
    expect(Geolocation.requestPermissions).not.toHaveBeenCalled();
    expect(Geolocation.getCurrentPosition).toHaveBeenNthCalledWith(1, { enableHighAccuracy: false, timeout: 3000, maximumAge: 600000 });
    expect(Capacitor.isNativePlatform()).toBe(true);
    expect(Capacitor.isNativePlatform).toHaveBeenCalled();
  });

  it('requests and uses the permission when it was not granted yet', async () => {
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue({ location: 'prompt' } as never);
    vi.mocked(Geolocation.requestPermissions).mockResolvedValue({ location: 'granted' } as never);
    vi.mocked(Geolocation.getCurrentPosition).mockResolvedValue(makePosition(11, 22) as never);

    const result = await getPosition();

    expect(result).toEqual({ lat: 11, lon: 22 });
    expect(Geolocation.requestPermissions).toHaveBeenCalled();
  });

  it('returns null and does not read the position when permission is denied', async () => {
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue({ location: 'denied' } as never);
    vi.mocked(Geolocation.requestPermissions).mockResolvedValue({ location: 'denied' } as never);

    const result = await getPosition();

    expect(result).toBeNull();
    expect(Geolocation.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('returns null when the plugin fails to obtain a fix', async () => {
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue({ location: 'granted' } as never);
    vi.mocked(Geolocation.getCurrentPosition).mockRejectedValue(new Error('no fix') as never);

    const result = await getPosition();

    expect(result).toBeNull();
  });

  it('retries with high accuracy when the low-accuracy fix fails', async () => {
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue({ location: 'granted' } as never);
    vi.mocked(Geolocation.getCurrentPosition)
      .mockRejectedValueOnce(new Error('no network fix') as never)
      .mockResolvedValueOnce(makePosition(43.3726, -8.4182) as never);

    const result = await getPosition();

    expect(result).toEqual({ lat: 43.3726, lon: -8.4182 });
    expect(Geolocation.getCurrentPosition).toHaveBeenNthCalledWith(2, { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 });
  });

  it('falls back to a short watch session when both one-shot attempts fail', async () => {
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue({ location: 'granted' } as never);
    vi.mocked(Geolocation.getCurrentPosition).mockRejectedValue(new Error('no fix') as never);
    vi.mocked(Geolocation.watchPosition).mockImplementation((_opts as never, callback: (...args: never[]) => void) => {
      setTimeout(() => callback({ coords: { latitude: 43.3623, longitude: -8.4115 } } as never), 10);
      return Promise.resolve('watch-1');
    });

    const result = await getPosition();

    expect(result).toEqual({ lat: 43.3623, lon: -8.4115 });
    expect(Geolocation.clearWatch).toHaveBeenCalledWith({ id: 'watch-1' });
  });

it('returns null, never hanging, when the plugin never delivers a fix', async () => {
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue({ location: 'granted' } as never);
    vi.mocked(Geolocation.getCurrentPosition).mockRejectedValue(new Error('no fix') as never);
    vi.mocked(Geolocation.watchPosition).mockImplementation(() => new Promise(() => {}) as never);

    const result = await getPosition();

    expect(result).toBeNull();
  }, 20000);

  it('does NOT fall back to the browser geolocation when the native plugin fails', async () => {
    const webGeo = vi.fn();
    Object.defineProperty(globalThis.navigator, 'geolocation', { value: webGeo, configurable: true });
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue({ location: 'granted' } as never);
    vi.mocked(Geolocation.getCurrentPosition).mockRejectedValue(new Error('no fix') as never);

    const result = await getPosition();

    expect(result).toBeNull();
    expect(webGeo).not.toHaveBeenCalled();
  });
});