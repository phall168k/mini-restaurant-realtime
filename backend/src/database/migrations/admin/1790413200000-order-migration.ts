import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import { commonFields } from '../common.fields';

export class OrderMigration1790413200000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'admin.orders',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'order_number',
            type: 'varchar',
            length: '250',
            isUnique: true,
          },
          { name: 'table_id', type: 'integer' },
          {
            name: 'status',
            type: 'enum',
            enum: [
              'DRAFT',
              'PENDING',
              'PREPARING',
              'READY',
              'SERVED',
              'PAID',
              'CANCELED',
            ],
            enumName: 'order_status_enum',
            default: "'PENDING'",
          },
          {
            name: 'discount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          { name: 'note', type: 'text', isNullable: true },
          { name: 'created_by_user_id', type: 'integer' },
          ...commonFields,
        ],
        indices: [{ name: 'IDX_orders_table_id', columnNames: ['table_id'] }],
        checks: [{ name: 'CHK_orders_discount', expression: 'discount >= 0' }],
        foreignKeys: [
          {
            columnNames: ['table_id'],
            referencedTableName: 'admin.restaurant_tables',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          {
            columnNames: ['created_by_user_id'],
            referencedTableName: 'admin.users',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
        ],
      }),
    );
    await queryRunner.createTable(
      new Table({
        name: 'admin.order_items',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'order_id', type: 'integer' },
          { name: 'item_id', type: 'integer' },
          { name: 'quantity', type: 'integer' },
          { name: 'unit_price', type: 'decimal', precision: 14, scale: 2 },
          {
            name: 'discount',
            type: 'decimal',
            precision: 12,
            scale: 2,
            default: 0,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELED'],
            enumName: 'order_item_status_enum',
            default: "'PENDING'",
          },
          { name: 'note', type: 'text', isNullable: true },
          ...commonFields,
        ],
        indices: [
          { name: 'IDX_order_items_order_id', columnNames: ['order_id'] },
          { name: 'IDX_order_items_item_id', columnNames: ['item_id'] },
        ],
        checks: [
          { name: 'CHK_order_items_quantity', expression: 'quantity > 0' },
          { name: 'CHK_order_items_unit_price', expression: 'unit_price >= 0' },
          { name: 'CHK_order_items_discount', expression: 'discount >= 0' },
        ],
        foreignKeys: [
          {
            columnNames: ['order_id'],
            referencedTableName: 'admin.orders',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
          },
          {
            columnNames: ['item_id'],
            referencedTableName: 'admin.items',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
        ],
      }),
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('admin.order_items');
    await queryRunner.dropTable('admin.orders');
    await queryRunner.query(
      'DROP TYPE IF EXISTS "admin"."order_item_status_enum"',
    );
    await queryRunner.query('DROP TYPE IF EXISTS "admin"."order_status_enum"');
  }
}
