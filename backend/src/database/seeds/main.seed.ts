import { DataSource, In } from "typeorm";
import { type Seeder } from "typeorm-extension";
import { RoleEntity } from "../../modules/admin/system/role/entities/role.entity";
import { roles } from "./roles.seed";
import { UserEntity } from "../../modules/admin/system/user/entities/user.entity";
import { users } from "./users.seed";
import { PasswordHash } from "../../libs/utils/password-hash.util";

export default class MainSeeder implements Seeder {
    public async run(database: DataSource): Promise<void> {
        await database.transaction(async (manager) => {
           await manager.save(RoleEntity, roles);
            const userHashItems = await Promise.all(
                users.map(async (item) => ({
                    ...item,
                    password: await PasswordHash.hash(item.password),
                })),
            );
            await manager.save(UserEntity, userHashItems);
        });
    }
}
