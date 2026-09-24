import { MigrationInterface, QueryRunner, Table } from "typeorm";
import { commonFields } from "../common.fields";

const tableName = 'admin.categories';

export class CategoryMigration1790208000001 implements MigrationInterface {

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
                        name: 'code',
                        type: 'varchar',
                        length: '250',
                        isUnique: true,
                        isNullable: false,
                    },
                    {
                        name: 'name_en',
                        type: 'varchar',
                        length: '250',
                        isUnique: true,
                        isNullable: false,
                    },
                    {
                        name: 'name_kh',
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
                    {
                        name: 'created_by_user_id',
                        type: 'integer',
                        isNullable: false,
                    },
                    ...commonFields,
                ],
                foreignKeys: [
                    {
                        columnNames: ['created_by_user_id'],
                        referencedColumnNames: ['id'],
                        referencedTableName: 'admin.users',
                        onUpdate: 'CASCADE',
                    },
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