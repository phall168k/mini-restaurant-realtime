import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateKitchenRequestDto } from './create-kitchen-request.dto';
export class UpdateKitchenRequestDto extends PartialType(
  OmitType(CreateKitchenRequestDto, ['performedById'] as const),
  { skipNullProperties: false },
) {}
