import { IconName } from '@fortawesome/fontawesome-common-types';
import { Schema } from 'jsonschema';
import { OpenAPIV3 } from 'openapi-types';
import { JsonObject, RequireExactlyOne } from 'type-fest';

import { Action, LogAction } from './action.js';
import { AppVisibility, TeamsDefinition } from './app.js';
import { BulmaColor } from './bulma.js';
import { HTTPMethods } from './http.js';
import { Theme } from './theme.js';

export * from './action.js';
export * from './app.js';
export * from './appMember.js';
export * from './asset.js';
export * from './authentication.js';
export * from './author.js';
export * from './bulma.js';
export * from './http.js';
export * from './snapshot.js';
export * from './resource.js';
export * from './saml.js';
export * from './ssl.js';
export * from './team.js';
export * from './template.js';
export * from './theme.js';
export * from './user.js';

/**
 * A representation of a generated OAuth2 authorization code response.
 */
export interface OAuth2AuthorizationCode {
  /**
   * The authorization code.
   */
  code: string;
}

/**
 * A block that is displayed on a page.
 */
export interface BlockDefinition {
  /**
   * The type of the block.
   *
   * A block type follow the format `@organization/name`.
   * If the organization is _appsemble_, it may be omitted.
   *
   * Pattern:
   * ^(@[a-z]([a-z\d-]{0,30}[a-z\d])?\/)?[a-z]([a-z\d-]{0,30}[a-z\d])$
   *
   * Examples:
   * - `form`
   * - `@amsterdam/splash`
   */
  type: string;

  /**
   * A [semver](https://semver.org) representation of the block version.
   *
   * Pattern:
   * ^\d+\.\d+\.\d+$
   */
  version: string;

  /**
   * An optional header to render above the block.
   */
  header?: Remapper;

  /**
   * An override of the block’s default layout.
   */
  layout?: 'float' | 'grow' | 'static';

  /**
   * For floating blocks this propert defines where the block should float.
   */
  position?:
    | 'bottom left'
    | 'bottom right'
    | 'bottom'
    | 'left'
    | 'right'
    | 'top left'
    | 'top right'
    | 'top';

  /**
   * The theme of the block.
   */
  theme?: Partial<Theme>;

  /**
   * A free form mapping of named parameters.
   *
   * The exact meaning of the parameters depends on the block type.
   */
  parameters?: JsonObject;

  /**
   * A mapping of actions that can be fired by the block to action handlers.
   *
   * The exact meaning of the parameters depends on the block type.
   */
  actions?: Record<string, ActionDefinition>;

  /**
   * Mapping of the events the block can listen to and emit.
   *
   * The exact meaning of the parameters depends on the block type.
   */
  events?: {
    listen?: Record<string, string>;
    emit?: Record<string, string>;
  };

  /**
   * A list of roles that are allowed to view this block.
   */
  roles?: string[];
}

/**
 * OpenID Connect specifies a set of standard claims about the end-user, which cover common profile
 * information such as name, contact details, date of birth and locale.
 *
 * The Connect2id server can be set up to provide additional custom claims, such as roles and
 * permissions.
 */
export interface UserInfo {
  /**
   * The subject (end-user) identifier. This member is always present in a claims set.
   */
  sub: string;

  /**
   * The full name of the end-user, with optional language tag.
   */
  name: string;

  /**
   * The end-user's preferred email address.
   */
  email: string;

  /**
   * True if the end-user's email address has been verified, else false.
   */
  email_verified: boolean;

  /**
   * The URL of the profile picture for the end-user.
   */
  picture?: string;

  /**
   * A URL that links to the user profile.
   */
  profile?: string;

  /**
   * The end-user’s locale, represented as a BCP47 language tag.
   */
  locale?: string;

  /**
   * The end-user’s time zone.
   */
  zoneinfo?: string;
}

/**
 * The payload stored in our JSON web tokens
 */
export interface JwtPayload {
  aud: string;
  exp: number;
  iat: string;
  iss: string;
  scope: string;
  sub: string;
}

/**
 * A response for a login token request
 */
export interface TokenResponse {
  /**
   * The bearer access token to use for authenticating requests.
   */
  access_token: string;

  /**
   * How long until the access token expires in seconds from now.
   */
  expires_in?: number;

  /**
   * The OpenID ID token as a JWT.
   *
   * This field is only present on OpenID connect providers.
   */
  id_token?: string;

  /**
   * A refresh token for getting a new access token.
   */
  refresh_token?: string;

  token_type: 'bearer';
}

interface BaseICSRemapper {
  /**
   * The start of the icalendar event.
   */
  start: Remapper;

  /**
   * The title of the event.
   */
  title: Remapper;

  /**
   * An optional description of the event.
   */
  description?: Remapper;

  /**
   * An optional link to attach to the event.
   */
  url?: Remapper;

  /**
   * An optional location description to attach to the event.
   */
  location?: Remapper;

  /**
   * An optional geolocation description to attach to the event.
   *
   * This must be an object with the properties `lat` or `latitude`, and `lon`, `lng` or
   * `longitude`.
   */
  coordinates?: Remapper;
}

interface DurationICSRemapper extends BaseICSRemapper {
  /**
   * The duration of the event.
   *
   * @example '1w 3d 10h 30m'
   */
  duration: Remapper;
}

interface EndTimeICSRemapper extends BaseICSRemapper {
  /**
   * The end time of the event as a date or a date string.
   */
  end: Remapper;
}

export interface Remappers {
  /**
   * Get app metadata.
   *
   * Supported properties:
   *
   * - `id`: Get the app id.
   * - `locale`: Get the current locale of the app.
   * - `url`: Get the base URL of the app.
   */
  app: 'id' | 'locale' | 'url';

  /**
   * Get page metadata.
   *
   * Supported properties:
   *
   * - `data`: Get the current page data.
   * - `url`: Get the URL of the current page.
   */
  page: 'data' | 'url';

