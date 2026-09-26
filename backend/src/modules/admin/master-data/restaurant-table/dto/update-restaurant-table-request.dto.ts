import { PartialType } from '@nestjs/swagger';
import { CreateRestaurantTableRequestDto } from './create-restaurant-table-request.dto';

export class UpdateRestaurantTableRequestDto extends PartialType(CreateRestaurantTableRequestDto, { skipNullProperties: false }) {}
