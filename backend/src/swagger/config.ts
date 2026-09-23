import { SecuritySchemeObject } from "@nestjs/swagger";

export const SWAGGER_API_ROOT = 'api/docs';
export const SWAGGER_TITLE = 'MINI Restaurant Management System';
export const SWAGGER_DESCRIPTION = 'MINI Restaurant Management System';
export const SWAGGER_VERSION = '1.0.0';
export const SWAGGER_SERVER = 'v1';
export const SWAGGER_SITE_TITLE = 'MINI Restaurant Management System';
export const SWAGGER_TOKEN_NAME = 'access-token';
export const SWAGGER_AUTH_OPTIONS: SecuritySchemeObject = {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'Bearer',
}