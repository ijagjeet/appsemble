import {
  useBeforeUnload,
  useConfirmation,
  useData,
  useMessages,
  useMeta,
} from '@appsemble/react-components';
import { App, AppDefinition, BlockManifest } from '@appsemble/types';
import { getAppBlocks, schemas, validateStyle } from '@appsemble/utils';
import axios, { AxiosError } from 'axios';
import equal from 'fast-deep-equal';
import { Validator } from 'jsonschema';
import { ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { parse } from 'yaml';

import { useApp } from '..';
import { AppPreview } from '../../../../components/AppPreview';
import { MonacoEditor } from '../../../../components/MonacoEditor';
import { getAppUrl } from '../../../../utils/getAppUrl';
import { EditorNavBar } from './EditorNavBar';
import styles from './index.module.css';
import { messages } from './messages';

const validator = new Validator();

for (const [name, schema] of Object.entries(schemas)) {
  // This is only safe, because our schema names don’t contain special characters.
  validator.addSchema(schema, `#/components/schemas/${name}`);
}

export default function EditPage(): ReactElement {
  useMeta(messages.title);

  const { app, setApp } = useApp();

  const [appDefinition, setAppDefinition] = useState<string>(app.yaml);
  const { data: coreStyle, setData: setCoreStyle } = useData<string>(
    `/api/apps/${app.id}/style/core`,
  );
  const { data: sharedStyle, setData: setSharedStyle } = useData<string>(
    `/api/apps/${app.id}/style/shared`,
  );

  const [valid, setValid] = useState(false);
  const [dirty, setDirty] = useState(true);

  const frame = useRef<HTMLIFrameElement>();
  const history = useHistory();
  const { formatMessage } = useIntl();
  const location = useLocation();
  const params = useParams<{ id: string }>();
  const push = useMessages();

  useEffect(() => {
    if (!location.hash) {
      history.push('#editor');
    }
  }, [history, location]);

  const onSave = useCallback(async () => {
    let definition: AppDefinition;
    // Attempt to parse the YAML into a JSON object
    try {
      definition = parse(appDefinition) as AppDefinition;
    } catch {
      push(formatMessage(messages.invalidYaml));
      setValid(false);
      setDirty(false);
      return;
    }

    try {
      validateStyle(coreStyle);
      validateStyle(sharedStyle);
    } catch {
      push(formatMessage(messages.invalidStyle));
      setValid(false);
      setDirty(false);
      return;
    }

    const validatorResult = validator.validate(definition, schemas.AppDefinition, { base: '#' });
    if (!validatorResult.valid) {
      push({
        body: formatMessage(messages.schemaValidationFailed, {
          properties: validatorResult.errors
            .map((err) => err.property.replace(/^instance\./, ''))
            .join(', '),
        }),
      });
      setValid(false);
      return;
    }
    try {
      const blockManifests: Omit<BlockManifest, 'parameters'>[] = await Promise.all(
        getAppBlocks(definition).map(async (block) => {
          const { data } = await axios.get<BlockManifest>(
            `/api/blocks/${block.type}/versions/${block.version}`,
          );
          return {
            name: data.name,
            version: data.version,
            layout: data.layout,
            files: data.files,
            actions: data.actions,
            events: data.events,
            languages: data.languages,
          };
        }),
      );
      setValid(true);

      // YAML and schema appear to be valid, send it to the app preview iframe
      delete definition.anchors;
      frame.current?.contentWindow.postMessage(
        { type: 'editor/EDIT_SUCCESS', definition, blockManifests, coreStyle, sharedStyle },
        getAppUrl(app.OrganizationId, app.path),
      );
    } catch {
      push(formatMessage(messages.unexpected));
      setValid(false);
    }
    setDirty(false);
  }, [app, formatMessage, push, appDefinition, sharedStyle, coreStyle]);

  useBeforeUnload(appDefinition !== app.yaml);

  const uploadApp = useCallback(async () => {
    if (!valid) {
      return;
    }

    const { id } = params;

    try {
      const formData = new FormData();
      formData.append('yaml', appDefinition);
      formData.append('coreStyle', coreStyle);
      formData.append('sharedStyle', sharedStyle);

      const { data } = await axios.patch<App>(`/api/apps/${id}`, formData);
      push({ body: formatMessage(messages.updateSuccess), color: 'success' });

      // Update App State
      setApp(data);
    } catch (error: unknown) {
      if ((error as AxiosError).response?.status === 403) {
        push(formatMessage(messages.forbidden));
      } else {
        push(formatMessage(messages.errorUpdate));
      }

      return;
    }

    setDirty(true);
  }, [formatMessage, params, push, appDefinition, sharedStyle, coreStyle, setApp, valid]);

  const promptUpdateApp = useConfirmation({
    title: <FormattedMessage {...messages.resourceWarningTitle} />,
    body: <FormattedMessage {...messages.resourceWarning} />,
    cancelLabel: <FormattedMessage {...messages.cancel} />,
    confirmLabel: <FormattedMessage {...messages.publish} />,
    action: uploadApp,
    color: 'warning',
  });

  const onUpload = useCallback(async () => {
    if (valid) {
      const newApp = parse(appDefinition) as AppDefinition;

      if (!equal(newApp.resources, app.definition.resources)) {
        promptUpdateApp();
        return;
      }

      await uploadApp();
    }
  }, [valid, appDefinition, app, uploadApp, promptUpdateApp]);

  const onMonacoChange = useCallback(
    (event, value: string) => {
      switch (location.hash) {
        case '#editor': {
          setAppDefinition(value);
          break;
        }
        case '#style-core':
          setCoreStyle(value);
          break;
        case '#style-shared':
          setSharedStyle(value);
          break;
        default:
          break;
      }

      setDirty(true);
    },
    [location, setCoreStyle, setSharedStyle],
  );

  let value;
  let language;

  switch (location.hash) {
    case '#style-core':
      value = coreStyle;
      language = 'css';
      break;
    case '#style-shared':
      value = sharedStyle;
      language = 'css';
      break;
    case '#editor':
    default:
      value = appDefinition;
      language = 'yaml';
  }

  return (
    <div className={`${styles.root} is-flex`}>
      <div className={`is-flex is-flex-direction-column ${styles.leftPanel}`}>
        <EditorNavBar dirty={dirty} onPreview={onSave} onUpload={onUpload} valid={valid} />
        <div className={styles.editorForm}>
          <MonacoEditor
            className={styles.editor}
            language={language}
            onChange={onMonacoChange}
            onSave={onSave}
            readOnly={app.locked}
            showDiagnostics
            value={value}
          />
        </div>
      </div>

      <AppPreview app={app} iframeRef={frame} />
    </div>
  );
}
