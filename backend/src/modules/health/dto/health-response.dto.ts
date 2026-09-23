import { ApiProperty } from "@nestjs/swagger";

export class HealthResponseDto {
    @ApiProperty({ example: 'healthy' })
    status: string;

    @ApiProperty({ example: 24.855660759 })
    uptime: number;
}