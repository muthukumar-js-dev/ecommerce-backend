import { getCDNService } from '../../infrastructure/cdn/cdn.service';
import * as fs from 'fs';
import * as path from 'path';

async function invalidateCache(): Promise<void> {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.error('Usage: npm run cdn:invalidate -- <path1> <path2> ...');
        console.error('Example: npm run cdn:invalidate -- /images/* /css/*');
        process.exit(1);
    }

    try {
        const cdnService = getCDNService();
        const invalidationId = await cdnService.invalidateCache(args);

        console.log('✅ Cache invalidation initiated');
        console.log(`Invalidation ID: ${invalidationId}`);
        console.log(`Paths: ${args.join(', ')}`);
    } catch (error) {
        console.error('❌ Failed to invalidate cache:', error);
        process.exit(1);
    }
}

invalidateCache();
