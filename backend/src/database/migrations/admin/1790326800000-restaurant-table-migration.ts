import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import { commonFields } from '../common.fields';

const tableName = 'admin.restaurant_tables';

export class RestaurantTableMigration1790326800000 implements MigrationInterface {
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
                    name: 'code', 
                    type: 'varchar', 
                    length: '250', 
                    isUnique: true 
                },
                { 
                    name: 'name', 
                    type: 'varchar', 
                    length: '250' 
                },
                { 
                    name: 'capacity', 
                    type: 'integer' 
                },
                { 
                    name: 'status', 
                    type: 'enum', 
                    enum: ['available', 'occupied', 'reserved', 'cleaning', 'inactive'], 
                    enumName: 'restaurant_table_status_enum',
                    default: "'available'" 
                },
                { 
                    name: 'note', 
                    type: 'text', 
                    isNullable: true 
                },
                { 
                    name: 'sort_order', 
                    type: 'integer', 
                    default: 0 
                },
                { 
                    name: 'active', 
                    type: 'boolean', 
                    default: true 
                },
                { 
                    name: 'created_by_user_id', 
                    type: 'integer' 
                },
                ...commonFields,
            ],
            foreignKeys: [
                { 
                    columnNames: ['created_by_user_id'], 
                    referencedColumnNames: ['id'], 
                    referencedTableName: 'admin.users', 
                    onDelete: 'RESTRICT', 
                    onUpdate: 'CASCADE' 
                }
            ],
            checks: [
                { 
                    name: 'CHK_restaurant_tables_capacity', 
                    expression: 'capacity > 0' 
                },
                { 
                    name: 'CHK_restaurant_tables_sort_order', 
                    expression: 'sort_order >= 0' 
                },
            ],
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable(tableName);
        await queryRunner.query('DROP TYPE IF EXISTS "admin"."restaurant_table_status_enum"');
    }
}
