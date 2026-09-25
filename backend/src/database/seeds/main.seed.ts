import { DataSource, In } from 'typeorm';
import { type Seeder } from 'typeorm-extension';
import { RoleEntity } from '../../modules/admin/system/role/entities/role.entity';
import { UserEntity } from '../../modules/admin/system/user/entities/user.entity';
import { PasswordHash } from '../../libs/utils/password-hash.util';
import { roles } from './roles.seed';
import { users } from './users.seed';
import { CategoryEntity } from '../../modules/admin/master-data/category/entities/category.entity';
import { categories } from './category.seed';
import { ItemEntity } from '../../modules/admin/master-data/item/entities/item.entity';
import { items } from './items.seed';

export default class MainSeeder implements Seeder {
    public async run(database: DataSource): Promise<void> {
        await database.transaction(async (manager) => {
            const roleRepository = manager.getRepository(RoleEntity);
            const userRepository = manager.getRepository(UserEntity);

            for (const item of roles) {
                const existing = await roleRepository.findOne({
                    where: { name: item.name },
                    withDeleted: true,
                });
                if (!existing) {
                    await roleRepository.save(roleRepository.create(item));
                }
            }

            for (const item of users) {
                const roleNames = [...new Set(item.roles)];
                const assignedRoles = roleNames.length
                    ? await roleRepository.findBy({ name: In(roleNames) })
                    : [];
                const missingRoles = roleNames.filter(
                    (name) => !assignedRoles.some((role) => role.name === name),
                );
                if (missingRoles.length) {
                    throw new Error(`Cannot seed user "${item.username}": missing or deleted roles: ${missingRoles.join(', ')}`);
                }

                const existing = await userRepository.findOne({
                    where: { username: item.username },
                    withDeleted: true,
                    relations: { roles: true },
                });
                // Do not restore deliberately deleted accounts on a seed rerun.
                if (existing?.deletedAt) continue;

                if (existing) {
                    const currentRoles = await existing.roles;
                    const missingAssignments = assignedRoles.filter(
                        (role) => !currentRoles.some((current) => current.id === role.id),
                    );
                    if (missingAssignments.length) {
                        await userRepository.createQueryBuilder()
                            .relation(UserEntity, 'roles')
                            .of(existing.id)
                            .add(missingAssignments.map((role) => role.id));
                    }
                    continue;
                }

                const entity = new UserEntity();
                entity.username = item.username;
                entity.password = await PasswordHash.hash(item.password);
                entity.status = item.status;
                entity.isActive = item.isActive;
                entity.profile = item.profile ?? null;
                const savedUser = await userRepository.save(entity);
                // Persist the join rows explicitly: a Promise assigned on a new
                // entity is not guaranteed to initialize TypeORM's lazy relation.
                if (assignedRoles.length) {
                    await userRepository.createQueryBuilder()
                        .relation(UserEntity, 'roles')
                        .of(savedUser.id)
                        .add(assignedRoles.map((role) => role.id));
                }
            }

            await manager.save(CategoryEntity, categories);
            await manager.save(ItemEntity, items);
        });
    }
}
