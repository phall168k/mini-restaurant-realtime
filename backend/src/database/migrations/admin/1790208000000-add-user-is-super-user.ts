import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserIsSuperUser1790208000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'admin.users',
      new TableColumn({
        name: 'is_super_user',
        type: 'boolean',
        isNullable: true,
        default: null,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('admin.users', 'is_super_user');
  }
}
