import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentAttachmentJsonb1790650000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // Preserve SQL NULL, empty arrays, and every existing attachment object.
    await queryRunner.query(`
      ALTER TABLE "admin"."payments"
      ALTER COLUMN "attachment" TYPE jsonb
      USING to_jsonb("attachment")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // ALTER COLUMN USING cannot contain a subquery directly.
    await queryRunner.query(`
      CREATE FUNCTION pg_temp.payment_attachment_array(value jsonb)
      RETURNS jsonb[] LANGUAGE sql IMMUTABLE STRICT AS $$
        SELECT ARRAY(SELECT jsonb_array_elements(value))
      $$
    `);
    await queryRunner.query(`
      ALTER TABLE "admin"."payments"
      ALTER COLUMN "attachment" TYPE jsonb[]
      USING pg_temp.payment_attachment_array("attachment")
    `);
    await queryRunner.query(`DROP FUNCTION pg_temp.payment_attachment_array(jsonb)`);
  }
}