  /**
   * Get a property from the context.
   */
  context: string;

  /**
   * Convert a string to a date using a given format.
   */
  'date.parse': string;

  /**
   * Returns the current date.
   */
  'date.now': unknown;

  /**
   * Adds to a date.
   */
  'date.add': string;

  /**
   * Format a date to an iso8601 / rfc3339 compatible string.
   */
  'date.format': null;

  /**
   * Compare all computed remapper values against each other.
   *
   * Returns `true` if all entries are equal, otherwise `false`.
   */
  equals: Remapper[];

  /**
   * Get data stored at the current flow page step
   */
  step: string;

  /**
   * Compares the first computed remapper value with the second computed remapper value.
   *
   * Returns `true` of the first entry is greater than the second entry.
   */
  gt: [Remapper, Remapper];

  /**
   * Compares the first computed remapper value with the second computed remapper value.
   *
   * Returns `true` of the first entry is less than the second entry.
   */
  lt: [Remapper, Remapper];

  /**
   * Builds an array based on the given data and remappers.
   *
   * The remappers gets applied to each item in the array.
   *
   * Always returns an array, can be empty if supplied data isn’t an array.
   */
  'array.map': Remapper;

  /**
   * Filters out unique entries from an array.
   *
   * The value Remapper is applied to each entry in the array,
   * using its result to determine uniqueness.
   *
   * If the value Remapper result in `undefined` or `null`, the entire entry is used for uniqueness.
   *
   * If the input is not an array, the input is returned without any modifications.
   */
  'array.unique': Remapper;

  /**
   * Create an icalendar event.
   */
  ics: DurationICSRemapper | EndTimeICSRemapper;

  /**
   * Checks if condition results in a truthy value.
   *
   * Returns value of then if condition is truthy, otherwise it returns the value of else.
   */
  if: { condition: Remapper; then: Remapper; else: Remapper };

  /**
   * Get the current array.map’s index or length.
   *
   * Returns nothing if array.map’s context isn’t set.
   */
  array: 'index' | 'length';

  /**
   * Create a new array with an array of predefined remappers.
   */
  'array.from': Remapper[];

  /**
   * Append new values to the end of an array.
   *
   * If the input is not an array an empty array is returned.
   */
  'array.append': Remapper[];

  /**
   * Remove item(s) from an array given a predefined array of remappable indices.
   *
   * Only the remapped values that are turned into numbers are applied.
   *
   * If the input is not an array an empty array is returned.
   */
  'array.omit': Remapper[];

  /**
   * Create a new object given some predefined mapper keys.
   */
  'object.from': Record<string, Remapper>;

  /**
   * Assign properties to an existing object given some predefined mapper keys.
   */
  'object.assign': Record<string, Remapper>;

  /**
   * Remove properties from an existing object based on the given the object keys.
   *
   * Nested properties can be removed using arrays of keys.
   *
   * @example
   * ```yaml
   * object.omit:
   *   - foo   # Removes the property foo
   *   - - bar # Removes the property baz inside of bar
   *     - baz
   * ```
   */
  'object.omit': (string[] | string)[];

  /**
   * Use a static value.
   */
  static: any;

  /**
   * Get a property from an object.
   *
   * If the prop is an array, nested properties will be retrieved in sequence.
   */
  prop: number[] | string[] | number | string;

  /**
   * Recursively strip all nullish values from an object or array.
   */
  'null.strip': {
    depth: number;
  } | null;

  /**
   * Pick and return a random entry from an array.
   *
   * If the input is not an array, the input is returned as-is.
   */
  'random.choice': null;
  /**
   * Pick and return a random entry from an array.
   *
   * If the input is not an array, the input is returned as-is.
   */
  'random.integer': [number, number];

  /**
   * Pick and return a random entry from an array.
   *
   * If the input is not an array, the input is returned as-is.
   */
  'random.float': [number, number];

  /**
   * Pick and return a random entry from an array.
   *
   * If the input is not an array, the input is returned as-is.
   */
  'random.string': { choice: string; length: number };

  /**
   * Get the input data as it was initially passed to the remap function.
   */
  root: null;

  /**
   * Get the data at a certain index from the history stack prior to an action.
   *
   * 0 is the index of the first item in the history stack.
   */
  history: number;

  /**
   * Create a new object with properties from the history stack at a certain index.
   */
  'from.history': {
    /**
     * The index of the history stack item to apply.
     *
     * 0 is the index of the first item in the history stack.
     */
    index: number;

    /**
     * Predefined mapper keys to choose what properties to apply.
     */
    props: Record<string, Remapper>;
  };

  /**
   * Assign properties from the history stack at a certain index to an existing object.
   */
  'assign.history': {
    /**
     * The index of the history stack item to assign.
     *
     * 0 is the index of the first item in the history stack.
     */
    index: number;

    /**
     * Predefined mapper keys to choose what properties to assign.
     */
    props: Record<string, Remapper>;
  };

  /**
   * Assign properties from the history stack at a certain index and exclude the unwanted.
   */
  'omit.history': {
    /**
     * The index of the history stack item to assign.
     *
     * 0 is the index of the first item in the history stack.
     */
    index: number;

    /**
     * Exclude properties from the history stack item, based on the given object keys.
     *
     * Nested properties can be excluded using arrays of keys.
     *
     * @example
     * ```yaml
     * omit.history:
     *   index: 0
     *   keys:
     *     - foo   # Excludes the property foo
     *     - - bar # Excludes the property baz inside of bar
     *       - baz
     * ```
     */
    keys: (string[] | string)[];
  };

  /**
   * Convert an input to lower or upper case.
   */
  'string.case': 'lower' | 'upper';

