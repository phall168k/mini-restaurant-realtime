import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import { commonFields } from '../common.fields';

export class KitchenMigration1790500000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'admin.kitchens',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'order_id', type: 'integer' },
          { name: 'performed_by_id', type: 'integer' },
          {
            name: 'status',
            type: 'enum',
            enum: [
              'PENDING',
              'ACCEPTED',
              'PREPARING',
              'READY',
              'COMPLETED',
              'CANCELED',
            ],
            enumName: 'kitchen_status_enum',
            default: "'PENDING'",
          },
          { name: 'description', type: 'text', isNullable: true },
          ...commonFields,
        ],
        indices: [
          { name: 'IDX_kitchens_order_id', columnNames: ['order_id'] },
          {
            name: 'IDX_kitchens_performed_by_id',
            columnNames: ['performed_by_id'],
          },
        ],
        foreignKeys: [
          {
            columnNames: ['order_id'],
            referencedTableName: 'admin.orders',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
          {
            columnNames: ['performed_by_id'],
            referencedTableName: 'admin.users',
            referencedColumnNames: ['id'],
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
          },
        ],
      }),
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('admin.kitchens');
    await queryRunner.query(
      'DROP TYPE IF EXISTS "admin"."kitchen_status_enum"',
    );
  }
}
