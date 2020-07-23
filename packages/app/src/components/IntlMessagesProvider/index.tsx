import { Content, Loader, Message, useLocationString } from '@appsemble/react-components';
import type { AppMessages } from '@appsemble/types';
import { normalize } from '@appsemble/utils/src';
import axios from 'axios';
import React, { ReactElement, ReactNode, useEffect, useState } from 'react';
import { IntlProvider } from 'react-intl';
import { Redirect, useHistory, useParams } from 'react-router-dom';

import { detectLocale } from '../../utils/i18n';
import settings from '../../utils/settings';
import { useAppDefinition } from '../AppDefinitionProvider';

interface Messages {
  [id: string]: string;
}

interface IntlMessagesProviderProps {
  children: ReactNode;
}

export default function IntlMessagesProvider({
  children,
}: IntlMessagesProviderProps): ReactElement {
  const { lang } = useParams<{ lang: string }>();
  const { definition } = useAppDefinition();
  const history = useHistory();
  const redirect = useLocationString();

  const [messages, setMessages] = useState<Messages>();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const defaultLanguage = definition.defaultLanguage || 'en';
    if (lang !== defaultLanguage && !settings.languages.includes(lang)) {
      const detected = detectLocale(settings.languages, navigator.languages) || defaultLanguage;
      if (/^[A-Z]/.exec(lang) || definition.pages.find((page) => lang === normalize(page.name))) {
        // Someone got linked to a page without a language tag. Redirect them to the same page, but
        // with language set. This is especially important for the OAuth2 callback URL.
        history.replace(`/${detected}${redirect}`);
      } else {
        history.replace(`/${detected}`);
      }
      return;
    }

    axios
      .get<AppMessages>(`${settings.apiUrl}/api/apps/${settings.id}/messages/${lang}`)
      .catch(() => ({ data: { messages: { hello: 'world' } } }))
      .then(({ data }) => setMessages(data.messages))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [definition, history, lang, redirect]);

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return (
      <Content>
        <Message color="danger">There was a problem loading the app.</Message>
      </Content>
    );
  }

  return (
    <IntlProvider defaultLocale="en-US" locale="en-US" messages={messages}>
      {children}
    </IntlProvider>
  );
}
