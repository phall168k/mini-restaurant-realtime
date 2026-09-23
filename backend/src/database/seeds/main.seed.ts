import { DataSource, In } from "typeorm";
import { type Seeder } from "typeorm-extension";
import { RoleEntity } from "../../modules/admin/system/role/entities/role.entity";
import { roles } from "./roles.seed";

export default class MainSeeder implements Seeder {
    public async run(database: DataSource): Promise<void> {
        await database.transaction(async (manager) => {
           await manager.save(RoleEntity, roles);
        });
    }
}
