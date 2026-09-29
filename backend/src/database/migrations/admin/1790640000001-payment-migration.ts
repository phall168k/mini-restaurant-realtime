import { MigrationInterface, QueryRunner } from 'typeorm';

export class PaymentMigration1790640000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "admin"."payment_method_enum" AS ENUM ('CASH', 'KHQR', 'CARD')`,
    );
    await queryRunner.query(
      `CREATE TYPE "admin"."payment_status_enum" AS ENUM ('COMPLETED', 'VOIDED', 'REFUNDED')`,
    );
    await queryRunner.query(`CREATE TABLE "admin"."payments" (
      "id" SERIAL PRIMARY KEY,
      "payment_no" varchar(64) NOT NULL UNIQUE,
      "order_id" integer NOT NULL UNIQUE REFERENCES "admin"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      "payment_method" "admin"."payment_method_enum" NOT NULL,
      "payment_status" "admin"."payment_status_enum" NOT NULL DEFAULT 'COMPLETED',
      "sub_total" numeric(14,2) NOT NULL,
      "discount" numeric(14,2) NOT NULL,
      "total" numeric(14,2) NOT NULL,
      "received_amount" numeric(14,2) NOT NULL,
      "change_amount" numeric(14,2) NOT NULL,
      "reference_no" varchar(250),
      "paid_by_user_id" integer NOT NULL REFERENCES "admin"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      "attachment" jsonb[],
      "created_at" timestamptz NOT NULL DEFAULT now(),
      "updated_at" timestamptz NOT NULL DEFAULT now(),
      "deleted_at" timestamptz,
      CONSTRAINT "CHK_payments_amounts" CHECK (
        sub_total >= 0 AND discount >= 0 AND discount <= sub_total
        AND total = sub_total - discount AND received_amount >= total
        AND change_amount = received_amount - total
      )
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_payments_paid_by_user_id" ON "admin"."payments" ("paid_by_user_id")`,
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "admin"."payments"`);
    await queryRunner.query(`DROP TYPE "admin"."payment_status_enum"`);
    await queryRunner.query(`DROP TYPE "admin"."payment_method_enum"`);
  }
}
