import { shardingConfig } from '../../infrastructure/database/sharding-config';
import { ShardRouter } from '../../infrastructure/database/shard-router';
import mongoose from 'mongoose';

interface TestDocument extends mongoose.Document {
    userId: string;
    name: string;
    email: string;
}

async function testSharding(): Promise<void> {
    console.log('🧪 Testing Database Sharding...\n');

    try {
        // Initialize shards
        console.log('1️⃣  Initializing shards...');
        await shardingConfig.initializeShards();
        console.log('✅ Shards initialized\n');

        // Test shard distribution
        console.log('2️⃣  Testing shard distribution...');
        const testKeys = ['user1', 'user2', 'user3', 'user4', 'user5'];

        for (const key of testKeys) {
            const shard = shardingConfig.getShardForKey(key);
            console.log(`  Key: ${key} → Shard: ${shard.name} (${shard.id})`);
        }
        console.log('✅ Shard distribution working\n');

        // Test shard router
        console.log('3️⃣  Testing shard router...');
        const router = new ShardRouter<TestDocument>('User');

        // Test create
        console.log('  Creating test documents...');
        for (let i = 0; i < 5; i++) {
            const userId = `testuser${i}`;
            await router.create(
                {
                    userId,
                    name: `Test User ${i}`,
                    email: `test${i}@example.com`,
                },
                userId
            );
            console.log(`    ✓ Created document for ${userId}`);
        }
        console.log('✅ Documents created\n');

        // Test find
        console.log('4️⃣  Testing find operations...');
        const allDocs = await router.find({});
        console.log(`  Found ${allDocs.length} documents across all shards`);

        const specificDoc = await router.findOne({ userId: 'testuser0' }, 'testuser0');
        console.log(`  Found specific document: ${specificDoc?.name}`);
        console.log('✅ Find operations working\n');

        // Test count
        console.log('5️⃣  Testing count operations...');
        const totalCount = await router.count({});
        console.log(`  Total documents: ${totalCount}`);
        console.log('✅ Count operations working\n');

        // Test update
        console.log('6️⃣  Testing update operations...');
        await router.updateOne(
            { userId: 'testuser0' },
            { $set: { name: 'Updated User 0' } },
            'testuser0'
        );
        console.log('  ✓ Updated document');
        console.log('✅ Update operations working\n');

        // Test delete
        console.log('7️⃣  Testing delete operations...');
        for (let i = 0; i < 5; i++) {
            const userId = `testuser${i}`;
            await router.deleteOne({ userId }, userId);
            console.log(`    ✓ Deleted document for ${userId}`);
        }
        console.log('✅ Delete operations working\n');

        // Display shard statistics
        console.log('8️⃣  Shard Statistics:');
        const config = shardingConfig.getConfig();
        console.log(`  Strategy: ${config.strategy}`);
        console.log(`  Shard Key: ${config.shardKey}`);
        console.log(`  Number of Shards: ${config.numShards}`);
        console.log('  Shards:');
        for (const shard of config.shards) {
            console.log(`    - ${shard.name} (${shard.id})`);
            console.log(`      Range: ${shard.minKey}-${shard.maxKey}`);
        }

        console.log('\n✅ All sharding tests passed!');
    } catch (error) {
        console.error('\n❌ Sharding test failed:', error);
        throw error;
    } finally {
        await shardingConfig.closeAllConnections();
        console.log('\n🔌 Connections closed');
    }
}

// Run tests
testSharding()
    .then(() => {
        console.log('\n🎉 Sharding test completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Sharding test failed:', error);
        process.exit(1);
    });
