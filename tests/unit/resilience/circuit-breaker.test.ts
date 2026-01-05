import { CircuitBreaker, CircuitState } from '@infrastructure/resilience/circuit-breaker';

describe('CircuitBreaker', () => {
    let circuitBreaker: CircuitBreaker;

    beforeEach(() => {
        circuitBreaker = new CircuitBreaker(3, 1000, 2); // threshold=3, timeout=1s, halfOpenSuccess=2
    });

    it('should start in CLOSED state', () => {
        expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should execute operation successfully when CLOSED', async () => {
        const operation = jest.fn().mockResolvedValue('success');
        const result = await circuitBreaker.execute(operation);

        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(1);
        expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should transition to OPEN after threshold failures', async () => {
        const operation = jest.fn().mockRejectedValue(new Error('failure'));

        // Fail 3 times (threshold)
        for (let i = 0; i < 3; i++) {
            try {
                await circuitBreaker.execute(operation);
            } catch (error) {
                // Expected
            }
        }

        expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should reject operations when OPEN', async () => {
        const operation = jest.fn().mockRejectedValue(new Error('failure'));

        // Trigger OPEN state
        for (let i = 0; i < 3; i++) {
            try {
                await circuitBreaker.execute(operation);
            } catch (error) {
                // Expected
            }
        }

        // Try to execute when OPEN
        await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is OPEN');
    });

    it('should transition to HALF_OPEN after timeout', async () => {
        const operation = jest.fn().mockRejectedValue(new Error('failure'));

        // Trigger OPEN state
        for (let i = 0; i < 3; i++) {
            try {
                await circuitBreaker.execute(operation);
            } catch (error) {
                // Expected
            }
        }

        expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

        // Wait for timeout
        await new Promise(resolve => setTimeout(resolve, 1100));

        // Next call should transition to HALF_OPEN
        const successOperation = jest.fn().mockResolvedValue('success');
        await circuitBreaker.execute(successOperation);

        expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);
    });

    it('should transition from HALF_OPEN to CLOSED after successful attempts', async () => {
        const failOperation = jest.fn().mockRejectedValue(new Error('failure'));
        const successOperation = jest.fn().mockResolvedValue('success');

        // Trigger OPEN state
        for (let i = 0; i < 3; i++) {
            try {
                await circuitBreaker.execute(failOperation);
            } catch (error) {
                // Expected
            }
        }

        // Wait for timeout
        await new Promise(resolve => setTimeout(resolve, 1100));

        // Execute 2 successful operations (halfOpenSuccessThreshold)
        await circuitBreaker.execute(successOperation);
        await circuitBreaker.execute(successOperation);

        expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should transition from HALF_OPEN back to OPEN on failure', async () => {
        const failOperation = jest.fn().mockRejectedValue(new Error('failure'));
        const successOperation = jest.fn().mockResolvedValue('success');

        // Trigger OPEN state
        for (let i = 0; i < 3; i++) {
            try {
                await circuitBreaker.execute(failOperation);
            } catch (error) {
                // Expected
            }
        }

        // Wait for timeout
        await new Promise(resolve => setTimeout(resolve, 1100));

        // Execute one successful operation to enter HALF_OPEN
        await circuitBreaker.execute(successOperation);
        expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);

        // Fail again
        try {
            await circuitBreaker.execute(failOperation);
        } catch (error) {
            // Expected
        }

        expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });
});
