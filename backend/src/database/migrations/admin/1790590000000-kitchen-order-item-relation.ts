import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class KitchenOrderItemRelation1790590000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // An order-level record cannot be assigned safely when there are zero or
    // multiple items. Include soft-deleted rows to preserve historical records.
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM admin.kitchens k
          WHERE (SELECT COUNT(*) FROM admin.order_items oi WHERE oi.order_id = k.order_id) <> 1
        ) THEN
          RAISE EXCEPTION 'Cannot migrate kitchen records: each referenced order must have exactly one order item. Resolve legacy kitchen-to-item mappings before retrying.';
        END IF;
      END $$;
    `);
    const table = await queryRunner.getTable('admin.kitchens');
    const foreignKey = table?.foreignKeys.find((key) =>
      key.columnNames.includes('order_id'),
    );
    if (!foreignKey) throw new Error('Kitchen order foreign key not found');
    await queryRunner.dropForeignKey('admin.kitchens', foreignKey);
    await queryRunner.query(`
      UPDATE admin.kitchens k SET order_id = oi.id
      FROM admin.order_items oi WHERE oi.order_id = k.order_id
    `);
    await queryRunner.query(
      'ALTER TABLE admin.kitchens RENAME COLUMN order_id TO order_item_id',
    );
    await queryRunner.query(
      'ALTER INDEX admin."IDX_kitchens_order_id" RENAME TO "IDX_kitchens_order_item_id"',
    );
    await queryRunner.createForeignKey(
      'admin.kitchens',
      new TableForeignKey({
        name: 'FK_kitchens_order_item_id',
        columnNames: ['order_item_id'],
        referencedSchema: 'admin',
        referencedTableName: 'order_items',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(
      'admin.kitchens',
      'FK_kitchens_order_item_id',
    );
    await queryRunner.query(`
      UPDATE admin.kitchens k SET order_item_id = oi.order_id
      FROM admin.order_items oi WHERE oi.id = k.order_item_id
    `);
    await queryRunner.query(
      'ALTER TABLE admin.kitchens RENAME COLUMN order_item_id TO order_id',
    );
    await queryRunner.query(
      'ALTER INDEX admin."IDX_kitchens_order_item_id" RENAME TO "IDX_kitchens_order_id"',
    );
    await queryRunner.createForeignKey(
      'admin.kitchens',
      new TableForeignKey({
        columnNames: ['order_id'],
        referencedSchema: 'admin',
        referencedTableName: 'orders',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );
  }
}
