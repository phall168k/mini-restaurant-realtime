import { MigrationInterface, QueryRunner, Table } from "typeorm";

const tableName = 'admin.users_roles';
const userTable = 'admin.users';
const roleTable = 'admin.roles';

export class UserRoleMigration1788771942541 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: tableName,
                columns: [
                    {
                        name: 'user_id',
                        type: 'integer',
                        isPrimary: true,
                        isNullable: false,
                    },
                    {
                        name: 'role_id',
                        type: 'integer',
                        isPrimary: true,
                        isNullable: false,
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ['user_id'],
                        referencedColumnNames: ['id'],
                        referencedTableName: userTable,
                        onUpdate: 'CASCADE',
                    },
                    {
                        columnNames: ['role_id'],
                        referencedColumnNames: ['id'],
                        referencedTableName: roleTable,
                        onUpdate: 'CASCADE',
                    },
                ],
            }),
            true,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable(tableName, true, true);
    }

}