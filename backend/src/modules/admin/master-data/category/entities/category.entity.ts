import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "../../../../../database/entities/base.entity";
import { UserEntity } from "../../../system/user/entities/user.entity";

@Entity({
    schema: 'admin',
    name: 'categories',
})
export class CategoryEntity extends BaseEntity {
    @PrimaryGeneratedColumn({
        name: 'id',
    })
    id: number;

    @Column({
        name: 'code',
        type: 'varchar',
        length: '250',
        unique: true,
        nullable: false,
    })
    code: string;

    @Column({
        name: 'name_en',
        type: 'varchar',
        length: '250',
        unique: true,
        nullable: false,
    })
    nameEn: string;

    @Column({
        name: 'name_kh',
        type: 'varchar',
        length: '250',
        unique: true,
        nullable: false,
    })
    nameKh: string;

    @Column({
        name: 'description',
        type: 'varchar',
        length: '250',
        nullable: true,
    })
    description: string;

    @Column({
        name: 'status',
        type: 'boolean',
        default: true,
        nullable: false,
    })
    status: boolean;

    @Column({
        name: 'created_by_user_id',
        type: 'integer',
        nullable: false,
    })
    createdByUserId: number;

    @ManyToOne(() => UserEntity, { nullable: true })
    @JoinColumn({
        name: 'created_by_user_id',
    })
    createdByUser: UserEntity;

    constructor(partial?: Partial<CategoryEntity>) {
        super();
        Object.assign(this, partial);
    }
}
