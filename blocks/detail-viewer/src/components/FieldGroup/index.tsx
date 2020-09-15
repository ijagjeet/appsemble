import { useBlock } from '@appsemble/preact/src';
import { h, VNode } from 'preact';

import type { FieldGroup as FieldGroupType, RendererProps } from '../../../block';
import { Field } from '../Field';

/**
 * Renders a group of fields.
 */
export function FieldGroup({ data, field }: RendererProps<FieldGroupType>): VNode {
  const { utils } = useBlock();

  const label = utils.remap(field.label, data);
  const value = utils.remap(field.value, data);

  return (
    <div className="appsemble-group">
      {label ? <h6 className="title is-6">{label}</h6> : null}
      {Array.isArray(value)
        ? value.flatMap((val) =>
            field.fields.map((subField, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <Field data={val} field={subField} key={index} />
            )),
          )
        : field.fields.map((subField, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <Field data={value} field={subField} key={index} />
          ))}
    </div>
  );
}
