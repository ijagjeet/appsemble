import type { AppDefinition } from '@appsemble/types';
import {
  AllowNull,
  AutoIncrement,
  BelongsTo,
  BelongsToMany,
  Column,
  CreatedAt,
  DataType,
  Default,
  DeletedAt,
  ForeignKey,
  HasMany,
  Model,
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt,
} from 'sequelize-typescript';

import {
  AppBlockStyle,
  AppMember,
  AppOAuth2Secret,
  AppRating,
  AppSubscription,
  AppTranslation,
  Asset,
  Organization,
  Resource,
  User,
} from '.';

@Table({ tableName: 'App', paranoid: true })
export default class App extends Model<App> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column(DataType.JSON)
  definition: AppDefinition;

  /**
   * The maximum length of a domain name is 255 bytes as per
   * https://tools.ietf.org/html/rfc1034#section-3.1. The reason the maximum length of the field
   * is 253, is explained on https://devblogs.microsoft.com/oldnewthing/20120412-00/?p=7873.
   */
  @Column({ type: DataType.STRING(253) })
  domain: string;

  @Column
  icon: Buffer;

  @Unique('UniquePathIndex')
  @Column
  path: string;

  @AllowNull(false)
  @Default(false)
  @Column
  private: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  template: boolean;

  @Column(DataType.TEXT)
  style: string;

  @Column(DataType.TEXT)
  sharedStyle: string;

  @Column(DataType.TEXT)
  yaml: string;

  @AllowNull(false)
  @Column
  vapidPublicKey: string;

  @AllowNull(false)
  @Column
  vapidPrivateKey: string;

  @UpdatedAt
  updated: Date;

  @CreatedAt
  created: Date;

  @DeletedAt
  deleted: Date;

  @AllowNull(false)
  @ForeignKey(() => Organization)
  @Unique('UniquePathIndex')
  @Column
  OrganizationId: string;

  @HasMany(() => AppBlockStyle)
  AppBlockStyles: AppBlockStyle[];

  @HasMany(() => AppOAuth2Secret)
  AppOAuth2Secrets: AppOAuth2Secret[];

  @BelongsTo(() => Organization)
  Organization: Organization;

  @HasMany(() => AppSubscription)
  AppSubscriptions: AppSubscription[];

  @HasMany(() => AppTranslation)
  AppTranslations: AppTranslation[];

  @HasMany(() => Asset)
  Assets: Asset[];

  @BelongsToMany(() => User, () => AppMember)
  Users: User[];

  @HasMany(() => Resource)
  Resources: Resource[];

  @HasMany(() => AppRating)
  AppRatings: AppRating[];

  ResourceCount: number;

  RatingAverage?: number;

  RatingCount?: number;
}
