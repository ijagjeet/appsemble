import {
  BaseAction,
  ResourceCountAction,
  ResourceCreateAction,
  ResourceDeleteAction,
  ResourceGetAction,
  ResourceQueryAction,
  ResourceUpdateAction,
} from '@appsemble/sdk';
import {
  ResourceCountActionDefinition,
  ResourceCreateActionDefinition,
  ResourceDeleteActionDefinition,
  ResourceGetActionDefinition,
  ResourceQueryActionDefinition,
  ResourceSubscribeActionDefinition,
  ResourceSubscriptionStatusActionDefinition,
  ResourceSubscriptionToggleActionDefinition,
  ResourceUnsubscribeActionDefinition,
  ResourceUpdateActionDefinition,
} from '@appsemble/types';
import axios from 'axios';

import { MakeActionParameters, ServiceWorkerRegistrationContextType } from '../../types';
import { apiUrl, appId } from '../settings';
import { requestLikeAction } from './request';

export function get(args: MakeActionParameters<ResourceGetActionDefinition>): ResourceGetAction {
  const { app, definition } = args;
  const resource = app.resources[definition.resource];
  const method = resource?.get?.method || 'GET';
  const url =
    resource?.get?.url ??
    resource?.url ??
    `${apiUrl}/api/apps/${appId}/resources/${definition.resource}`;
  const { id = 'id' } = resource;

  return {
    ...requestLikeAction({
      ...args,
      definition: {
        ...definition,
        query: definition?.query ?? resource?.get?.query,
        method,
        proxy: false,
        url: {
          'string.format': {
            template: `${url}${url.endsWith('/') ? '' : '/'}{id}`,
            values: { id: { prop: id as string } },
          },
        },
        schema: resource.schema,
      },
    }),
    type: 'resource.get',
  };
}

export function query(
  args: MakeActionParameters<ResourceQueryActionDefinition>,
): ResourceQueryAction {
  const { app, definition } = args;
  const resource = app.resources[definition.resource];
  const method = resource?.query?.method || 'GET';
  const url =
    resource?.query?.url ??
    resource?.url ??
    `${apiUrl}/api/apps/${appId}/resources/${definition.resource}`;

  return {
    ...requestLikeAction({
      ...args,
      definition: {
        ...definition,
        query: definition?.query ?? resource?.query?.query,
        method,
        proxy: false,
        url,
        schema: resource.schema,
      },
    }),
    type: 'resource.query',
  };
}

export function count(
  args: MakeActionParameters<ResourceCountActionDefinition>,
): ResourceCountAction {
  const { app, definition } = args;
  const resource = app.resources[definition.resource];
  const method = resource?.count?.method || 'GET';
  const url =
    resource?.count?.url ??
    resource?.url ??
    `${apiUrl}/api/apps/${appId}/resources/${definition.resource}/$count`;

  return {
    ...requestLikeAction({
      ...args,
      definition: {
        ...definition,
        query: definition?.query ?? resource?.count?.query,
        method,
        proxy: false,
        url,
        schema: resource.schema,
      },
    }),
    type: 'resource.count',
  };
}

export function create(
  args: MakeActionParameters<ResourceCreateActionDefinition>,
): ResourceCreateAction {
  const { app, definition } = args;
  const resource = app.resources[definition.resource];
  const method = resource?.create?.method || 'POST';
  const url =
    resource?.create?.url ||
    resource.url ||
    `${apiUrl}/api/apps/${appId}/resources/${definition.resource}`;

  return {
    ...requestLikeAction({
      ...args,
      definition: {
        ...definition,
        query: definition?.query ?? resource?.create?.query,
        method,
        proxy: false,
        url,
        schema: resource.schema,
      },
    }),
    type: 'resource.create',
  };
}

export function update(
  args: MakeActionParameters<ResourceUpdateActionDefinition>,
): ResourceUpdateAction {
  const { app, definition } = args;
  const resource = app.resources[definition.resource];
  const method = resource?.update?.method || 'PUT';
  const url =
    resource?.update?.url ||
    resource.url ||
    `${apiUrl}/api/apps/${appId}/resources/${definition.resource}`;
  const { id = 'id' } = resource;

  return {
    ...requestLikeAction({
      ...args,
      definition: {
        ...definition,
        query: definition?.query ?? resource?.update?.query,
        method,
        proxy: false,
        url: {
          'string.format': {
            template: `${url}${url.endsWith('/') ? '' : '/'}{id}`,
            values: { id: { prop: id as string } },
          },
        },
        schema: resource.schema,
      },
    }),
    type: 'resource.update',
  };
}

