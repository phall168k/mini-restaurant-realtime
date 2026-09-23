import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { HealthResponseDto } from './dto/health-response.dto';

@Controller({
    path: 'health'
})
export class HealthController {
    constructor(private readonly healthService: HealthService) {}

    @Get()
    @ApiOperation({ summary: 'Check application health' })
    @ApiOkResponse({ type: HealthResponseDto })
    public healthCheck(): HealthResponseDto {
        return this.healthService.healthCheck();
    }
}
