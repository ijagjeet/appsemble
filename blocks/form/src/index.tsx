import { bootstrap } from '@appsemble/preact';
import { Button, Form, FormButtons, Message } from '@appsemble/preact-components';
import classNames from 'classnames';
import { h } from 'preact';
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';

import { Values } from '../block';
import { FormInput } from './components/FormInput';
import styles from './index.css';
import { generateDefaultValidity } from './utils/generateDefaultValidity';
import { generateDefaultValues } from './utils/generateDefaultValues';
import { isFormValid } from './utils/validity';

bootstrap(
  ({
    actions,
    data,
    events,
    parameters: {
      fields,
      formRequirementError = 'One of the requirements of this form is invalid.',
      previousLabel,
      requirements,
      submitError = 'There was a problem submitting this form',
      submitLabel = 'Submit',
    },
    ready,
    utils,
  }) => {
    const defaultValues = useMemo<Values>(() => ({ ...generateDefaultValues(fields), ...data }), [
      data,
      fields,
    ]);

    const [formErrors, setFormErrors] = useState<string[]>(
      new Array(requirements?.length ?? 0).fill(null),
    );
    const [submitErrorResult, setSubmitErrorResult] = useState<string>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [values, setValues] = useState(defaultValues);
    const [lastChanged, setLastChanged] = useState<string>(null);
    const errors = useMemo(() => generateDefaultValidity(fields, values, utils), [
      fields,
      utils,
      values,
    ]);

    const lock = useRef<symbol>();

    const onChange = useCallback((name: string, value: Values) => {
      setValues((oldValues) => ({ ...oldValues, [name]: value }));
      setLastChanged(name);
    }, []);

    useEffect(() => {
      events.emit.change(values);

      if (!lastChanged) {
        return;
      }

      // Filter requirements whose dependencies haven’t changed and whose dependencies are valid.
      const pendingRequirements = requirements?.filter(
        ({ isValid }) => isValid.includes(lastChanged) && isFormValid(errors, isValid),
      );

      // If there are no pending requirements checks, don’t run asynchronous validation.
      if (!pendingRequirements?.length) {
        return;
      }

      const token = Symbol('Async requirements lock');
      lock.current = token;

      const requirementErrors = new Map<number, string>();
      Promise.all(
        pendingRequirements.map((requirement) =>
          actions[requirement.action].dispatch(values).then(
            () => requirementErrors.set(requirements.indexOf(requirement), null),
            (errorResponse) => {
              requirementErrors.set(
                requirements.indexOf(requirement),
                utils.remap(requirement.errorMessage ?? formRequirementError, values, {
                  error: errorResponse,
                }),
              );
            },
          ),
        ),
      ).then((patchedValues) => {
        if (lock.current !== token) {
          return;
        }
        setValues((oldValues) => Object.assign({}, oldValues, ...patchedValues));
        setLastChanged(null);
        setFormErrors((oldErrors) =>
          oldErrors.map((old, index) =>
            requirementErrors.has(index) ? requirementErrors.get(index) : old,
          ),
        );
      });
    }, [actions, errors, events, formRequirementError, lastChanged, requirements, utils, values]);

    const onSubmit = useCallback(() => {
      if (!submitting) {
        setSubmitting(true);
        const keys = fields.map((field) => field.name);

        if (!isFormValid(errors, keys) || formErrors.some(Boolean)) {
          setSubmitting(false);
          return;
        }

        actions.onSubmit
          .dispatch(values)
          .catch((submitActionError: unknown) => {
            // Log the error to the console for troubleshooting.
            // eslint-disable-next-line no-console
            console.error(submitActionError);
            const error =
              typeof submitActionError === 'string'
                ? submitActionError
                : utils.remap(submitError, values);
            setSubmitErrorResult(error);
          })
          .finally(() => setSubmitting(false));
      }
    }, [actions, errors, fields, formErrors, submitError, submitting, utils, values]);

    const onPrevious = useCallback(() => {
      actions.onPrevious.dispatch(values);
    }, [actions, values]);

    const receiveData = useCallback(
      (d: Values) => {
        const newValues = { ...defaultValues, ...d };
        setLoading(false);
        setValues(newValues);

        const requirementErrors = new Map<number, string>();
        Promise.all(
          requirements.map((requirement) =>
            actions[requirement.action].dispatch(newValues).then(
              () => requirementErrors.set(requirements.indexOf(requirement), null),
              (errorResponse) => {
                requirementErrors.set(
                  requirements.indexOf(requirement),
                  utils.remap(requirement.errorMessage ?? formRequirementError, newValues, {
                    error: errorResponse,
                  }),
                );
              },
            ),
          ),
        ).then((patchedValues) => {
          setValues((oldValues) => Object.assign({}, oldValues, ...patchedValues));
          setFormErrors((oldErrors) =>
            oldErrors.map((old, index) =>
              requirementErrors.has(index) ? requirementErrors.get(index) : old,
            ),
          );
        });
      },
      [actions, defaultValues, formRequirementError, requirements, utils],
    );

    useEffect(() => {
      events.emit.change(values);
    }, [events, values]);

    useEffect(() => {
      // If a listener is present, wait until data has been received
      const hasListener = events.on.data(receiveData);
      setLoading(hasListener);
      ready();
    }, [events, ready, receiveData]);

    return (
      <Form className={`${styles.root} is-flex px-2 py-2`} onSubmit={onSubmit}>
        {loading && <progress className="progress is-small is-primary" />}
        <Message
          className={classNames(styles.error, { [styles.hidden]: !formErrors.some(Boolean) })}
          color="danger"
        >
          {/* Render the first form error */}
          <span>{formErrors.find(Boolean)}</span>
        </Message>
        <Message
          className={classNames(styles.error, { [styles.hidden]: submitErrorResult == null })}
          color="danger"
        >
          <span>{submitErrorResult}</span>
        </Message>
        {fields.map((f) => (
          <FormInput
            disabled={loading || submitting}
            error={errors[f.name]}
            field={f}
            key={f.name}
            name={f.name}
            onChange={onChange}
            value={values[f.name]}
          />
        ))}
        <FormButtons className="mt-4">
          {previousLabel && (
            <Button className="mr-4" disabled={loading || submitting} onClick={onPrevious}>
              {utils.remap(previousLabel, {})}
            </Button>
          )}
          <Button
            color="primary"
            disabled={loading || submitting || formErrors.some(Boolean) || !isFormValid(errors)}
            type="submit"
          >
            {utils.remap(submitLabel, {})}
          </Button>
        </FormButtons>
      </Form>
    );
  },
);
