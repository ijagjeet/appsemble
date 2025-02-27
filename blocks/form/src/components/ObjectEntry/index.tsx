import { VNode } from 'preact';
import { useCallback } from 'preact/hooks';

import { FieldErrorMap, InputProps, ObjectField, Values } from '../../../block.js';
import { FieldGroup } from '../FieldGroup/index.js';

interface ObjectEntryProps extends InputProps<Values, ObjectField> {
  /**
   * If defined, the index is used in the change `onChange` handler instead of the field name.
   */
  index?: number;
}

/**
 * An input element for a simple object entry.
 */
export function ObjectEntry({
  disabled,
  error,
  field,
  index,
  name,
  onChange,
  value,
}: ObjectEntryProps): VNode {
  const onChangeIndex = useCallback(
    (localName: string, values: Values | Values) => {
      onChange(String(index), values);
    },
    [index, onChange],
  );

  return (
    <FieldGroup
      disabled={disabled}
      errors={error as FieldErrorMap}
      fields={field.fields}
      name={name}
      onChange={index == null ? onChange : onChangeIndex}
      value={value}
    />
  );
}
