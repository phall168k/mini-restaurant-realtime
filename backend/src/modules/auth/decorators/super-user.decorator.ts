import { SetMetadata } from '@nestjs/common';

export const SUPER_USER_KEY = 'superUser';

/** Restricts a controller or route to authenticated superusers. */
export const SuperUser = () => SetMetadata(SUPER_USER_KEY, true);