  /**
   * Format a string using remapped input variables.
   */
  'string.format': {
    /**
     * The message id pointing to the template string to format.
     */
    messageId?: string;

    /**
     * The template default string to format.
     */
    template?: string;

    /**
     * A set of remappers to convert the input to usable values.
     */
    values?: Record<string, Remapper>;
  };

  /**
   * Match the content with the regex in the key, and replace it with its value.
   */
  'string.replace': Record<string, string>;

  /**
   * Translate using a messageID.
   *
   * This does not support parameters, for more nuanced translations use `string.format`.
   */
  translate: string;

  user: keyof UserInfo;
}

export type Remapper =
  | RequireExactlyOne<Remappers>
  | RequireExactlyOne<Remappers>[]
  | boolean
  | number
  | string;

export interface SubscriptionResponseResource {
  create: boolean;
  update: boolean;
  delete: boolean;
  subscriptions?: Record<
    string,
    {
      create?: boolean;
      update: boolean;
      delete: boolean;
    }
  >;
}

export type SubscriptionResponse = Record<string, SubscriptionResponseResource>;

export interface RoleDefinition {
  description?: string;
  inherits?: string[];
  defaultPage?: string;
}

export interface Security {
  default: {
    role: string;
    policy?: 'everyone' | 'invite' | 'organization';
  };

  roles: Record<string, RoleDefinition>;

  /**
   * Define how teams are handled by the app.
   */
  teams?: TeamsDefinition;
}

export type Navigation = 'bottom' | 'hidden' | 'left-menu';
export type LayoutPosition = 'hidden' | 'navbar' | 'navigation';

export interface NotificationDefinition {
  to?: string[];
  subscribe?: 'all' | 'both' | 'single';
  data?: {
    title: string;
    content: string;
    link: string;
  };
}

/**
 * A collection of hooks that are triggered upon calling a resource actions.
 */
export interface ResourceHooks {
  notification: NotificationDefinition;
}

export interface ResourceCall {
  /**
   * The HTTP method to use for making the HTTP request.
   */
  method?: HTTPMethods;

  /**
   * The URL to which to make the resource request.
   */
  url?: string;

  /**
   * The associated hooks with the resource action.
   */
  hooks?: ResourceHooks;

  /**
   * Query parameters to pass along with the request.
   */
  query?: Remapper;

  /**
   * The roles that are allowed to perform this action.
   */
  roles?: string[];
}

interface ResourceReferenceAction {
  trigger: ('create' | 'delete' | 'update')[];
}

interface ResourceReference {
  /**
   * The name of the referenced resource.
   */
  resource: string;

  create?: ResourceReferenceAction;
  update?: ResourceReferenceAction;
  delete?: ResourceReferenceAction;
}

export interface ResourceHistoryDefinition {
  /**
   * If set to `false`, edits are still tracked, but exactly what changed is lost.
   */
  data: boolean;
}

export interface ResourceView {
  /**
   * The roles required to use this view.
   */
  roles: string[];

  /**
   * The remappers used to transform the output.
   */
  remap: Remapper;
}

export interface ResourceDefinition {
  /**
   * The default list of roles used for permission checks for each action.
   */
  roles?: string[];

  /**
   * A definition of how versioning should happen for instances of this resource.
   */
  history?: ResourceHistoryDefinition | boolean;

  /**
   * The definition for the `resource.create` action.
   */
  create?: ResourceCall;

  /**
   * The definition for the `resource.delete` action.
   */
  delete?: ResourceCall;

  /**
   * The definition for the `resource.get` action.
   */
  get?: ResourceCall;

  /**
   * The definition for the `resource.query` action.
   */
  query?: ResourceCall;

  /**
   * The definition for the `resource.count` action.
   */
  count?: ResourceCall;

  /**
   * The definition for the `resource.update` action.
   */
  update?: ResourceCall;

  /**
   * The definition for the `resource.patch` action.
   */
  patch?: ResourceCall;

  /**
   * The property to use as the id.
   *
   * @default `id`
   */
  id?: string;

  /**
   * The JSON schema to validate resources against before sending it to the backend.
   */
  schema: OpenAPIV3.SchemaObject;

  /**
   * The URL to post the resource to.
   *
   * @default autogenerated for use with the Appsemble resource API.
   */
  url?: string;

  /**
   * The alternate views of this resource.
   */
  views?: Record<string, ResourceView>;

  /**
   * The references this resources has to other resources.
   */
  references?: Record<string, ResourceReference>;

  /**
   * A time string representing when a resource should expire.
   *
   * @example '1d 8h 30m'
   */
  expires?: string;
}

export interface BaseActionDefinition<T extends Action['type']> {
  /**
   * The type of the action.
   */
  type: T;

  /**
   * A remapper function. This may be used to remap data before it is passed into the action
   * function.
   *
   * @deprecated Since 0.20.10, use {@link remapBefore} instead.
   */
  remap?: Remapper;

  /**
   * A remapper function. This may be used to remap data before it is passed into the action
   * function.
   */
  remapBefore?: Remapper;

  /**
   * The remapper used to transfrom the output before passing it to the next action.
   */
  remapAfter?: Remapper;

  /**
   * Another action that is dispatched when the action has been dispatched successfully.
   */
  onSuccess?: ActionDefinition;

  /**
   * Another action that is dispatched when the action has failed to dispatch successfully.
   */
  onError?: ActionDefinition;
}

export interface AnalyticsAction extends BaseActionDefinition<'analytics'> {
  /**
   * The analytics event target name.
   */
  target: string;

  /**
   * Additional config to pass to analytics.
   */
  config?: Remapper;
}

export interface ConditionActionDefinition extends BaseActionDefinition<'condition'> {
  /**
   * The condition to check for.
   */
  if: Remapper;

  /**
   * The action to run if the condition is true.
   */
  then: ActionDefinition;

  /**
   * The action to run if the condition is false.
   */
  else: ActionDefinition;
}

