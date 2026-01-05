import { IStorageService, UploadedFile } from '@application/ports/storage.port';
import { AsyncResult } from '@shared/types/result';
import { CircuitBreaker } from '../resilience/circuit-breaker';
import { withRetry } from '../resilience/retry';

export class ResilientStorageService implements IStorageService {
    private circuitBreaker: CircuitBreaker;

    constructor(private readonly innerService: IStorageService) {
        this.circuitBreaker = new CircuitBreaker(5, 60000, 2);
    }

    async uploadFile(
        file: Buffer,
        fileName: string,
        contentType: string
    ): AsyncResult<UploadedFile> {
        return this.circuitBreaker.execute(() =>
            withRetry(() => this.innerService.uploadFile(file, fileName, contentType), {
                maxAttempts: 3,
                delayMs: 1000,
            })
        );
    }

    async deleteFile(key: string): AsyncResult<void> {
        return this.circuitBreaker.execute(() =>
            withRetry(() => this.innerService.deleteFile(key), {
                maxAttempts: 3,
                delayMs: 1000,
            })
        );
    }

    async getSignedUrl(key: string, expiresIn?: number): AsyncResult<string> {
        return this.circuitBreaker.execute(() =>
            withRetry(() => this.innerService.getSignedUrl(key, expiresIn), {
                maxAttempts: 3,
                delayMs: 1000,
            })
        );
    }
}
