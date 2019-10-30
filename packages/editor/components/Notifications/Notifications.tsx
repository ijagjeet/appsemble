import { SimpleForm, SimpleInput, SimpleSubmit } from '@appsemble/react-components';
import { App, Message } from '@appsemble/types';
import axios from 'axios';
import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Link, RouteComponentProps } from 'react-router-dom';

import { push } from '../../actions/message';
import HelmetIntl from '../HelmetIntl';
import messages from './messages';

export interface NotificationsProps extends RouteComponentProps<{ id: string }> {
  app: App;
  push: (message: Message) => void;
}

export default function Notifications({ app }: NotificationsProps): React.ReactElement {
  const intl = useIntl();

  const submit = async ({ title, body }: { title: string; body: string }): Promise<void> => {
    try {
      await axios.post(`/api/apps/${app.id}/broadcast`, { title, body });
      push({ body: intl.formatMessage(messages.submitSuccess), color: 'danger' });
    } catch (error) {
      push({ body: intl.formatMessage(messages.submitError), color: 'danger' });
    }
  };

  const { notifications } = app.definition;
  const disabled = notifications === undefined;

  return (
    <>
      <HelmetIntl title={messages.title} />

      <div className="content">
        {disabled && (
          <p>
            <FormattedMessage
              {...messages.enableInstructions}
              values={{
                appDefinition: (
                  <Link to={`/apps/${app.id}/edit#editor`}>
                    <FormattedMessage {...messages.appDefinition} />
                  </Link>
                ),
                navigation: (
                  <a
                    href="https://appsemble.dev/reference/app#notification"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    notification
                  </a>
                ),
              }}
            />
          </p>
        )}

        <SimpleForm defaultValues={{ title: '', body: '' }} onSubmit={submit} resetOnSuccess>
          <SimpleInput
            disabled={disabled}
            label={<FormattedMessage {...messages.titleLabel} />}
            name="title"
            required
            type="text"
          />
          <SimpleInput
            disabled={disabled}
            label={<FormattedMessage {...messages.bodyLabel} />}
            name="body"
            required
            type="text"
          />
          <SimpleSubmit disabled={disabled}>
            <FormattedMessage {...messages.requestButton} />
          </SimpleSubmit>
        </SimpleForm>
      </div>
    </>
  );
}
