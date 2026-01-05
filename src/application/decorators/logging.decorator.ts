export function LogExecution() {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const startTime = Date.now();
            const className = target.constructor.name;
            console.log(`[${className}.${propertyKey}] Starting execution`);

            try {
                const result = await originalMethod.apply(this, args);
                const duration = Date.now() - startTime;
                console.log(`[${className}.${propertyKey}] Completed in ${duration}ms`);
                return result;
            } catch (error) {
                const duration = Date.now() - startTime;
                console.error(`[${className}.${propertyKey}] Failed after ${duration}ms:`, error);
                throw error;
            }
        };

        return descriptor;
    };
}
