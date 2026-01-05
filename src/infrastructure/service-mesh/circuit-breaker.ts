export enum CircuitState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
    failureThreshold: number;
    successThreshold: number;
    timeout: number;
    resetTimeout: number;
}

/**
 * Circuit Breaker
 * Prevents cascading failures by breaking circuit on repeated failures
 */
export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount = 0;
    private successCount = 0;
    private lastFailureTime?: Date;
    private nextAttemptTime?: Date;

    constructor(
        private serviceName: string,
        private config: CircuitBreakerConfig = {
            failureThreshold: 5,
            successThreshold: 2,
            timeout: 60000,
            resetTimeout: 30000,
        }
    ) { }

    /**
     * Execute operation with circuit breaker protection
     */
    async execute<T>(operation: () => Promise<T>): Promise<T> {
        if (this.state === CircuitState.OPEN) {
            if (this.shouldAttemptReset()) {
                console.log(`🔄 Circuit breaker for ${this.serviceName}: OPEN → HALF_OPEN`);
                this.state = CircuitState.HALF_OPEN;
                this.successCount = 0;
            } else {
                throw new Error(
                    `Circuit breaker is OPEN for ${this.serviceName}. Next attempt at ${this.nextAttemptTime}`
                );
            }
        }

        try {
            const result = await this.executeWithTimeout(operation);
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    /**
     * Execute with timeout
     */
    private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
        return Promise.race([
            operation(),
            new Promise<T>((_, reject) =>
                setTimeout(() => reject(new Error('Operation timeout')), this.config.timeout)
            ),
        ]);
    }

    /**
     * Handle successful operation
     */
    private onSuccess(): void {
        this.failureCount = 0;

        if (this.state === CircuitState.HALF_OPEN) {
            this.successCount++;
            console.log(
                `✅ Circuit breaker for ${this.serviceName}: Success count ${this.successCount}/${this.config.successThreshold}`
            );

            if (this.successCount >= this.config.successThreshold) {
                console.log(`🔄 Circuit breaker for ${this.serviceName}: HALF_OPEN → CLOSED`);
                this.state = CircuitState.CLOSED;
                this.successCount = 0;
            }
        }
    }

    /**
     * Handle failed operation
     */
    private onFailure(): void {
        this.failureCount++;
        this.lastFailureTime = new Date();

        console.log(
            `❌ Circuit breaker for ${this.serviceName}: Failure count ${this.failureCount}/${this.config.failureThreshold}`
        );

        if (this.state === CircuitState.HALF_OPEN) {
            console.log(`🔄 Circuit breaker for ${this.serviceName}: HALF_OPEN → OPEN`);
            this.state = CircuitState.OPEN;
            this.successCount = 0;
            this.setNextAttemptTime();
        }

        if (this.failureCount >= this.config.failureThreshold) {
            console.log(`🔄 Circuit breaker for ${this.serviceName}: CLOSED → OPEN`);
            this.state = CircuitState.OPEN;
            this.setNextAttemptTime();
        }
    }

    /**
     * Check if should attempt reset
     */
    private shouldAttemptReset(): boolean {
        if (!this.nextAttemptTime) {
            return true;
        }
        return Date.now() >= this.nextAttemptTime.getTime();
    }

    /**
     * Set next attempt time
     */
    private setNextAttemptTime(): void {
        this.nextAttemptTime = new Date(Date.now() + this.config.resetTimeout);
    }

    /**
     * Get current state
     */
    getState(): CircuitState {
        return this.state;
    }

    /**
     * Get metrics
     */
    getMetrics(): {
        state: CircuitState;
        failureCount: number;
        successCount: number;
        lastFailureTime?: Date;
    } {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            lastFailureTime: this.lastFailureTime,
        };
    }
}
