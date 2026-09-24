import { ConfigService } from '@nestjs/config';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MINIO_CLIENT } from './minio.constants';
import { Client } from 'minio';
import { basename } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class MinioService implements OnModuleInit {
    private readonly logger = new Logger(MinioService.name);
    private readonly bucketName: string;

    constructor(
        @Inject(MINIO_CLIENT)
        private readonly minioClient: Client,
        private readonly configService: ConfigService,
    ) {
        this.bucketName = this.configService.get<string>('MINIO_BUCKET');
    }

    async onModuleInit() {
        await this.createBucketIfNoExists();
    }

    private async createBucketIfNoExists() {
        const exist = await this.minioClient.bucketExists(this.bucketName);

        if (!exist) {
            await this.minioClient.makeBucket(this.bucketName);

            this.logger.log(`MinIO bucket "${this.bucketName}" created`);
        } else {
            this.logger.log(`MinIO bucket "${this.bucketName}" connected`);
        }
    }

    public async healthCheck() {
        try {
        const bucketExists =
            await this.minioClient.bucketExists(
            this.bucketName,
            );

        return {
            status: 'ok',
            service: 'minio',
            connected: true,
            bucket: this.bucketName,
            bucketExists,
            timestamp: new Date().toISOString(),
        };
        } catch (error) {
        this.logger.error(
            'MinIO health check failed',
            error,
        );

        throw error;
        }
    }

    public async uploadFile(file: Express.Multer.File) {
        const originalName = basename(file.originalname)
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9._-]/g, '');
        
        const objectName = `uploads/${randomUUID()}-${originalName}`;

        await this.minioClient.putObject(
            this.bucketName,
            objectName,
            file.buffer,
            file.size,
            {
                'Content-Type': file.mimetype,
            },
        );

        return {
            bucket: this.bucketName,
            objectName,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
        };
    }

    public async getFile(objectName: string) {
        return this.minioClient.getObject(
            this.bucketName,
            objectName,
        );
    }

    public async getFileInfo(objectName: string) {
        return this.minioClient.statObject(
            this.bucketName,
            objectName,
        );
    }

    public async deleteFile(objectName: string) {
        await this.minioClient.removeObject(
            this.bucketName,
            objectName,
        );

        return {
            message: 'File deleted successfully',
            objectName,
        };
    }

    public async fileExists(objectName: string): Promise<boolean> {
        try {
            await this.minioClient.statObject(
                this.bucketName,
                objectName,
            );

            return true;
        } catch {
            return false;
        }
    }

    public async getPresignedUrl(
        objectName: string,
        expires = 3600,
    ) {
        return this.minioClient.presignedGetObject(
            this.bucketName,
            objectName,
            expires,
        );
    }




}
