import { Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MinioService } from './minio.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { type Response } from 'express';
import { SWAGGER_TOKEN_NAME } from '../swagger/config';

@ApiTags('MinIO')
@ApiBearerAuth(SWAGGER_TOKEN_NAME)
@ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
@Controller({
    path: 'minio',
    version: '1',
})
export class MinioController {
    constructor(private readonly minioService: MinioService) {}

    // ==========================
    // Health Check
    // ==========================
    @Get('health/live')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Check MinIO connection',
    })
    @ApiResponse({
        status: 200,
        description: 'MinIO is healthy',
        schema: {
        example: {
            status: 'ok',
            service: 'minio',
            connected: true,
            bucket: 'mini-inventory',
            bucketExists: true,
            timestamp: '2026-09-07T07:00:00.000Z',
        },
        },
    })
    @ApiResponse({
        status: 503,
        description: 'MinIO is unavailable',
    })
    public async healthCheck() {
        return this.minioService.healthCheck();
    }

    // ==========================
    // Upload
    // ==========================
    
    @Post('upload')
    @ApiOperation({
        summary: 'Upload file to MinIO',
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
        type: 'object',
        properties: {
            file: {
            type: 'string',
            format: 'binary',
            },
        },
        required: ['file'],
        },
    })
    @ApiResponse({
        status: 201,
        description: 'File uploaded successfully',
    })
    @UseInterceptors(
        FileInterceptor('file', {
            limits: {
                fileSize: 10 * 1024 * 1024,
            },
        }),
    )
    public async upload(
        @UploadedFile()
        file: Express.Multer.File,
    ) {
        return this.minioService.uploadFile(file);
    }

    // ==========================
    // Get File
    // ==========================
    
    @Get('file')
    @ApiOperation({
        summary: 'Download or display file',
    })
    @ApiQuery({
        name: 'name',
        example:
        'uploads/a123-product.jpg',
    })
    @ApiResponse({
        status: 200,
        description: 'File returned successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'File not found',
    })
    public async getFile(
        @Query('name') 
        objectName: string,

        @Res()
        response: Response,
    ) {
        const exists = await this.minioService.fileExists(objectName);

        if (exists) {
            throw new NotFoundException('File not found');
        }

        const fileInfo = await this.minioService.getFileInfo(objectName);

        const stream = await this.minioService.getFile(objectName);

        const contentType = fileInfo.metaData?.['content-type'] ?? 'application/octet-stream';

        response.setHeader(
            'Content-Type',
            fileInfo.size,
        );

        stream.pipe(response);
    }

    // ==========================
    // File Exists
    // ==========================

    @Get('exists')
    @ApiOperation({
        summary: 'Check if file exists',
    })
    @ApiQuery({
        name: 'name',
        example:
        'uploads/a123-product.jpg',
    })
    public async exists(
        @Query('name')
        objectName: string,
    ) {
        return {
        exists:
            await this.minioService.fileExists(
            objectName,
            ),
        };
    }

    // ==========================
    // Presigned URL
    // ==========================
    
    @Get('presigned-url')
    @ApiOperation({
        summary: 'Generate temporary file URL',
    })
    @ApiQuery({
        name: 'name',
        example:
        'uploads/a123-product.jpg',
    })
    public async getPresignedUrl(
        @Query('name')
        objectName: string,
    ) {
        const url =
        await this.minioService.getPresignedUrl(
            objectName,
        );

        return {
        url,
        };
    }

    // ==========================
    // Delete
    // ==========================

    @Delete('file')
    @ApiOperation({
        summary: 'Delete file',
    })
    @ApiQuery({
        name: 'name',
        example:
        'uploads/a123-product.jpg',
    })
    @ApiResponse({
        status: 200,
        description: 'File deleted successfully',
    })
    public async delete(
        @Query('name')
        objectName: string,
    ) {
        return this.minioService.deleteFile(
        objectName,
        );
    }
}
