import { S3Adapter } from '@infrastructure/adapters/aws/s3.adapter';
import { isSuccess, isFailure } from '@shared/types/result';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3', () => ({
    S3Client: jest.fn().mockImplementation(() => ({
        send: jest.fn(),
    })),
    PutObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
    GetObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: jest.fn(),
}));

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

describe('S3Adapter', () => {
    let adapter: S3Adapter;
    let mockS3Client: any;

    beforeEach(() => {
        adapter = new S3Adapter('us-east-1', 'test-bucket');
        mockS3Client = (adapter as any).s3Client;
        jest.clearAllMocks();
    });

    describe('uploadFile', () => {
        it('should upload file successfully', async () => {
            mockS3Client.send.mockResolvedValue({});

            const fileBuffer = Buffer.from('test content');
            const result = await adapter.uploadFile(fileBuffer, 'test.txt', 'text/plain');

            expect(isSuccess(result)).toBe(true);
            if (isSuccess(result)) {
                expect(result.value.url).toContain('test-bucket.s3.amazonaws.com');
                expect(result.value.key).toContain('uploads/');
                expect(result.value.key).toContain('.txt');
                expect(result.value.size).toBe(fileBuffer.length);
            }

            expect(mockS3Client.send).toHaveBeenCalledTimes(1);
            expect(PutObjectCommand).toHaveBeenCalledWith(
                expect.objectContaining({
                    Bucket: 'test-bucket',
                    Body: fileBuffer,
                    ContentType: 'text/plain',
                })
            );
        });

        it('should handle upload failure', async () => {
            mockS3Client.send.mockRejectedValue(new Error('S3 error'));

            const fileBuffer = Buffer.from('test content');
            const result = await adapter.uploadFile(fileBuffer, 'test.txt', 'text/plain');

            expect(isFailure(result)).toBe(true);
        });

        it('should generate unique keys for different uploads', async () => {
            mockS3Client.send.mockResolvedValue({});

            const fileBuffer = Buffer.from('test');

            const result1 = await adapter.uploadFile(fileBuffer, 'test.txt', 'text/plain');
            const result2 = await adapter.uploadFile(fileBuffer, 'test.txt', 'text/plain');

            expect(isSuccess(result1) && isSuccess(result2)).toBe(true);
            if (isSuccess(result1) && isSuccess(result2)) {
                expect(result1.value.key).not.toBe(result2.value.key);
            }
        });
    });

    describe('deleteFile', () => {
        it('should delete file successfully', async () => {
            mockS3Client.send.mockResolvedValue({});

            const result = await adapter.deleteFile('uploads/test-123.txt');

            expect(isSuccess(result)).toBe(true);
            expect(mockS3Client.send).toHaveBeenCalledTimes(1);
            expect(DeleteObjectCommand).toHaveBeenCalledWith({
                Bucket: 'test-bucket',
                Key: 'uploads/test-123.txt',
            });
        });

        it('should handle delete failure', async () => {
            mockS3Client.send.mockRejectedValue(new Error('S3 error'));

            const result = await adapter.deleteFile('uploads/test-123.txt');

            expect(isFailure(result)).toBe(true);
        });
    });

    describe('getSignedUrl', () => {
        it('should generate signed URL with default expiration', async () => {
            (getSignedUrl as jest.Mock).mockResolvedValue('https://signed-url.com');

            const result = await adapter.getSignedUrl('uploads/test-123.txt');

            expect(isSuccess(result)).toBe(true);
            if (isSuccess(result)) {
                expect(result.value).toBe('https://signed-url.com');
            }

            expect(getSignedUrl).toHaveBeenCalledWith(
                mockS3Client,
                expect.any(Object),
                { expiresIn: 3600 }
            );
        });

        it('should generate signed URL with custom expiration', async () => {
            (getSignedUrl as jest.Mock).mockResolvedValue('https://signed-url.com');

            const result = await adapter.getSignedUrl('uploads/test-123.txt', 7200);

            expect(isSuccess(result)).toBe(true);
            expect(getSignedUrl).toHaveBeenCalledWith(
                mockS3Client,
                expect.any(Object),
                { expiresIn: 7200 }
            );
        });

        it('should handle signed URL generation failure', async () => {
            (getSignedUrl as jest.Mock).mockRejectedValue(new Error('S3 error'));

            const result = await adapter.getSignedUrl('uploads/test-123.txt');

            expect(isFailure(result)).toBe(true);
        });
    });
});
