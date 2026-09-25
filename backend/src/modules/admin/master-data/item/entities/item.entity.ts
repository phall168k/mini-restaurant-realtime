import { Check, Index, Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from '../../../../../database/entities/base.entity';
import { CategoryEntity } from '../../category/entities/category.entity';
import { AttachmentDto } from '../../../../../libs/dtos/attachment.dto';
import { UserEntity } from '../../../system/user/entities/user.entity';

@Entity({ 
    schema: 'admin', 
    name: 'items' 
})
@Check('CHK_items_unit_price', 'unit_price >= 0')
@Check('CHK_items_discount', 'discount >= 0')
@Index('IDX_items_category_id', ['categoryId'])
export class ItemEntity extends BaseEntity {
    @PrimaryGeneratedColumn({
         name: 'id' 
    })
    id: number;

    @Column({ 
        name: 'category_id', 
        type: 'integer' 
    })
    categoryId: number;

    @ManyToOne(() => CategoryEntity, { nullable: false, onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
    @JoinColumn({ 
        name: 'category_id' 
    })
    category: CategoryEntity;

    @Column({ 
        name: 'code', 
        type: 'varchar', 
        length: 250, 
        unique: true 
    })
    code: string;

    @Column({ 
        name: 'name_en', 
        type: 'varchar', 
        length: 250 
    })
    nameEn: string;

    @Column({ 
        name: 'name_kh', 
        type: 'varchar', 
        length: 250 
    })
    nameKh: string;

    @Column({ 
        name: 'description', 
        type: 'text', 
        nullable: true 
    })
    description: string | null;

    @Column({ 
        name: 'unit_price', 
        type: 'decimal', 
        precision: 14, 
        scale: 2, 
        default: 0 
    })
    unitPrice: string;

    @Column({ 
        name: 'discount', 
        type: 'decimal', 
        precision: 14, 
        scale: 2, 
        default: 0 
    })
    discount: string;

    @Column({ 
        name: 'thumbnail', 
        type: 'jsonb', 
        nullable: true 
    })
    thumbnail: AttachmentDto | null;

    @Column({ name: 'status', type: 'boolean', default: true })
    status: boolean;

    @Column({
        name: 'created_by_user_id',
        type: 'integer',
    })
    createdByUserId: number;

    @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
    @JoinColumn({
        name: 'created_by_user_id',
    })
    createdByUser: UserEntity;

    // constructor(partial?: Partial<ItemEntity>) {
    //     super();
    //     Object.assign(this, partial);
    // }
    
}