export interface DialogActionDefinition extends BaseActionDefinition<'dialog'> {
  /**
   * If false, the dialog cannot be closed by clicking outside of the dialog or on the close button.
   */
  closable?: boolean;

  /**
   * If true, the dialog will be displayed full screen.
   */
  fullscreen?: boolean;

  /**
   * Blocks to render on the dialog.
   */
  blocks: BlockDefinition[];

  /**
   * The title to show in the dialog.
   */
  title?: Remapper;
}

export interface DownloadActionDefinition extends BaseActionDefinition<'download'> {
  /**
   * The filename to download the file as. It must include a file extension.
   */
  filename: string;
}

export interface EachActionDefinition extends BaseActionDefinition<'each'> {
  /**
   * Run the actions in series instead of parallel.
   */
  serial?: boolean;
  /**
   * Run an action for each entry in an array.
   *
   * The actions are run in parallel.
   *
   * If the input is not an array, the action will be applied to the input instead.
   */
  do: ActionDefinition;
}

export interface EmailActionDefinition extends BaseActionDefinition<'email'> {
  /**
   * The recipient of the email.
   */
  to?: Remapper;

  /**
   * The name of the sender.
   *
   * The default value depends on the email server.
   */
  from?: Remapper;

  /**
   * The recipients to CC the email to.
   */
  cc?: Remapper;

  /**
   * The recipients to BCC the email to.
   */
  bcc?: Remapper;

  /**
   * The subject of the email.
   */
  subject: Remapper;

  /**
   * The body of the email.
   */
  body: Remapper;

  /**
   * The attachments to include in the email.
   *
   * The remapper must resolve to an object containing the following properties:
   *
   * - \`target\`: The asset ID or link to download contents from to add as an attachment. This is
   * mutually exclusive with \`content\`.
   * - \`content\`: The raw content to include as the file content. This is mutually exclusive with
   * \`target\`.
   * - \`filename\`: The filename to include the attachment as.
   * - \`accept\` If the target is a URL, this will be set as the HTTP \`Accept\` header when
   * downloading the file.
   *
   * If the attachment is a string, it will be treated as the target.
   */
  attachments?: Remapper;
}

export interface FlowToActionDefinition extends BaseActionDefinition<'flow.to'> {
  /**
   * The flow step to go to.
   */
  step: Remapper;
}

export interface LinkActionDefinition extends BaseActionDefinition<'link'> {
  /**
   * Where to link to.
   *
   * This should be a page name.
   */
  to: string[] | string;
}

export interface NotifyActionDefinition extends BaseActionDefinition<'notify'> {
  /**
   * The title of the notification.
   */
  title: Remapper;

  /**
   * The description of the notification.
   */
  body: Remapper;

  /**
   * To whom the notification should be sent.
   *
   * Use `all` to send the notification to all app subscribed users.
   * Or notify specific users by passing either a single user id or an array of user ids.
   *
   * Nothing is sent if the value is **not** a valid user id.
   */
  to: Remapper;
}

export interface LogActionDefinition extends BaseActionDefinition<'log'> {
  /**
   * The logging level on which to log.
   *
   * @default `info`.
   */
  level?: LogAction['level'];
}

export interface ShareActionDefinition extends BaseActionDefinition<'share'> {
  /**
   * The URL that is being shared.
   */
  url?: Remapper;

  /**
   * The main body that is being shared.
   */
  text?: Remapper;

  /**
   * The title that is being shared, if supported.
   */
  title?: Remapper;
}

export type StorageType = 'appStorage' | 'indexedDB' | 'localStorage' | 'sessionStorage';

export interface StorageAppendActionDefinition extends BaseActionDefinition<'storage.append'> {
  /**
   * The key of the entry to write to the app’s storage.
   */
  key: Remapper;

  /**
   * The data to write to the app’s storage.
   */
  value: Remapper;

  /**
   * The mechanism used to read the data from.
   *
   * @default 'indexedDB'
   */
  storage?: StorageType;
}

export interface StorageDeleteActionDefinition extends BaseActionDefinition<'storage.delete'> {
  /**
   * The key of the entry to delete from the app’s storage.
   */
  key: Remapper;

  /**
   * The mechanism used to delete the data from.
   *
   * @default 'indexedDB'
   */
  storage?: StorageType;
}

export interface StorageSubtractActionDefinition extends BaseActionDefinition<'storage.subtract'> {
  /**
   * The key of the entry to subtract the last entry from
   */
  key: Remapper;

  /**
   * The mechanism used to read the data from.
   *
   * @default 'indexedDB'
   */
  storage?: StorageType;
}

export interface StorageUpdateActionDefinition extends BaseActionDefinition<'storage.update'> {
  /**
   * The key of the entry to write to the app’s storage.
   */
  key: Remapper;

  /**
   * The key of the item to update.
   */
  item: Remapper;

  /**
   * The data to update the specified item with.
   */
  value: Remapper;

  /**
   * The mechanism used to read the data from.
   *
   * @default 'indexedDB'
   */
  storage?: StorageType;
}

export interface StorageReadActionDefinition extends BaseActionDefinition<'storage.read'> {
  /**
   * The key of the entry to read from the app’s storage.
   */
  key: Remapper;

  /**
   * The mechanism used to read the data from.
   *
   * @default 'indexedDB'
   */
  storage?: StorageType;
}

export interface StorageWriteActionDefinition extends BaseActionDefinition<'storage.write'> {
  /**
   * The key of the entry to write to the app’s storage.
   */
  key: Remapper;

  /**
   * The data to write to the app’s storage.
   */
  value: Remapper;

  /**
   * The mechanism used to read the data from.
   *
   * @default 'indexedDB'
   */
  storage?: StorageType;
}

export interface TeamInviteActionDefinition extends BaseActionDefinition<'team.invite'> {
  /**
   * The ID of the team to invite the user to.
   */
  id?: Remapper;

