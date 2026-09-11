import { describe, it, expect, vi } from 'vitest';
import { fetchProducts } from '../api/dummyjson';

describe('Search Race Condition Prevention', () => {
  it('should abort the fetch request when signal is aborted', async () => {
    // Mock global fetch
    const fetchMock = vi.fn().mockImplementation((url, options) => {
      return new Promise((resolve, reject) => {
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        }
        // Simulate a slow network response
        setTimeout(() => {
          resolve({
            ok: true,
            json: () => Promise.resolve({ products: [], total: 0 }),
          });
        }, 100);
      });
    });

    vi.stubGlobal('fetch', fetchMock);

    const abortController = new AbortController();

    // Start the fetch
    const fetchPromise = fetchProducts({ q: 'test' }, abortController.signal);

    // Immediately abort it, as if user typed another character
    abortController.abort();

    // Expect the promise to reject with AbortError
    await expect(fetchPromise).rejects.toThrow('Aborted');

    vi.restoreAllMocks();
  });
});
