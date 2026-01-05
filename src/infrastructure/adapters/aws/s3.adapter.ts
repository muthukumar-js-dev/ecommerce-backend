import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IStorageService, UploadedFile } from '@application/ports/storage.port';
import { AsyncResult, success, failure } from '@shared/types/result';
import { ExternalServiceError } from '@shared/errors/external-service.error';

export class S3Adapter implements IStorageService {
    private s3Client: S3Client;
    private bucketName: string;

    constructor(region: string, bucketName: string) {
        this.s3Client = new S3Client({ region });
        this.bucketName = bucketName;
    }

    async uploadFile(
        file: Buffer,
        fileName: string,
        contentType: string
    ): AsyncResult<UploadedFile> {
        try {
            const key = this.generateKey(fileName);

            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                    Body: file,
                    ContentType: contentType,
                })
            );

            const url = `https://${this.bucketName}.s3.amazonaws.com/${key}`;

            return success({
                url,
                key,
                size: file.length,
            });
        } catch (error: any) {
            return failure(
                new ExternalServiceError('AWS S3', 'Failed to upload file', error)
            );
        }
    }

    async deleteFile(key: string): AsyncResult<void> {
        try {
            await this.s3Client.send(
                new DeleteObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                })
            );

            return success(undefined);
        } catch (error: any) {
            return failure(
                new ExternalServiceError('AWS S3', 'Failed to delete file', error)
            );
        }
    }

    async getSignedUrl(key: string, expiresIn: number = 3600): AsyncResult<string> {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });

            const url = await getSignedUrl(this.s3Client, command, { expiresIn });

            return success(url);
        } catch (error: any) {
            return failure(
                new ExternalServiceError('AWS S3', 'Failed to generate signed URL', error)
            );
        }
    }

    private generateKey(fileName: string): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const extension = fileName.split('.').pop();
        return `uploads/${timestamp}-${random}.${extension}`;
    }
}
