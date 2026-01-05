import { withRetry } from '@infrastructure/resilience/retry';

describe('withRetry', () => {
    it('should return result on first successful attempt', async () => {
        const operation = jest.fn().mockResolvedValue('success');

        const result = await withRetry(operation, {
            maxAttempts: 3,
            delayMs: 100,
        });

        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
        const operation = jest
            .fn()
            .mockRejectedValueOnce(new Error('fail 1'))
            .mockRejectedValueOnce(new Error('fail 2'))
            .mockResolvedValue('success');

        const result = await withRetry(operation, {
            maxAttempts: 3,
            delayMs: 100,
        });

        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw error after max attempts', async () => {
        const operation = jest.fn().mockRejectedValue(new Error('persistent failure'));

        await expect(
            withRetry(operation, {
                maxAttempts: 3,
                delayMs: 100,
            })
        ).rejects.toThrow('persistent failure');

        expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should apply exponential backoff', async () => {
        const operation = jest
            .fn()
            .mockRejectedValueOnce(new Error('fail 1'))
            .mockRejectedValueOnce(new Error('fail 2'))
            .mockResolvedValue('success');

        const startTime = Date.now();

        await withRetry(operation, {
            maxAttempts: 3,
            delayMs: 100,
            backoffMultiplier: 2,
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Should wait 100ms + 200ms = 300ms minimum
        expect(duration).toBeGreaterThanOrEqual(300);
    });

    it('should respect shouldRetry predicate', async () => {
        const operation = jest.fn().mockRejectedValue(new Error('non-retryable'));

        await expect(
            withRetry(operation, {
                maxAttempts: 3,
                delayMs: 100,
                shouldRetry: (error) => error.message !== 'non-retryable',
            })
        ).rejects.toThrow('non-retryable');

        // Should only try once because shouldRetry returns false
        expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry only retryable errors', async () => {
        const operation = jest
            .fn()
            .mockRejectedValueOnce(new Error('retryable'))
            .mockRejectedValueOnce(new Error('non-retryable'));

        await expect(
            withRetry(operation, {
                maxAttempts: 3,
                delayMs: 100,
                shouldRetry: (error) => error.message === 'retryable',
            })
        ).rejects.toThrow('non-retryable');

        expect(operation).toHaveBeenCalledTimes(2);
    });
});
