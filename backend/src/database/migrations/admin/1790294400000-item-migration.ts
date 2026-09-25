import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import { commonFields } from '../common.fields';

const tableName = 'admin.items';

export class ItemMigration1790294400000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: tableName,
            columns: [
                { 
                    name: 'id', 
                    type: 'integer', 
                    isPrimary: true, 
                    isGenerated: true, 
                    generationStrategy: 'increment' 
                },
                { 
                    name: 'category_id', 
                    type: 'integer' 
                },
                { 
                    name: 'code', 
                    type: 'varchar', 
                    length: '250', 
                    isUnique: true 
                },
                { 
                    name: 'name_en', 
                    type: 'varchar', 
                    length: '250' 
                },
                { 
                    name: 'name_kh', 
                    type: 'varchar', 
                    length: '250' 
                },
                { 
                    name: 'description', 
                    type: 'text', 
                    isNullable: true 
                },
                { 
                    name: 'unit_price', 
                    type: 'decimal', 
                    precision: 14, 
                    scale: 2, 
                    default: 0 
                },
                { 
                    name: 'discount', 
                    type: 'decimal', 
                    precision: 14, 
                    scale: 2, 
                    default: 0 
                },
                { 
                    name: 'thumbnail', 
                    type: 'jsonb', 
                    isNullable: true 
                },
                { 
                    name: 'status', 
                    type: 'boolean', 
                    default: true 
                },
                { 
                    name: 'created_by_user_id', 
                    type: 'integer', 
                },
                ...commonFields,
            ],
            foreignKeys: [
                { 
                    columnNames: ['category_id'], 
                    referencedColumnNames: ['id'], 
                    referencedTableName: 'admin.categories', 
                    onDelete: 'RESTRICT', 
                    onUpdate: 'CASCADE' 
                },
                { 
                    columnNames: ['created_by_user_id'], 
                    referencedColumnNames: ['id'], 
                    referencedTableName: 'admin.users', 
                    onDelete: 'RESTRICT', 
                    onUpdate: 'CASCADE' 
                }
            ],
            indices: [
                { 
                    name: 'IDX_items_category_id', 
                    columnNames: ['category_id'] 
                }
            ],
            checks: [
                { 
                    name: 'CHK_items_unit_price', 
                    expression: 'unit_price >= 0' 
                },
                { 
                    name: 'CHK_items_discount', 
                    expression: 'discount >= 0' 
                },
            ],
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable(tableName);
    }
}
