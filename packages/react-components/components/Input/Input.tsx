import classNames from 'classnames';
import * as React from 'react';

import FormComponent, { FormComponentProps } from '../FormComponent';

type InteractiveElement = HTMLInputElement | HTMLTextAreaElement;

type InputProps = FormComponentProps &
  Omit<React.HTMLProps<InteractiveElement>, 'label' | 'onChange'> & {
    /**
     * An error message to render.
     */
    error?: React.ReactNode;

    /**
     * A help message to render.
     */
    help?: React.ReactNode;

    /**
     * The name of the HTML element.
     */
    name: string;

    /**
     * This is fired when the input value has changed.
     *
     * If the input type is `checkbox`, the value is a boolean. If the input type is `number`, the
     * value is a number, otherwise it is a string.
     */
    onChange: (
      event: React.ChangeEvent<InteractiveElement>,
      value: boolean | number | string,
    ) => void;

    /**
     * The HTML input type.
     *
     * This may be extended if necessary.
     */
    type?:
      | 'checkbox'
      | 'color'
      | 'email'
      | 'number'
      | 'password'
      | 'search'
      | 'tel'
      | 'text'
      | 'textarea'
      | 'url';
  };

/**
 * A Bulma styled form input element.
 */
export default class Input extends React.Component<InputProps> {
  onChange = (event: React.ChangeEvent<InteractiveElement>) => {
    const { onChange, type } = this.props;

    let value;
    switch (type) {
      case 'checkbox':
        value = (event.target as HTMLInputElement).checked;
        break;
      case 'number':
        value = (event.target as HTMLInputElement).valueAsNumber;
        break;
      default:
        ({ value } = event.target);
    }
    onChange(event, value);
  };

  render(): JSX.Element {
    const {
      error,
      iconLeft,
      help,
      label,
      name,
      onChange,
      required,
      type,
      id = name,
      ...props
    } = this.props;

    const Component = type === 'textarea' ? 'textarea' : 'input';

    return (
      <FormComponent iconLeft={iconLeft} id={id} label={label} required={required}>
        <Component
          {...(props as React.HTMLProps<HTMLInputElement & HTMLTextAreaElement>)}
          className={classNames('input', { 'is-danger': error })}
          id={id}
          name={name}
          onChange={this.onChange}
          required={required}
        />
        {iconLeft && (
          <span className="icon is-left">
            <i className={`fas fa-${iconLeft}`} />
          </span>
        )}
        {help && <p className="help">{help}</p>}
        {React.isValidElement(error) && <p className="help is-danger">{error}</p>}
      </FormComponent>
    );
  }
}
