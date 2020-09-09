import { CheckboxField, MarkdownContent } from '@appsemble/react-components';
import React, { ReactElement } from 'react';

import type { CommonJSONSchemaEditorProps } from '../../types';
import { JSONSchemaLabel } from '../JSONSchemaLabel';

export function JSONSchemaBooleanEditor({
  disabled,
  name,
  onChange,
  prefix,
  required,
  schema,
  value = false,
}: CommonJSONSchemaEditorProps<boolean>): ReactElement {
  return (
    <CheckboxField
      disabled={disabled}
      help={<MarkdownContent content={schema.description} />}
      label={<JSONSchemaLabel name={name} prefix={prefix} schema={schema} />}
      name={name}
      onChange={onChange}
      required={required}
      title={name.split(/\./g).pop()}
      value={value}
    />
  );
}
