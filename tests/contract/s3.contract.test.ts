
import { S3Adapter } from '../../src/infrastructure/adapters/aws/s3.adapter';
import nock from 'nock';

describe('S3 Contract Tests', () => {
    let s3Adapter: S3Adapter;
    const region = 'us-east-1';
    const bucketName = 'test-bucket';
    const testFile = Buffer.from('test content');
    const fileName = 'test.jpg';
    const contentType = 'image/jpeg';

    beforeAll(() => {
        // Set fake credentials for the test to prevent SDK from looking for real ones
        process.env.AWS_ACCESS_KEY_ID = 'test-key';
        process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
        process.env.AWS_REGION = region;

        s3Adapter = new S3Adapter(region, bucketName);
    });

    afterAll(() => {
        nock.cleanAll();
        delete process.env.AWS_ACCESS_KEY_ID;
        delete process.env.AWS_SECRET_ACCESS_KEY;
        delete process.env.AWS_REGION;
    });

    afterEach(() => {
        nock.cleanAll();
    });

    describe('Upload File', () => {
        it('should upload file successfully and return location', async () => {
            // Mock the S3 PUT request
            // The adapter generates a key: uploads/timestamp-random.ext
            // We use a regex to match the path
            const scope = nock(`https://${bucketName}.s3.${region}.amazonaws.com`)
                .put(/uploads\/.*\.jpg/)
                .reply(200);

            const result = await s3Adapter.uploadFile(testFile, fileName, contentType);

            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.url).toContain(`https://${bucketName}.s3.amazonaws.com/uploads/`);
                expect(result.data.key).toMatch(/uploads\/.*\.jpg/);
                expect(result.data.size).toBe(testFile.length);
            }

            expect(scope.isDone()).toBe(true);
        });

        it('should handle upload errors', async () => {
            const scope = nock(`https://${bucketName}.s3.${region}.amazonaws.com`)
                .put(/uploads\/.*\.jpg/)
                .reply(500, 'Internal Server Error');

            const result = await s3Adapter.uploadFile(testFile, fileName, contentType);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('Failed to upload file');
            }
        });
    });

    describe('Delete File', () => {
        it('should delete file successfully', async () => {
            const key = 'uploads/test-file.jpg';

            const scope = nock(`https://${bucketName}.s3.${region}.amazonaws.com`)
                .delete(`/${key}`)
                .reply(204);

            const result = await s3Adapter.deleteFile(key);

            expect(result.success).toBe(true);
            expect(scope.isDone()).toBe(true);
        });

        it('should handle delete errors', async () => {
            const key = 'uploads/test-file.jpg';

            const scope = nock(`https://${bucketName}.s3.${region}.amazonaws.com`)
                .delete(`/${key}`)
                .reply(403, 'Forbidden');

            const result = await s3Adapter.deleteFile(key);

            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.message).toContain('Failed to delete file');
            }
        });
    });

    describe('Get Signed URL', () => {
        it('should generate a signed URL locally', async () => {
            const key = 'uploads/test-file.jpg';

            // getSignedUrl is typically a local operation with the credentials we set
            const result = await s3Adapter.getSignedUrl(key);

            expect(result.success).toBe(true);
            if (result.success) {
                // The URL should contain the bucket hostname and params
                expect(result.data).toContain(`https://${bucketName}.s3.${region}.amazonaws.com/${key}`);
                expect(result.data).toContain('X-Amz-Algorithm');
                expect(result.data).toContain('X-Amz-Credential');
                expect(result.data).toContain('X-Amz-Signature');
            }
        });
    });
});
