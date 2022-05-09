import 'flatpickr/dist/flatpickr.css';

import { useBlock } from '@appsemble/preact';
import flatpickr from 'flatpickr';
import { ComponentProps, JSX, VNode } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import { FormComponent, Input, SharedFormComponentProps } from '..';

type DateTimeFieldProps = Omit<ComponentProps<typeof Input>, 'error'> &
  Pick<
    flatpickr.Options.Options,
    | 'disable'
    | 'enableTime'
    | 'locale'
    | 'maxDate'
    | 'maxTime'
    | 'minDate'
    | 'minTime'
    | 'minuteIncrement'
    | 'mode'
    | 'noCalendar'
  > &
  SharedFormComponentProps & {
    /**
     * If true, the value is emitted as an ISO8601 formatted string. Otherwise, a Date object is
     * used.
     */
    iso?: boolean;

    /**
     * The change handler.
     *
     * @param event - An object with the properties `target` and `currentTarget` set to the input
     * element, to emulate an event.
     * @param value - The value that was selected.
     */
    onChange?: (event: JSX.TargetedEvent<HTMLInputElement>, value: Date | string) => void;

    /**
     * The current value as a Date object or an ISO8601 formatted string.
     */
    value: Date | string;
  };

export function DateTimeField({
  className,
  disable,
  disabled,
  enableTime,
  noCalendar,
  error,
  help,
  icon,
  iso,
  label,
  locale,
  mode = 'single',
  name,
  onChange,
  optionalLabel,
  required,
  tag,
  value,
  minDate,
  maxDate,
  minTime = '00:00',
  maxTime = '23:59',
  id = name,
  minuteIncrement = 5,
  ...props
}: DateTimeFieldProps): VNode {
  const wrapper = useRef<HTMLDivElement>();
  const positionElement = useRef<HTMLDivElement>();
  const [picker, setPicker] = useState<flatpickr.Instance>(null);
  const {
    utils: { remap },
  } = useBlock();

  const handleChange = useCallback(
    (event: JSX.TargetedEvent<HTMLInputElement>) => {
      if (picker) {
        onChange(event, iso ? picker.selectedDates[0].toISOString() : picker.selectedDates[0]);
      }
    },
    [onChange, picker, iso],
  );

  useEffect(() => {
    if (disabled) {
      return;
    }

    let template = '';
    if (!noCalendar) {
      template += '{date, date, full}';
      if (enableTime) {
        template += ' ';
      }
    }

    if (enableTime) {
      template += '{date, time, short}';
    }

    const p = flatpickr(wrapper.current, {
      appendTo: wrapper.current,
      enableTime,
      locale,
      noCalendar,
      mode,
      positionElement: positionElement.current,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      time_24hr: true,
      wrap: true,
      ...(disable?.length && { disable }),
      minDate,
      maxDate,
      minTime,
      maxTime,
      minuteIncrement,
      formatDate: (date) =>
        remap(
          {
            'string.format': {
              template,
              values: {
                date: { static: date },
              },
            },
          },
          null,
        ) as string,
    });

    setPicker(p);

    return () => {
      p.destroy();
      setPicker(null);
    };
  }, [
    disable,
    disabled,
    enableTime,
    locale,
    maxDate,
    maxTime,
    minDate,
    minTime,
    minuteIncrement,
    mode,
    noCalendar,
    remap,
  ]);

  useEffect(() => {
    picker?.setDate(new Date(value));
  }, [picker, value]);

  return (
    <FormComponent
      className={className}
      error={error}
      help={help}
      icon={icon}
      id={id}
      label={label}
      optionalLabel={optionalLabel}
      ref={wrapper}
      required={required}
      tag={tag}
    >
      <div ref={positionElement} />
      <Input
        {...props}
        className="is-fullwidth"
        data-input
        disabled={disabled}
        id={id}
        name={name}
        onChange={handleChange}
      />
    </FormComponent>
  );
}
