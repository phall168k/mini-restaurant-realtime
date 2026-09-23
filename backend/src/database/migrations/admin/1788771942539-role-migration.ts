import { MigrationInterface, QueryRunner, Table } from "typeorm";
import { commonFields } from "../common.fields";

const tableName = 'admin.roles';

export class RoleMigration1788771942539 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: tableName,
                columns: [
                    {
                        name: 'id',
                        type: 'integer',
                        isPrimary: true,
                        isGenerated: true,
                        isNullable: false,
                    },
                    {
                        name: 'name',
                        type: 'varchar',
                        length: '250',
                        isUnique: true,
                        isNullable: false,
                    },
                    {
                        name: 'description',
                        type: 'varchar',
                        length: '250',
                        isNullable: true,
                    },
                    {
                        name: 'status',
                        type: 'boolean',
                        default: true,
                        isNullable: false,
                    },
                    ...commonFields,
                ],
            }),
            true,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable(tableName);
        if (table) {
            for (const fk of table.foreignKeys) {
                await queryRunner.dropForeignKey(tableName, fk);
            }
            await queryRunner.dropTable(tableName);
        }
    }
}