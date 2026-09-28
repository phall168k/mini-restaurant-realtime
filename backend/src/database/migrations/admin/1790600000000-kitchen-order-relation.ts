import { MigrationInterface, QueryRunner } from 'typeorm';
import { KitchenOrderItemRelation1790590000000 } from './1790590000000-kitchen-order-item-relation';

export class KitchenOrderRelation1790600000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Each item maps unambiguously to its parent order; preserve all history rows.
    await new KitchenOrderItemRelation1790590000000().down(queryRunner);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Refuse ambiguous order-to-item mappings on rollback.
    await new KitchenOrderItemRelation1790590000000().up(queryRunner);
  }
}
