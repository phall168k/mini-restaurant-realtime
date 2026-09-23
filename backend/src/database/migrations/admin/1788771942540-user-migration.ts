import { MigrationInterface, QueryRunner, Table } from 'typeorm';
import { commonFields } from '../common.fields';

const tableName = 'admin.users';

export class UserMigration1788771942540 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: tableName,
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { 
            name: 'username', 
            type: 'varchar', 
            length: '250', 
            isUnique: true 
          },
          { 
            name: 'password', 
            type: 'varchar', 
            length: '255' 
          },
          { 
            name: 'status', 
            type: 'boolean', 
            default: false 
          },
          { 
            name: 'is_active', 
            type: 'boolean', 
            default: true 
          },
          {
            name: 'profile',
            type: 'varchar',
            length: '2048',
            isNullable: true,
          },
          ...commonFields,
        ],
      }),
      true,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable(tableName);
  }
}