export function remove(
  args: MakeActionParameters<ResourceDeleteActionDefinition>,
): ResourceDeleteAction {
  const { app, definition } = args;
  const resource = app.resources[definition.resource];
  const method = resource?.delete?.method || 'DELETE';
  const url =
    resource?.delete?.url ||
    resource.url ||
    `${apiUrl}/api/apps/${appId}/resources/${definition.resource}`;
  const { id = 'id' } = resource;

  return {
    ...requestLikeAction({
      ...args,
      definition: {
        ...definition,
        query: definition?.query ?? resource?.delete?.query,
        type: 'resource.delete',
        method,
        proxy: false,
        url: {
          'string.format': {
            template: `${url}${url.endsWith('/') ? '' : '/'}{id}`,
            values: { id: { prop: id as string } },
          },
        },
        schema: resource.schema,
      },
    }),
    type: 'resource.delete',
  };
}

export async function getSubscription(
  pushNotifications: ServiceWorkerRegistrationContextType,
): Promise<PushSubscription> {
  const { permission, requestPermission, subscribe: sub } = pushNotifications;
  let { subscription } = pushNotifications;

  if (!subscription && permission === 'default') {
    const newPermission = await requestPermission();
    if (newPermission !== 'granted') {
      throw new Error('Unable to subscribe. Permission was denied.');
    }

    subscription = await sub();
  } else if (permission === 'granted' && !subscription) {
    subscription = await sub();
  } else if (permission === 'denied') {
    throw new Error('Unable to subscribe. Permission was denied.');
  }

  return subscription;
}

export function subscribe({
  app,
  definition,
  pushNotifications,
}: MakeActionParameters<ResourceSubscribeActionDefinition>): BaseAction<'resource.subscription.subscribe'> {
  const resource = app.resources[definition.resource];
  const { id = 'id' } = resource;

  return {
    dispatch: async (data) => {
      const { endpoint } = await getSubscription(pushNotifications);
      await axios.patch(`${apiUrl}/api/apps/${appId}/subscriptions`, {
        endpoint,
        resource: definition.resource,
        action: definition.action || 'update',
        value: true,
        ...(data?.[id] && { resourceId: data[id] }),
      });

      return data;
    },
    type: 'resource.subscription.subscribe',
  };
}

export function unsubscribe({
  app,
  definition,
  pushNotifications,
}: MakeActionParameters<ResourceUnsubscribeActionDefinition>): BaseAction<'resource.subscription.unsubscribe'> {
  const resource = app.resources[definition.resource];
  const { id = 'id' } = resource;

  return {
    dispatch: async (data) => {
      const { endpoint } = await getSubscription(pushNotifications);
      await axios.patch(`${apiUrl}/api/apps/${appId}/subscriptions`, {
        endpoint,
        resource: definition.resource,
        action: definition.action || 'update',
        value: false,
        ...(data?.[id] && { resourceId: data[id] }),
      });

      return data;
    },
    type: 'resource.subscription.unsubscribe',
  };
}

export function toggleSubscribe({
  app,
  definition,
  pushNotifications,
}: MakeActionParameters<ResourceSubscriptionToggleActionDefinition>): BaseAction<'resource.subscription.toggle'> {
  const resource = app.resources[definition.resource];
  const { id = 'id' } = resource;

  return {
    dispatch: async (data) => {
      const { endpoint } = await getSubscription(pushNotifications);
      await axios.patch(`${apiUrl}/api/apps/${appId}/subscriptions`, {
        endpoint,
        resource: definition.resource,
        action: definition.action || 'update',
        ...(data?.[id] && { resourceId: data[id] }),
      });

      return data;
    },
    type: 'resource.subscription.toggle',
  };
}

export function subscriptionStatus({
  app,
  definition,
  pushNotifications,
}: MakeActionParameters<ResourceSubscriptionStatusActionDefinition>): BaseAction<'resource.subscription.status'> {
  const resource = app.resources[definition.resource];
  const { id = 'id' } = resource;

  return {
    dispatch: async (d) => {
      const { endpoint } = await getSubscription(pushNotifications);
      const { data } = await axios.get(
        d?.[id]
          ? `${apiUrl}/api/apps/${appId}/resources/${definition.resource}/${d[id]}/subscriptions`
          : `${apiUrl}/api/apps/${appId}/resources/${definition.resource}/subscriptions`,
        {
          params: { endpoint },
        },
      );

      return data;
    },
    type: 'resource.subscription.status',
  };
}
