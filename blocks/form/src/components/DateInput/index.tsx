import { useBlock } from '@appsemble/preact';
import { DateTimeField } from '@appsemble/preact-components';
import classNames from 'classnames';
import { JSX, VNode } from 'preact';
import { useCallback, useMemo } from 'preact/hooks';

import { DateField, InputProps } from '../../../block.js';
import { useLocale } from '../../hooks/useLocale.js';
import { extractDate } from '../../utils/extractDate.js';
import { getDisabledDays, getMaxDate, getMinDate } from '../../utils/requirements.js';

type DateTimeInputProps = InputProps<string, DateField>;

/**
 * An input element for a date value.
 */
export function DateInput({
  className,
  dirty,
  disabled,
  error,
  field,
  onChange,
  readOnly,
  required,
  value = null,
}: DateTimeInputProps): VNode {
  const { utils } = useBlock();
  const { inline, label, name, placeholder, tag } = field;

  const dateLabel = utils.remap(label, value) as string;
  const confirmLabel = utils.formatMessage('confirmLabel');

  const handleOnChange = useCallback(
    (event: JSX.TargetedEvent<HTMLInputElement>, v: string): void =>
      onChange(event, extractDate(new Date(v))),
    [onChange],
  );

  const maxDate = useMemo(() => extractDate(getMaxDate(field, utils)), [field, utils]);
  const minDate = useMemo(() => extractDate(getMinDate(field, utils)), [field, utils]);
  const disable = useMemo(() => getDisabledDays(field), [field]);

  const locale = useLocale(field);

  return (
    <DateTimeField
      className={classNames(className)}
      confirm={field.confirm}
      confirmLabel={confirmLabel}
      // @ts-expect-error There’s a mismatch between the `Remapper` type in the shared types and
      // the SDK.
      dateFormat={field.dateFormat}
      disable={disable}
      disabled={disabled}
      error={dirty ? error : null}
      icon={field.icon}
      id={name}
      inline={inline}
      label={dateLabel}
      locale={locale}
      maxDate={maxDate}
      minDate={minDate}
      name={name}
      onChange={handleOnChange}
      optionalLabel={utils.formatMessage('optionalLabel')}
      placeholder={(utils.remap(placeholder, value) as string) || dateLabel || name}
      readOnly={readOnly}
      required={required}
      tag={utils.remap(tag, value) as string}
      value={value}
    />
  );
}
