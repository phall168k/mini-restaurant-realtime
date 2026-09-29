import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDraftOrderItemStatus1790640000000 implements MigrationInterface {
  // Recreate the enum so the backfill can use DRAFT within the same transaction.
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "admin"."order_item_status_enum" RENAME TO "order_item_status_enum_old"`);
    await queryRunner.query(`CREATE TYPE "admin"."order_item_status_enum" AS ENUM ('DRAFT', 'PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELED')`);
    await queryRunner.query(`ALTER TABLE "admin"."order_items" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "admin"."order_items" ALTER COLUMN "status" TYPE "admin"."order_item_status_enum" USING "status"::text::"admin"."order_item_status_enum"`);
    await queryRunner.query(`ALTER TABLE "admin"."order_items" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
    await queryRunner.query(`DROP TYPE "admin"."order_item_status_enum_old"`);
    await queryRunner.query(`UPDATE "admin"."order_items" AS item SET "status" = 'DRAFT' FROM "admin"."orders" AS orders WHERE item."order_id" = orders."id" AND orders."status" = 'DRAFT'`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "admin"."order_items" SET "status" = 'PENDING' WHERE "status" = 'DRAFT'`);
    await queryRunner.query(`ALTER TYPE "admin"."order_item_status_enum" RENAME TO "order_item_status_enum_old"`);
    await queryRunner.query(`CREATE TYPE "admin"."order_item_status_enum" AS ENUM ('PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELED')`);
    await queryRunner.query(`ALTER TABLE "admin"."order_items" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "admin"."order_items" ALTER COLUMN "status" TYPE "admin"."order_item_status_enum" USING "status"::text::"admin"."order_item_status_enum"`);
    await queryRunner.query(`ALTER TABLE "admin"."order_items" ALTER COLUMN "status" SET DEFAULT 'PENDING'`);
    await queryRunner.query(`DROP TYPE "admin"."order_item_status_enum_old"`);
  }
}
