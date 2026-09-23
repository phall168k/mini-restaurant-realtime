import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "../../../../../database/entities/base.entity";
import { UserEntity } from "../../user/entities/user.entity";

@Entity({
    schema: 'admin',
    name: 'roles',
})
export class RoleEntity extends BaseEntity {
    @PrimaryGeneratedColumn({
        name: 'id',
    })
    id: number;

    @Column({
        name: 'name',
        type: 'varchar',
        length: '250',
        unique: true,
        nullable: false,
    })
    name: string;

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
    })
    status: boolean;

    @ManyToMany(() => UserEntity, (user) => user.roles)
    users: UserEntity[];

    constructor(partial?: Partial<RoleEntity>) {
        super();
        Object.assign(this, partial);
    }
}
