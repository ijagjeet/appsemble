import React, {
  ComponentPropsWithoutRef,
  createContext,
  ReactElement,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';
import type { Promisable } from 'type-fest';

import Form from '../Form';

interface SimpleFormProps<T>
  extends Omit<ComponentPropsWithoutRef<typeof Form>, 'onSubmit' | 'ref'> {
  children: ReactNode;
  defaultValues: T;
  onSubmit: (values: T) => Promisable<void>;
  preprocess?: (name: string, newValues: T, oldValues: T) => T;
  resetOnSuccess?: boolean;
}

interface FormErrors {
  [field: string]: ReactNode;
}

interface FormValues {
  [field: string]: any;
}

interface SimpleFormContext {
  formErrors: FormErrors;
  pristine: boolean;
  setFormError: (name: string, errorMessage: ReactNode) => void;
  setValue: (name: string, value: any, errorMessage?: ReactNode) => void;
  setValues: (values: FormValues) => void;
  submitError?: Error;
  submitting: boolean;
  values: FormValues;
}

const Context = createContext<SimpleFormContext>(null);

export default function SimpleForm<T extends {}>({
  children,
  defaultValues,
  onSubmit,
  preprocess,
  resetOnSuccess,
  ...props
}: SimpleFormProps<T>): ReactElement {
  const [values, setValues] = useState(defaultValues);
  const [submitError, setSubmitError] = useState<Error>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [pristine, setPristine] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setValues(defaultValues);
    setPristine(true);
  }, [defaultValues]);

  const doSubmit = useCallback(async () => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      setSubmitError(err);
      return;
    } finally {
      setSubmitting(false);
    }
    setSubmitError(null);
    if (resetOnSuccess) {
      reset();
    }
  }, [onSubmit, reset, resetOnSuccess, values]);

  const setFormError = useCallback(
    (name: string, errorMessage?: ReactNode) => {
      setFormErrors({
        ...formErrors,
        [name]: errorMessage,
      });
    },
    [formErrors],
  );

  const setValue = useCallback(
    (name: string, value: any, errorMessage?: ReactNode) => {
      setPristine(false);
      let newValues = {
        ...values,
        [name]: value,
      };
      if (preprocess) {
        newValues = preprocess(name, newValues, values);
      }
      setValues(newValues);
      setFormError(name, errorMessage);
    },
    [preprocess, setFormError, values],
  );

  return (
    <Form {...props} onSubmit={doSubmit}>
      <Context.Provider
        value={{
          formErrors,
          pristine,
          setFormError,
          setValue,
          setValues,
          submitError,
          submitting,
          values,
        }}
      >
        {children}
      </Context.Provider>
    </Form>
  );
}

export function useSimpleForm(): SimpleFormContext {
  return useContext(Context);
}
