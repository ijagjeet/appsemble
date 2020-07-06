import { Select } from '@appsemble/react-components';
import type { App } from '@appsemble/types';
import type { NamedEvent } from '@appsemble/web-utils';
import React, { ReactElement, useCallback } from 'react';
import { FormattedMessage } from 'react-intl';

import messages from './messages';

interface LinkActionEditorProps {
  app: App;
  value: any;
  onChange: (event: NamedEvent, value?: any) => void;
}

export default function LinkActionEditor({
  app,
  onChange,
  value = {},
}: LinkActionEditorProps): ReactElement {
  const handleChange = useCallback(
    (event: NamedEvent, val) => {
      onChange(event, { ...value, [event.target.name]: val });
    },
    [onChange, value],
  );

  return (
    <div>
      <Select
        help={<FormattedMessage {...messages.toHelp} />}
        label={<FormattedMessage {...messages.toLabel} />}
        name="to"
        onChange={handleChange}
        required
        value={value.to}
      >
        <option disabled hidden>
          <FormattedMessage {...messages.empty} />
        </option>
        {Object.values(app.definition.pages).map((page) => (
          <option key={page.name} value={page.name}>
            {page.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
