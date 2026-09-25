import { PartialType } from '@nestjs/swagger';
import { CreateItemRequestDto } from './create-item-request.dto';

export class UpdateItemRequestDto extends PartialType(CreateItemRequestDto, { skipNullProperties: false }) {}