  /**
   * The email address of the user to invite.
   */
  email?: Remapper;
}

export interface UserLoginAction extends BaseActionDefinition<'user.login'> {
  /**
   * The email address to login with.
   */
  email: Remapper;

  /**
   * The password to login with.
   */
  password: Remapper;
}

export interface UserRegisterAction extends BaseActionDefinition<'user.register'> {
  /**
   * The email address to login with.
   */
  email: Remapper;

  /**
   * The password to login with.
   */
  password: Remapper;

  /**
   * The display name of the user.
   */
  displayName: Remapper;

  /**
   * The profile picture to use.
   *
   * This must be a file, otherwise it’s discarded.
   */
  picture?: Remapper;

  /**
   * Custom properties that can be assigned freely.
   *
   * Every value will be converted to a string.
   */
  properties?: Remapper;
}

export interface UserUpdateAction extends BaseActionDefinition<'user.update'> {
  /**
   * The email address to update.
   */
  email?: Remapper;

  /**
   * The password to update.
   */
  password?: Remapper;

  /**
   * The display name to update.
   */
  displayName?: Remapper;

  /**
   * The profile picture to update.
   *
   * This must be a file, otherwise it’s ignored.
   */
  picture?: Remapper;

  /**
   * Custom properties that can be assigned freely.
   *
   * Every value will be converted to a string.
   */
  properties?: Remapper;
}

export interface RequestLikeActionDefinition<T extends Action['type'] = Action['type']>
  extends BaseActionDefinition<T> {
  /**
   * The HTTP method to use for making a request.
   */
  method?: HTTPMethods;

  /**
   * Whether or not to proxy the request through the Appsemble proxy endpoint.
   *
   * @default true
   */
  proxy?: boolean;

  /**
   * A JSON schema against which to validate data before uploading.
   */
  schema?: OpenAPIV3.SchemaObject;

  /**
   * Query parameters to pass along with the request.
   */
  query?: Remapper;

  /**
   * The URL to which to make the request.
   */
  url?: Remapper;

  /**
   * A remapper for the request body.
   *
   * If this isn’t specified, the raw input data is used.
   */
  body?: Remapper;
}

interface ResourceActionDefinition<T extends Action['type']>
  extends RequestLikeActionDefinition<T> {
  /**
   * The name of the resource.
   */
  resource: string;
}

interface ViewResourceDefinition {
  /**
   * The view to use for the request.
   */
  view?: string;
}

export type RequestActionDefinition = RequestLikeActionDefinition<'request'>;
export type ResourceCreateActionDefinition = ResourceActionDefinition<'resource.create'>;
export type ResourceDeleteActionDefinition = ResourceActionDefinition<'resource.delete'>;
export type ResourceGetActionDefinition = ResourceActionDefinition<'resource.get'> &
  ViewResourceDefinition;
export type ResourceQueryActionDefinition = ResourceActionDefinition<'resource.query'> &
  ViewResourceDefinition;
export type ResourceCountActionDefinition = ResourceActionDefinition<'resource.count'>;
export type ResourceUpdateActionDefinition = ResourceActionDefinition<'resource.update'>;
export type ResourcePatchActionDefinition = ResourceActionDefinition<'resource.patch'>;

export interface BaseResourceSubscribeActionDefinition<T extends Action['type']>
  extends BaseActionDefinition<T> {
  /**
   * The name of the resource.
   */
  resource: string;

  /**
   * The action to subscribe to. Defaults to `update` if not specified.
   */
  action?: 'create' | 'delete' | 'update';
}

export type ResourceSubscriptionSubscribeActionDefinition =
  BaseResourceSubscribeActionDefinition<'resource.subscription.subscribe'>;

export type ResourceSubscriptionUnsubscribeActionDefinition =
  BaseResourceSubscribeActionDefinition<'resource.subscription.unsubscribe'>;

export type ResourceSubscriptionToggleActionDefinition =
  BaseResourceSubscribeActionDefinition<'resource.subscription.toggle'>;

export type ResourceSubscriptionStatusActionDefinition = Omit<
  BaseResourceSubscribeActionDefinition<'resource.subscription.status'>,
  'action'
>;

export interface EventActionDefinition extends BaseActionDefinition<'event'> {
  /**
   * The name of the event to emit to.
   */
  event: string;

  /**
   * An event to wait for before resolving.
   *
   * If this is unspecified, the action will resolve with the input data.
   */
  waitFor?: string;
}

export interface StaticActionDefinition extends BaseActionDefinition<'static'> {
  /**
   * The value to return.
   */
  value: any;
}

export interface BaseMessage {
  /**
   * The color to use for the message.
   *
   * @default 'info'
   */
  color?: BulmaColor;

  /**
   * The timeout period for this message (in milliseconds).
   *
   * @default 5000
   */
  timeout?: number;

  /**
   * Whether or not to show the dismiss button.
   *
   * @default false
   */
  dismissable?: boolean;

  /**
   * The position of the message on the screen.
   *
   * @default 'bottom'
   */
  layout?: 'bottom' | 'top';
}

export type MessageActionDefinition = BaseActionDefinition<'message'> &
  BaseMessage & {
    /**
     * The content of the message to display.
     */
    body: Remapper;
  };

