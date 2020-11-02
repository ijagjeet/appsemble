import { useBlock } from '@appsemble/preact';
import { DateTimeField as DateTimeComponent } from '@appsemble/preact-components';
import { h, VNode } from 'preact';
import { useCallback, useMemo } from 'preact/hooks';

import { DateField, InputProps } from '../../../block';
import { getMaxDate, getMinDate, isRequired } from '../../utils/requirements';

type DateTimeInputProps = InputProps<string, DateField>;

/**
 * An input element for a date value.
 */
export function DateInput({
  dirty,
  disabled,
  error,
  field,
  onChange,
  value = null,
}: DateTimeInputProps): VNode {
  const {
    parameters: { invalidLabel = 'This value is invalid', optionalLabel },
    utils,
  } = useBlock();
  const { label, name, placeholder, readOnly, tag } = field;

  const checkboxLabel = utils.remap(label, value);

  const required = isRequired(field);

  const handleOnChange = useCallback(
    (event: h.JSX.TargetedEvent<HTMLInputElement>, v: string): void => {
      const date = new Date(v);
      onChange(event, `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`);
    },
    [onChange],
  );

  const maxDate = useMemo(() => {
    const d = getMaxDate(field);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  }, [field]);
  const minDate = useMemo(() => {
    const d = getMinDate(field);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  }, [field]);

  return (
    <DateTimeComponent
      disabled={disabled}
      error={dirty && error && utils.remap(invalidLabel, value)}
      id={name}
      label={checkboxLabel}
      maxDate={maxDate}
      minDate={minDate}
      name={name}
      onChange={handleOnChange}
      optionalLabel={utils.remap(optionalLabel, value)}
      placeholder={utils.remap(placeholder, value)}
      readOnly={readOnly}
      required={required}
      tag={utils.remap(tag, value)}
      value={value}
    />
  );
}
