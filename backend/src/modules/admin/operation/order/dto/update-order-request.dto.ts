import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateOrderRequestDto } from './create-order-request.dto';
/** Supplying items replaces all existing lines; omitting items preserves them. */
export class UpdateOrderRequestDto extends PartialType(
  OmitType(CreateOrderRequestDto, ['createdByUserId'] as const),
  { skipNullProperties: false },
) {}
