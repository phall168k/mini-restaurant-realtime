import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MINIO_CLIENT } from './minio.constants';
import { Client } from 'minio';
import { MinioService } from './minio.service';
import { MinioController } from './minio.controller';

@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: MINIO_CLIENT,
            inject: [ConfigService],
            useFactory: (config: ConfigService) => new Client({
                endPoint: config.getOrThrow<string>('MINIO_ENDPOINT'),
                port: Number(config.get<string>('MINIO_PORT', '9000')),
                useSSL: config.get<string>('MINIO_USE_SSL', 'false') === 'true',
                accessKey: config.getOrThrow<string>('MINIO_ACCESS_KEY'),
                secretKey: config.getOrThrow<string>('MINIO_SECRET_KEY'),
            }),
        },
        MinioService,
    ],
    controllers: [MinioController]
})
export class MinioModule {}