export type ActionDefinition =
  | AnalyticsAction
  | BaseActionDefinition<'dialog.error'>
  | BaseActionDefinition<'dialog.ok'>
  | BaseActionDefinition<'flow.back'>
  | BaseActionDefinition<'flow.cancel'>
  | BaseActionDefinition<'flow.finish'>
  | BaseActionDefinition<'flow.next'>
  | BaseActionDefinition<'link.back'>
  | BaseActionDefinition<'link.next'>
  | BaseActionDefinition<'noop'>
  | BaseActionDefinition<'team.join'>
  | BaseActionDefinition<'team.list'>
  | BaseActionDefinition<'throw'>
  | ConditionActionDefinition
  | DialogActionDefinition
  | DownloadActionDefinition
  | EachActionDefinition
  | EmailActionDefinition
  | EventActionDefinition
  | FlowToActionDefinition
  | LinkActionDefinition
  | LogActionDefinition
  | MessageActionDefinition
  | NotifyActionDefinition
  | RequestActionDefinition
  | ResourceCountActionDefinition
  | ResourceCreateActionDefinition
  | ResourceDeleteActionDefinition
  | ResourceGetActionDefinition
  | ResourcePatchActionDefinition
  | ResourceQueryActionDefinition
  | ResourceSubscriptionStatusActionDefinition
  | ResourceSubscriptionSubscribeActionDefinition
  | ResourceSubscriptionToggleActionDefinition
  | ResourceSubscriptionUnsubscribeActionDefinition
  | ResourceUpdateActionDefinition
  | ShareActionDefinition
  | StaticActionDefinition
  | StorageAppendActionDefinition
  | StorageDeleteActionDefinition
  | StorageReadActionDefinition
  | StorageSubtractActionDefinition
  | StorageUpdateActionDefinition
  | StorageWriteActionDefinition
  | TeamInviteActionDefinition
  | UserLoginAction
  | UserRegisterAction
  | UserUpdateAction;

export interface ActionType {
  /**
   * Whether or not app creators are required to define this action.
   */
  required?: boolean;

  /**
   * The description of the action.
   */
  description?: string;
}

export interface EventType {
  /**
   * The description of the action.
   */
  description?: string;
}

export interface BlockManifest {
  /**
   * A block manifest as it is available to the app and in the SDK.
   * pattern: ^@[a-z]([a-z\d-]{0,30}[a-z\d])?\/[a-z]([a-z\d-]{0,30}[a-z\d])$
   * The name of a block.
   */
  name: string;

  /**
   * The description of the block.
   */
  description?: string;

  /**
   * The long description of the block.
   *
   * This is displayed when rendering block documentation and supports Markdown.
   */
  longDescription?: string;

  /**
   * A [semver](https://semver.org) representation of the block version.
   *
   * Pattern:
   * ^\d+\.\d+\.\d+$
   */
  version: string;

  /**
   * The type of layout to be used for the block.
   */
  layout?: 'float' | 'grow' | 'hidden' | 'static' | null;

  /**
   * Array of urls associated to the files of the block.
   */
  files: string[];

  /**
   * The actions that are supported by a block.
   */
  actions?: Record<string, ActionType>;

  /**
   * The messages that are supported by a block.
   */
  messages?: Record<string, Record<string, any> | never>;

  /**
   * The events that are supported by a block.
   */
  events?: {
    listen?: Record<string, EventType>;
    emit?: Record<string, EventType>;
  };

  /**
   * A JSON schema to validate block parameters.
   */
  parameters?: Schema;

  /**
   * The URL that can be used to fetch this block’s icon.
   */
  iconUrl?: string;

  /**
   * The languages that are supported by the block by default.
   *
   * If the block has no messages, this property is `null`.
   */
  languages: string[] | null;

  examples?: string[];

  /**
   * Whether the block should be listed publicly
   * for users who aren’t part of the block’s organization.
   *
   * - **`public`**: The block is visible for everyone.
   * - **`unlisted`**: The block will only be visible if the user is
   * logged in and is part of the block’s organization.
   */
  visibility?: 'public' | 'unlisted';

  /**
   * Whether action validation for wildcard action is skipped.
   */
  wildcardActions?: boolean;
}

/**
 * This describes what a page will look like in the app.
 */
export interface BasePageDefinition {
  /**
   * The name of the page.
   *
   * This will be displayed at the *app bar* of each page and in the side menu,
   * unless @see navTitle is set.
   *
   * The name of the page is used to determine the URL path of the page.
   */
  name: string;

  /**
   * Whether or not the page name should be displayed in the *app bar*.
   */
  hideName?: boolean;

  /**
   * The name of the page when displayed in the navigation menu.
   *
   * Context property `name` can be used to access the name of the page.
   */
  navTitle?: Remapper;

  /**
   * Whether or not the page should be displayed in navigational menus.
   */
  hideNavTitle?: boolean;

  /**
   * The navigation type to use for the page.
   * Setting this will override the default navigation for the app.
   */
  navigation?: Navigation;

  /**
   * A list of roles that may view the page.
   */
  roles?: string[];

  /**
   * An optional icon from the fontawesome icon set
   *
   * This will be displayed in the navigation menu.
   */
  icon?: IconName;

  /**
   * Page parameters can be used for linking to a page that should display a single resource.
   */
  parameters?: string[];

  /**
   * The global theme for the page.
   */
  theme?: Partial<Theme>;
}

/**
 * A subset of page for use within flow pages and tab pages.
 */
export interface SubPage {
  name: string;
  blocks: BlockDefinition[];
}

export interface BasicPageDefinition extends BasePageDefinition {
  type?: 'page';
  blocks: BlockDefinition[];
}

export interface FlowPageDefinition extends BasePageDefinition {
  type: 'flow';

  steps: SubPage[];

  /**
   * A mapping of actions that can be fired by the page to action handlers.
   */
  actions?: {
    onFlowCancel?: ActionDefinition;
    onFlowFinish?: ActionDefinition;
  };

  /**
   * The method used to display the progress of the flow page.
   *
   * @default 'corner-dots'
   */
  progress?: 'corner-dots' | 'hidden';

  /**
   * Whether to retain the flow data when navigating away to another page outside the flow.
   *
   * By default the flow page retains it's data after navigating once. Set to false to clear it.
   *
   * @default true
   */
  retainFlowData?: boolean;
}

export interface LoopPageDefinition extends BasePageDefinition {
  type: 'loop';

  /**
   * Template step that the loop will pass data onto
   */
  foreach?: SubPage;

