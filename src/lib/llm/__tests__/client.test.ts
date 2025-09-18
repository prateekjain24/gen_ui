import { retryWithExponentialBackoff } from '@/lib/llm/client';

describe('retryWithExponentialBackoff', () => {
  it('retries the specified number of times with exponential delays', async () => {
    const operation = jest
      .fn<Promise<string>, [number]>()
      .mockRejectedValueOnce(new Error('first'))
      .mockRejectedValueOnce(new Error('second'))
      .mockResolvedValue('success');

    const sleep = jest.fn().mockResolvedValue(undefined);
    const random = jest.fn().mockReturnValue(0);

    const result = await retryWithExponentialBackoff(operation, {
      maxAttempts: 3,
      initialDelay: 100,
      maxDelay: 500,
      backoffMultiplier: 2,
      jitterRatio: 0.2,
      sleep,
      random,
    });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
    expect(operation).toHaveBeenNthCalledWith(1, 1);
    expect(operation).toHaveBeenNthCalledWith(2, 2);
    expect(operation).toHaveBeenNthCalledWith(3, 3);

    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenNthCalledWith(1, Math.round(100 * 0.8));
    expect(sleep).toHaveBeenNthCalledWith(2, Math.round(200 * 0.8));
  });

  it('stops retrying when shouldRetry returns false', async () => {
    const error = new Error('no retry');
    const operation = jest.fn().mockRejectedValue(error);
    const sleep = jest.fn();

    await expect(
      retryWithExponentialBackoff(operation, {
        maxAttempts: 3,
        initialDelay: 100,
        maxDelay: 500,
        backoffMultiplier: 2,
        jitterRatio: 0,
        sleep,
        random: () => 0,
      }, {
        shouldRetry: () => false,
      })
    ).rejects.toBe(error);

    expect(operation).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
