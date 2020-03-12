import {
  Button,
  Checkbox,
  Form,
  FormComponent,
  Icon,
  Input,
  useMessages,
  useObjectURL,
} from '@appsemble/react-components';
import { normalize } from '@appsemble/utils';
import axios from 'axios';
import React, { FormEvent, ReactText, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';

import { useApp } from '../AppContext/AppContext';
import styles from './AppSettings.css';
import messages from './messages';

export default function AppSettings(): React.ReactElement {
  const { app } = useApp();
  const intl = useIntl();
  const [icon, setIcon] = useState<File>();
  const [inputs, setInputs] = useState(app);
  const push = useMessages();
  const iconUrl = useObjectURL(icon || app.iconUrl);

  const onSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const data = new FormData();

    if (app.domain !== inputs.domain) {
      data.set('domain', inputs.domain);
    }

    if (app.path !== inputs.path) {
      data.set('path', inputs.path);
    }

    if (app.private !== inputs.private) {
      data.set('private', String(inputs.private));
    }

    if (icon) {
      data.set('icon', icon);
    }

    try {
      await axios.patch(`/api/apps/${app.id}`, data);
      push({ color: 'success', body: intl.formatMessage(messages.updateSuccess) });
    } catch (ex) {
      push({ color: 'danger', body: intl.formatMessage(messages.updateError) });
    }
  };

  const onChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>, value: ReactText | boolean) => {
      event.persist();
      setInputs(val => ({ ...val, [event.target.name]: value }));
    },
    [],
  );

  const onIconChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    setIcon(e.target.files[0]);
  }, []);

  return (
    <Form onSubmit={onSubmit}>
      <FormComponent id="icon-upload" label={<FormattedMessage {...messages.icon} />}>
        <figure className={`image is-128x128 ${styles.iconContainer}`}>
          <img alt={intl.formatMessage(messages.icon)} className={styles.icon} src={iconUrl} />
        </figure>
        <div className="file has-name">
          <label className="file-label" htmlFor="icon-upload">
            <input
              accept="image/jpeg, image/png, image/tiff, image/webp"
              className="file-input"
              id="icon-upload"
              name="icon"
              onChange={onIconChange}
              type="file"
            />
            <span className="file-cta">
              <Icon icon="upload" />
              <span className="file-label">
                <FormattedMessage {...messages.icon} />
              </span>
            </span>
            <span className="file-name">
              {icon?.name || <FormattedMessage {...messages.noFile} />}
            </span>
          </label>
        </div>
        <p className="help">
          <FormattedMessage {...messages.iconDescription} />
        </p>
      </FormComponent>
      <div className={styles.private}>
        <Checkbox
          className="is-marginless"
          help={<FormattedMessage {...messages.private} />}
          label={<FormattedMessage {...messages.privateLabel} />}
          name="private"
          onChange={onChange}
          value={inputs.private}
        />
        <p className="help">
          <FormattedMessage {...messages.privateDescription} />
        </p>
      </div>
      <Input
        help={
          <FormattedMessage
            {...messages.pathDescription}
            values={{ basePath: `${window.location.origin}/@${app.OrganizationId}/` }}
          />
        }
        label={<FormattedMessage {...messages.path} />}
        name="path"
        onChange={onChange}
        placeholder={normalize(app.definition.name)}
        required
        value={inputs.path}
      />
      <Input
        help={
          <FormattedMessage
            {...messages.domainDescription}
            values={{
              documentation: (
                <a href="https://appsemble.dev/dns" rel="noopener noreferrer" target="_blank">
                  <FormattedMessage {...messages.documentation} />
                </a>
              ),
            }}
          />
        }
        label={<FormattedMessage {...messages.domain} />}
        name="domain"
        onChange={onChange}
        value={inputs.domain}
      />
      <Button type="submit">
        <FormattedMessage {...messages.saveChanges} />
      </Button>
    </Form>
  );
}
