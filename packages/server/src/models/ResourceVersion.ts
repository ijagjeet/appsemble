import {
  AllowNull,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { ResourceVersion as ResourceVersionType } from 'types/src/resource';

import { Resource, User } from '.';

@Table({ tableName: 'ResourceVersion', updatedAt: false })
export class ResourceVersion extends Model {
  @PrimaryKey
  @IsUUID(4)
  @Default(DataType.UUIDV4)
  @Column
  id: string;

  @Column(DataType.JSON)
  data: any;

  @ForeignKey(() => Resource)
  @AllowNull(false)
  @Column
  ResourceId: number;

  @BelongsTo(() => Resource)
  Resource: Resource;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  UserId: string;

  @BelongsTo(() => User)
  User: User;

  @CreatedAt
  created: Date;

  toJSON(): ResourceVersionType {
    return {
      created: this.created.toISOString(),
      data: this.data,
      author: this.User ? { id: this.User.id, name: this.User.name } : undefined,
    };
  }
}