  /**
   * A mapping of actions that can be fired by the page to action handlers.
   */
  actions?: {
    onFlowCancel?: ActionDefinition;
    onFlowFinish?: ActionDefinition;
    onLoad?: ActionDefinition;
  };

  /**
   * The method used to display the progress of the flow page.
   *
   * @default 'corner-dots'
   */
  progress?: 'corner-dots' | 'hidden';

  /**
   * Whether to retain the flow data when navigating away to another page outside the flow.
   *
   * By default the flow page retains it's data after navigating once. Set to false to clear it.
   *
   * @default true
   */
  retainFlowData?: boolean;
}

export interface TabsPageDefinition extends BasePageDefinition {
  type: 'tabs';
  tabs: SubPage[];
}

export type PageDefinition =
  | BasicPageDefinition
  | FlowPageDefinition
  | LoopPageDefinition
  | TabsPageDefinition;

export interface AppDefinition {
  /**
   * The name of the app.
   *
   * This determines the default path of the app.
   */
  name?: string;

  /**
   * The description of the app.
   */
  description?: string;

  /**
   * The default language of the app.
   *
   * @default 'en'
   */
  defaultLanguage?: string;

  /**
   * The security definition of the app.
   *
   * This determines user roles and login behavior.
   */
  security?: Security;

  /**
   * A list of roles that are required to view pages. Specific page roles override this property.
   */
  roles?: string[];

  /**
   * The default page of the app.
   */
  defaultPage: string;

  /**
   * The settings for the layout of the app.
   */
  layout?: {
    /**
     * The location of the login button.
     *
     * @default 'navbar'
     */
    login?: LayoutPosition;

    /**
     * The location of the settings button.
     *
     * If set to `navigation`, it will only be visible if `login` is also visible in `navigation`.
     *
     * @default 'navbar'
     */
    settings?: LayoutPosition;

    /**
     * The location of the feedback button
     *
     * If set to `navigation`, it will only be visible if `login` is also visible in `navigation`.
     *
     * @default 'navbar'
     */
    feedback?: LayoutPosition;

    /**
     * The navigation type to use.
     *
     * If this is omitted, a collapsable side navigation menu will be rendered on the left.
     *
     * @default 'left-menu'
     */
    navigation?: Navigation;
  };

  /**
   * The strategy to use for apps to subscribe to push notifications.
   *
   * If this is omitted, push notifications can not be sent.
   */
  notifications?: 'login' | 'opt-in' | 'startup';

  /**
   * The pages of the app.
   */
  pages: PageDefinition[];

  /**
   * Resource definitions that may be used by the app.
   */
  resources?: Record<string, ResourceDefinition>;

  /**
   * The global theme for the app.
   */
  theme?: Partial<Theme>;

  /**
   * Helper property that can be used to store YAML anchors.
   *
   * This is omitted any time the API serves the app definition.
   */
  anchors?: any[];

  /**
   * Cron jobs associated with the app.
   */
  cron?: Record<string, CronDefinition>;
}

/**
 * The definition of a cron job for an app.
 */
export interface CronDefinition {
  schedule: string;
  action: ActionDefinition;
}

export interface App {
  /**
   * The unique identifier for the app.
   *
   * This value will be generated automatically by the API.
   */
  id?: number;

  /*
   * A domain name on which this app should be served.
   */
  domain?: string;

  /**
   * The name used for emails
   */
  emailName?: string;

  /**
   * The id of the organization this app belongs to.
   */
  OrganizationId?: string;

  /**
   * The name of the organization this app belongs to.
   */
  OrganizationName?: string;

  /**
   * The long description of the app.
   */
  longDescription: string;

  /**
   * The path the app is available from.
   */
  path: string;

  /**
   * Visibility of the app in the public app store.
   */
  visibility: AppVisibility;

  /**
   * Whether or not the app definition is exposed for display in Appsemble Studio.
   */
  showAppDefinition: boolean;

  /**
   * The Google analytics ID of the app.
   */
  googleAnalyticsID?: string;

  /**
   * Whether the app is currently locked.
   */
  locked: boolean;

  /**
   * Whether the Appsemble password login method should be shown.
   */
  showAppsembleLogin: boolean;

  /**
   * Whether the Appsemble OAuth2 login method should be shown.
   */
  showAppsembleOAuth2Login: boolean;

  /**
   * The Sentry DSN of the app.
   */
  sentryDsn: string;

  /**
   * The Sentry environment associated with the Sentry DSN.
   */
  sentryEnvironment: string;

  /**
   * The app definition.
   */
  definition: AppDefinition;

  /**
   * The app definition formatted as YAML.
   */
  yaml: string;

  /**
   * An app rating.
   */
  rating?: {
    /**
     * The number of people who rated the app.
     */
    count: number;

    /**
     * The average app rating.
     */
    average: number;
  };

  /**
   * Whether the app has clonable resources.
   */
  resources?: boolean;

  /**
   * A list of URLs to app screenshots
   */
  screenshotUrls?: string[];

  /**
   * True if the app has its own icon.
   */
  hasIcon: boolean;

  /**
   * True if the app supports a maskable icon.
   */
  hasMaskableIcon: boolean;

  /**
   * The background color used for maskable icons.
   */
  iconBackground: string;

  /**
   * An app icon url
   */
  iconUrl?: string;

  /**
   * The creation date of the app.
   */
  $created?: string;

  /**
   * The date when the app was last updated.
   */
  $updated?: string;

  /**
   * Any pre-included translations of the app.
   */
  messages?: AppsembleMessages;
}

/**
 * A rating given to an app.
 */
export interface Rating {
  /**
   * A value ranging between 1 and 5 representing the rating
   */
  rating: number;

  /**
   * An optional description of why the rating was given
   */
  description?: string;

  /**
   * The name of the user who rated the app.
   */
  name: string;

  /**
   * The ID of the user who rated the app.
   */
  UserId: string;

