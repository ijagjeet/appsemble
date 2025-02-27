import {
  AllowNull,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';

import { AppSamlSecret, User } from './index.js';

@Table({ tableName: 'SamlLoginRequest', paranoid: false })
export class SamlLoginRequest extends Model {
  /**
   * The SAML login ID that is sent to the SAML server.
   */
  @PrimaryKey
  @Column
  id: string;

  /**
   * The OAuth2 scope the app requested in the login request.
   */
  @AllowNull(false)
  @Column
  scope: string;

  /**
   * The OAuth2 state the app specified in the login request.
   */
  @AllowNull(false)
  @Column
  state: string;

  /**
   * The email address the user is linking.
   */
  @Column
  email: string;

  /**
   * The nameId that’s stored if the authorization is being linked to the user.
   */
  @Column
  nameId: string;

  /**
   * The OAuth2 redirect URI the app specified in the login request.
   */
  @AllowNull(false)
  @Column
  redirectUri: string;

  /**
   * The timezone of the browser used during the login flow.
   */
  @AllowNull(false)
  @Column
  timezone: string;

  /**
   * The ID of the app’s SAML secret.
   */
  @ForeignKey(() => AppSamlSecret)
  @AllowNull(false)
  @Column
  AppSamlSecretId: number;

  /**
   * The app’s SAML secret.
   */
  @BelongsTo(() => AppSamlSecret)
  AppSamlSecret: Awaited<AppSamlSecret>;

  /**
   * An optional ID of the user who’s logged in to Appsemble Studio at the time of the request.
   */
  @ForeignKey(() => User)
  @Column(DataType.UUID)
  UserId: string;

  /**
   * An optional user who’s logged in to Appsemble Studio at the time of the request.
   */
  @BelongsTo(() => User)
  User: Awaited<User>;

  @CreatedAt
  created: Date;

  @UpdatedAt
  updated: Date;
}
