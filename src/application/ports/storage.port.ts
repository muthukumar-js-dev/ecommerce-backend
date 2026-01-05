import { AsyncResult } from '@shared/types/result';

export interface UploadedFile {
    url: string;
    key: string;
    size: number;
}

export interface IStorageService {
    uploadFile(
        file: Buffer,
        fileName: string,
        contentType: string
    ): AsyncResult<UploadedFile>;
    deleteFile(key: string): AsyncResult<void>;
    getSignedUrl(key: string, expiresIn?: number): AsyncResult<string>;
}
