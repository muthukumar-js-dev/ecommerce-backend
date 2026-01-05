export interface RetryOptions {
    maxAttempts: number;
    delayMs: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: any) => boolean;
}

export async function withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions
): Promise<T> {
    const {
        maxAttempts,
        delayMs,
        backoffMultiplier = 2,
        shouldRetry = () => true,
    } = options;

    let lastError: any;
    let currentDelay = delayMs;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            if (attempt === maxAttempts || !shouldRetry(error)) {
                throw error;
            }

            console.log(`Retry attempt ${attempt}/${maxAttempts} after ${currentDelay}ms`);
            await sleep(currentDelay);
            currentDelay *= backoffMultiplier;
        }
    }

    throw lastError;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
