/** @jsx h */
import { BlockProps, FormattedMessage } from '@appsemble/preact';
import classNames from 'classnames';
import { Component, h, VNode } from 'preact';

import { Actions, Field, Parameters } from '../../../block';
import BooleanInput from '../BooleanInput';
import EnumInput from '../EnumInput';
import FileInput from '../FileInput';
import GeoCoordinatesInput from '../GeoCoordinatesInput';
import NumberInput from '../NumberInput';
import StringInput from '../StringInput';
import styles from './FormBlock.css';

type FormBlockProps = BlockProps<Parameters, Actions>;

type Values = Record<string, any>;

type Validator = (field: Field, event: Event, value: any) => boolean;

interface FormBlockState {
  errors: {
    [name: string]: string;
  };
  validity: {
    [name: string]: boolean;
  };
  submitting: boolean;
  values: Values;
}

const inputs = {
  file: FileInput,
  geocoordinates: GeoCoordinatesInput,
  hidden: (): null => null,
  string: StringInput,
  number: NumberInput,
  integer: NumberInput,
  boolean: BooleanInput,
};

const validateInput: Validator = (_field, event) => {
  return (event.target as HTMLInputElement).validity.valid;
};

const validators: { [name: string]: Validator } = {
  file: (field, _event, value) => {
    if (!field.required) {
      return true;
    }

    if (field.accept) {
      if (field.repeated) {
        return (
          (value as File[]).every(file => field.accept.includes(file.type)) &&
          (value as File[]).length >= 1
        );
      }
      return field.accept.includes((value as File).type);
    }

    return true;
  },
  geocoordinates: (_, _event, value: { longitude: number; latitude: number }) => {
    return !!(value.latitude && value.longitude);
  },
  hidden: (): boolean => true,
  string: validateInput,
  number: validateInput,
  integer: validateInput,
  boolean: () => true,
  bool: () => true,
};

/**
 * Render Material UI based a form based on a JSON schema
 */
export default class FormBlock extends Component<FormBlockProps, FormBlockState> {
  state: FormBlockState = {
    errors: {},
    validity: {
      ...this.props.block.parameters.fields.reduce<{ [name: string]: boolean }>(
        (acc, { name, defaultValue, required, type }) => {
          let valid = !required;
          if (required && defaultValue === undefined) {
            valid = false;
          }
          if ((type as any) === 'boolean') {
            valid = true;
          }
          acc[name] = valid;
          return acc;
        },
        {},
      ),
    },
    submitting: false,
    values: {
      ...this.props.block.parameters.fields.reduce<Values>(
        (acc, { name, defaultValue, repeated }) => {
          acc[name] = defaultValue || (repeated && []);
          return acc;
        },
        {},
      ),
      ...this.props.data,
    },
  };

  validateField = (event: Event, value: any): boolean => {
    const {
      block: {
        parameters: { fields },
      },
    } = this.props;

    const { name } = event.target as HTMLInputElement;
    const field = fields.find(f => f.name === name);

    return validators[field.type](field, event, value);
  };

  onChange = (event: Event, value: any) => {
    const { name } = event.target as HTMLInputElement;
    const valid = this.validateField(event, value);

    this.setState(({ errors, validity, values }) => ({
      values: {
        ...values,
        [(event.target as HTMLInputElement).name]: value,
      },
      errors: { ...errors, [name]: valid ? null : 'Invalid' },
      validity: { ...validity, [name]: valid },
    }));
  };

  onSubmit = (event: Event) => {
    event.preventDefault();

    this.setState(({ submitting, values }, { actions }) => {
      if (!submitting) {
        actions.onSubmit
          .dispatch(values)
          .then(() => {
            this.setState({
              submitting: false,
            });
            return actions.onSubmitSuccess.dispatch(values);
          })
          .catch(error => {
            if (error.message !== 'Schema Validation Failed') {
              this.setState({
                submitting: false,
              });
              throw error;
            }
            this.setState({
              errors: error.data,
              submitting: false,
            });
          });
      }
      return {
        submitting: true,
      };
    });
  };

  render(): VNode {
    const { block } = this.props;
    const { errors, validity, submitting, values } = this.state;

    return (
      <form className={styles.root} noValidate onSubmit={this.onSubmit}>
        {block.parameters.fields.map(field => {
          if (field.enum) {
            return (
              <EnumInput
                key={field.name}
                error={errors[field.name]}
                field={field}
                onInput={this.onChange}
                value={values[field.name]}
              />
            );
          }
          if (!Object.prototype.hasOwnProperty.call(inputs, field.type)) {
            return <FormattedMessage id="unsupported" />;
          }
          const Comp = inputs[field.type];
          return (
            <Comp
              key={field.name}
              error={errors[field.name]}
              field={field}
              onInput={this.onChange}
              value={values[field.name]}
            />
          );
        })}
        <div className={styles.buttonWrapper}>
          <button
            className={classNames('button', 'is-primary', styles.submit)}
            disabled={!Object.values(validity).every(v => v) || submitting}
            type="submit"
          >
            <FormattedMessage id="submit" />
          </button>
        </div>
      </form>
    );
  }
}
