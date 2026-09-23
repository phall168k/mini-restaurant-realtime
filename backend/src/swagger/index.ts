import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerCustomOptions, SwaggerModule } from "@nestjs/swagger";
import { SWAGGER_API_ROOT, SWAGGER_AUTH_OPTIONS, SWAGGER_DESCRIPTION, SWAGGER_TITLE, SWAGGER_TOKEN_NAME } from "./config";
import { Request, Response } from "express";

export const setupSwagger = (app: INestApplication) => {
    const customOptions: SwaggerCustomOptions = {
        customSiteTitle: SWAGGER_TITLE,
        swaggerOptions: {
            persistAuthorization: true,
        },
    };

    const options = new DocumentBuilder()
        .setTitle(SWAGGER_TITLE)
        .setDescription(SWAGGER_DESCRIPTION)
        .addBearerAuth(SWAGGER_AUTH_OPTIONS, SWAGGER_TOKEN_NAME)
        .setVersion('1.0')
        .build();

    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup(SWAGGER_API_ROOT, app, document, customOptions);

    app.getHttpAdapter().getInstance().get(`${SWAGGER_API_ROOT}-json`, (_req: Request, res: Response) => {
        res.json(document);
    });
}