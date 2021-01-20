import { Action } from '@appsemble/sdk';
import {
  ActionDefinition,
  ActionType,
  BlockDefinition,
  FlowPageDefinition,
} from '@appsemble/types';
import { addBreadcrumb, Severity } from '@sentry/browser';

import { MakeActionParameters } from '../types';
import { ActionCreator, ActionCreators, actionCreators } from './actions';

interface CommonActionParams {
  extraCreators: ActionCreators;
  pageReady: Promise<void>;
}

type MakeActionsParams = Omit<MakeActionParameters<ActionDefinition>, 'definition'> &
  CommonActionParams & {
    actions: Record<string, ActionType>;
    context: BlockDefinition | FlowPageDefinition;
  };

function createAction({
  definition,
  extraCreators,
  pageReady,
  prefix,
  remap,
  ...params
}: MakeActionParameters<ActionDefinition> & CommonActionParams): Action {
  const type = definition?.type ?? 'noop';
  const actionCreator: ActionCreator = actionCreators[type] || extraCreators[type];

  const action = actionCreator({
    ...params,
    definition,
    remap,
    prefix,
  });

  const onSuccess =
    definition?.onSuccess &&
    createAction({
      ...params,
      definition: definition.onSuccess,
      extraCreators,
      pageReady,
      prefix: `${prefix}.onSuccess`,
      remap,
    });
  const onError =
    definition?.onError &&
    createAction({
      ...params,
      definition: definition.onError,
      extraCreators,
      pageReady,
      prefix: `${prefix}.onError`,
      remap,
    });

  const { dispatch } = action;
  if (definition) {
    action.dispatch = async (args: any, context: Record<string, any>) => {
      await pageReady;
      let result;

      try {
        result = await dispatch(
          Object.hasOwnProperty.call(definition, 'remap')
            ? remap(definition.remap, args, context)
            : args,
        );
        addBreadcrumb({
          category: 'appsemble.action',
          data: { success: action.type },
        });
      } catch (error: unknown) {
        addBreadcrumb({
          category: 'appsemble.action',
          data: { failed: action.type },
          level: Severity.Warning,
        });
        if (onError) {
          return onError.dispatch(error, context);
        }

        throw error;
      }

      if (onSuccess) {
        return onSuccess.dispatch(result, context);
      }

      return result;
    };
  }

  return action;
}

export function makeActions({
  actions,
  context,
  prefix,
  ...params
}: MakeActionsParams): Record<string, Action> {
  const actionMap = Object.entries(actions || {})
    .filter(([key]) => key !== '$any')
    .reduce<Record<string, Action>>((acc, [on, { required }]) => {
      let definition: ActionDefinition;
      if (!context.actions || !Object.hasOwnProperty.call(context.actions, on)) {
        if (required) {
          throw new Error(`Missing required action ${on}`);
        }
      } else {
        definition = context.actions[on as keyof typeof context.actions];
      }

      const action = createAction({
        ...params,
        definition,
        prefix: `${prefix}.actions.${on}`,
      });

      acc[on] = action;
      return acc;
    }, {});

  let anyActions: Record<string, Action>;
  if (actions?.$any) {
    anyActions = Object.keys(context.actions || {})
      .filter((key) => !actionMap[key])
      .reduce<Record<string, Action>>((acc, on: keyof typeof context.actions) => {
        const definition = context.actions[on];

        const action = createAction({
          ...params,
          definition,
          prefix: `${prefix}.actions.${on}`,
        });

        acc[on] = action;
        return acc;
      }, {});
  }

  return { ...anyActions, ...actionMap };
}
