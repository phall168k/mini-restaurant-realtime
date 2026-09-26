import { Check, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../../../database/entities/base.entity';
import { RestaurantTableStatuseEnum } from '../../../../../libs/enums/restaurant-table-status.enum';
import { UserEntity } from '../../../system/user/entities/user.entity';

@Entity({ 
    schema: 'admin', 
    name: 'restaurant_tables' 
})
@Check('CHK_restaurant_tables_capacity', 'capacity > 0')
@Check('CHK_restaurant_tables_sort_order', 'sort_order >= 0')
export class RestaurantTableEntity extends BaseEntity {
    @PrimaryGeneratedColumn({ 
        name: 'id' 
    })
    id: number;

    @Column({ 
        name: 'code', 
        type: 'varchar', 
        length: 250, 
        unique: true 
    })
    code: string;

    @Column({ 
        name: 'name', 
        type: 'varchar', 
        length: 250 
    })
    name: string;

    @Column({ 
        name: 'capacity', 
        type: 'integer' 
    })
    capacity: number;

    @Column({ 
        name: 'status', 
        type: 'enum', 
        enum: RestaurantTableStatuseEnum, 
        enumName: 'restaurant_table_status_enum', 
        default: RestaurantTableStatuseEnum.AVAILABLE 
    })
    status: RestaurantTableStatuseEnum;

    @Column({ 
        name: 'note', 
        type: 'text', 
        nullable: true 
    })
    note: string | null;

    @Column({ 
        name: 'sort_order', 
        type: 'integer', 
        default: 0 
    })
    sortOrder: number;

    @Column({ 
        name: 'active', 
        type: 'boolean', 
        default: true 
    })
    active: boolean;

    @Column({ 
        name: 'created_by_user_id', 
        type: 'integer' 
    })
    createdByUserId: number;

    @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
    @JoinColumn({ 
        name: 'created_by_user_id' 
    })
    createdByUser: UserEntity;
}
