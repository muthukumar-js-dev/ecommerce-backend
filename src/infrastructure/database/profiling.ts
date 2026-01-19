import mongoose from 'mongoose';

export interface SlowQuery {
    op: string;
    ns: string;
    millis: number;
    ts: Date;
    command: any;
    planSummary?: string;
    nreturned?: number;
    responseLength?: number;
}

export async function enableProfiling(slowms: number = 100): Promise<void> {
    const db = mongoose.connection.db;
    if (!db) {
        throw new Error('Database connection not established');
    }

    try {
        // Set profiling level
        // 0 = off, 1 = slow queries only, 2 = all queries
        await db.command({
            profile: 1,
            slowms,
        });

        console.log(`✅ Database profiling enabled (slowms: ${slowms}ms)`);
    } catch (error: unknown) {
        console.error('Failed to enable profiling:', error);
        throw error;
    }
}

export async function disableProfiling(): Promise<void> {
    const db = mongoose.connection.db;
    if (!db) {
        throw new Error('Database connection not established');
    }

    try {
        await db.command({ profile: 0 });
        console.log('✅ Database profiling disabled');
    } catch (error: unknown) {
        console.error('Failed to disable profiling:', error);
        throw error;
    }
}

export async function getProfilingStatus(): Promise<any> {
    const db = mongoose.connection.db;
    if (!db) {
        throw new Error('Database connection not established');
    }

    try {
        const status = await db.command({ profile: -1 });
        return status;
    } catch (error: unknown) {
        console.error('Failed to get profiling status:', error);
        throw error;
    }
}

export async function getSlowQueries(limit: number = 10): Promise<SlowQuery[]> {
    const db = mongoose.connection.db;
    if (!db) {
        throw new Error('Database connection not established');
    }

    try {
        const slowQueries = await db
            .collection('system.profile')
            .find({ millis: { $gt: 100 } })
            .sort({ ts: -1 })
            .limit(limit)
            .toArray();

        return slowQueries.map(q => ({
            op: q.op,
            ns: q.ns,
            millis: q.millis,
            ts: q.ts,
            command: q.command,
            planSummary: q.planSummary,
            nreturned: q.nreturned,
            responseLength: q.responseLength,
        })) as SlowQuery[];
    } catch (error: unknown) {
        console.error('Failed to get slow queries:', error);
        return [];
    }
}

export async function analyzeQueryPerformance(): Promise<void> {
    const slowQueries = await getSlowQueries(20);

    if (slowQueries.length === 0) {
        console.log('✅ No slow queries detected');
        return;
    }

    console.log(`⚠️  Found ${slowQueries.length} slow queries:\n`);

    slowQueries.forEach((query, index) => {
        console.log(`${index + 1}. ${query.op} on ${query.ns}`);
        console.log(`   Duration: ${query.millis}ms`);
        console.log(`   Timestamp: ${query.ts.toISOString()}`);

        if (query.command) {
            console.log(`   Command: ${JSON.stringify(query.command, null, 2)}`);
        }

        if (query.planSummary) {
            console.log(`   Plan: ${query.planSummary}`);
        }

        if (query.nreturned !== undefined) {
            console.log(`   Returned: ${query.nreturned} documents`);
        }

        console.log('');
    });
}

export async function clearProfilingData(): Promise<void> {
    const db = mongoose.connection.db;
    if (!db) {
        throw new Error('Database connection not established');
    }

    try {
        await db.collection('system.profile').deleteMany({});
        console.log('✅ Profiling data cleared');
    } catch (error: unknown) {
        console.error('Failed to clear profiling data:', error);
        throw error;
    }
}

export async function explainQuery(
    collectionName: string,
    query: any
): Promise<any> {
    const db = mongoose.connection.db;
    if (!db) {
        throw new Error('Database connection not established');
    }

    try {
        const collection = db.collection(collectionName);
        const explanation = await collection.find(query).explain('executionStats');

        console.log('Query Explanation:');
        console.log(`Collection: ${collectionName}`);
        console.log(`Query: ${JSON.stringify(query)}`);
        console.log(`Execution time: ${explanation.executionStats.executionTimeMillis}ms`);
        console.log(`Documents examined: ${explanation.executionStats.totalDocsExamined}`);
        console.log(`Documents returned: ${explanation.executionStats.nReturned}`);
        console.log(`Index used: ${explanation.executionStats.executionStages.indexName ?? 'COLLSCAN'}`);

        return explanation;
    } catch (error: unknown) {
        console.error('Failed to explain query:', error);
        throw error;
    }
}