  /**
   * The creation date of the rating.
   */
  $created: string;

  /**
   * The date of the last time the rating was updated
   */
  $updated: string;
}

/**
 * The representation of an organization within Appsemble.
 */
export interface Organization {
  /**
   * The ID of the organization.
   *
   * This typically is prepended with an `@`
   */
  id: string;

  /**
   * The display name of the organization.
   */
  name: string;

  /**
   * The description of the organization.
   */
  description: string;

  /**
   * The website of the organization.
   */
  website: string;

  /**
   * The email address that can be used to contact the organization.
   */
  email: string;

  /**
   * The URL at which the organization’s icon can be found.
   */
  iconUrl: string;
}

/**
 * An invite for an organization.
 */
export interface OrganizationInvite {
  /**
   * The email address of the user to invite.
   */
  email: string;

  /**
   * The role the user should get when accepting the invite.
   */
  role: string;
}

/**
 * A member of an app.
 */
export interface AppMember {
  id: string;
  name: string;
  primaryEmail: string;
  role: string;
}

/**
 * The layout used to store Appsemble messages.
 */
export interface AppsembleMessages {
  /**
   * Messages related to the Appsemble core.
   *
   * This may be an empty object if the language is the default locale.
   */
  core: Record<string, string>;

  /**
   * Translations for global block messages and meta properties of the app.
   *
   * This may be an empty object if the language is the default locale.
   */
  app: Record<string, string>;

  /**
   * A list of messages specific to the app.
   */
  messageIds: Record<string, string>;

  /**
   * A list of messages specific to each block used in the app.
   *
   * At root the keys represent a block type.
   * One layer deep the keys represent a block version.
   * Two layers deep the keys represent the key/message pairs.
   *
   * @example
   * {
   *   "<at>example/test": {
   *     "0.0.0": {
   *       "exampleKey": "Example Message"
   *     }
   *   }
   * }
   */
  blocks: Record<string, Record<string, Record<string, string>>>;
}

/**
 * Translated messages for an app or block.
 */
export interface Messages {
  /**
   * If true, force update app messages.
   */
  force?: boolean;

  /**
   * The language represented by these messages.
   */
  language: string;

  /**
   * A mapping of message id to message content.
   */
  messages: AppsembleMessages;
}

export interface AppMessages {
  /**
   * The language represented by these messages.
   */
  language: string;

  /**
   * The messages available to the app
   */
  messages: AppsembleMessages;
}

/**
 * A representation of an OAuth2 provider in Appsemble.
 *
 * This interface holds the properties needed to render a redirect button on the login or profile
 * screen.
 */
export interface OAuth2Provider {
  type?: 'oauth2';

  /**
   * The OAuth2 redirect URL.
   *
   * The user will be redirected here. On this page the user will have to grant access to Appsemble
   * to log them in.
   */
  authorizationUrl: string;

  /**
   * The public client id which identifies Appsemble to the authorization server.
   */
  clientId: string;

  /**
   * A Font Awesome icon which represents the OAuth2 provider.
   */
  icon: IconName;

  /**
   * A display name which represents the OAuth2 provider.
   *
   * I.e. `Facebook`, `GitLab`, or `Google`.
   */
  name: string;

  /**
   * The login scope that will be requested from the authorization server.
   *
   * This is represented as a space separated list of scopes.
   */
  scope: string;
}

export interface AppOAuth2Secret extends OAuth2Provider {
  /**
   * An autogenerated ID.
   */
  id?: number;

  /**
   * The OAuth2 client secret used to identify Appsemble as a client to the authorization server.
   */
  clientSecret: string;

  /**
   * The URL where tokens may be requested using the authorization code flow.
   */
  tokenUrl: string;

  /**
   * The URL from where to fetch user info.
   */
  userInfoUrl?: string;

  /**
   * The remapper to apply on the user info data.
   */
  remapper: Remapper;
}

export interface WritableAppSamlSecret {
  /**
   * The name that will be displayed on the login button.
   */
  name: string;

  /**
   * The icon that will be displayed on the login button.
   */
  icon: IconName;

  /**
   * The certificate of the identity provider.
   */
  idpCertificate: string;

  /**
   * The URL of the identity provider where SAML metadata is hosted.
   */
  entityId: string;

  /**
   * The URL of the identity provider where the user will be redirected to in order to login.
   */
  ssoUrl: string;

  /**
   * The custom SAML attribute that’s used to specify the user display name.
   */
  nameAttribute: string;

  /**
   * The custom SAML attribute that’s used to specify the user email address.
   */
  emailAttribute: string;
}

export interface AppSamlSecret extends WritableAppSamlSecret {
  /**
   * The unique ID of the secret.
   */
  id?: number;

  /**
   * When the secret was last updated.
   */
  updated?: string;

  /**
   * The SAML service provider certificate.
   */
  spCertificate?: string;
}

export type SAMLStatus =
  | 'badsignature'
  | 'emailconflict'
  | 'invalidrelaystate'
  | 'invalidsecret'
  | 'invalidstatuscode'
  | 'invalidsubjectconfirmation'
  | 'missingnameid'
  | 'missingsubject';

/**
 * The block configuration that’s used by the CLI when building a block.
 *
 * This configuration is also passed to the Webpack configuration function as the `env` variable.
 */
export interface BlockConfig
  extends Pick<
    BlockManifest,
    | 'actions'
    | 'description'
    | 'events'
    | 'layout'
    | 'longDescription'
    | 'messages'
    | 'name'
    | 'parameters'
    | 'version'
    | 'visibility'
    | 'wildcardActions'
  > {
  /**
   * The path to the webpack configuration file relative to the block project directory.
   */
  webpack: string;

  /**
   * The build output directory relative to the block project directory.
   */
  output: string;

  /**
   * The absolute directory of the block project.
   */
  dir: string;
}
