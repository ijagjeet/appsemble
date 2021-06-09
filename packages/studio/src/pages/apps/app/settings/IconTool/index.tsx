import {
  Button,
  Icon,
  Input,
  RadioButton,
  RadioGroup,
  useConfirmation,
  useMessages,
  useObjectURL,
  useSimpleForm,
} from '@appsemble/react-components';
import axios from 'axios';
import { ChangeEvent, ReactElement, SyntheticEvent, useCallback, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Link, useParams } from 'react-router-dom';

import { useApp } from '../..';
import { IconPicker } from '../IconPicker';
import styles from './index.module.css';
import { messages } from './messages';

const shapes = {
  minimal: 'inset(10% round 40%)',
  circle: 'inset(0 round 50%)',
  rounded: 'inset(0 round 20%)',
  square: 'inset(0)',
};

interface IconToolProps {
  disabled?: boolean;
}

export function IconTool({ disabled }: IconToolProps): ReactElement {
  const { formatMessage } = useIntl();
  const push = useMessages();
  const { app, setApp } = useApp();
  const { setValue, values } = useSimpleForm();
  const { lang } = useParams<{ lang: string }>();

  const [shape, setShape] = useState<keyof typeof shapes>('minimal');

  const iconUrl = useObjectURL(values.icon);
  const maskableIconUrl = useObjectURL(values.maskableIcon || values.icon);
  const hasMaskableIcon = values.maskableIcon || app.hasMaskableIcon;

  const shapeShift = useCallback((event, value) => setShape(value), []);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>, value: unknown) => {
      setValue(event.currentTarget.name, value);
      setApp({ ...app, [event.currentTarget.name]: Boolean(value) });
    },
    [setValue, setApp, app],
  );

  const handleMaskableIconLoad = useCallback(
    ({
      currentTarget: { classList, naturalHeight, naturalWidth, style },
    }: SyntheticEvent<HTMLImageElement>) => {
      if (classList.contains(styles.fill)) {
        // eslint-disable-next-line no-param-reassign
        style.width = '';
      } else {
        const safeAreaDiameter = 80;
        const angle = Math.atan(naturalHeight / naturalWidth);
        // eslint-disable-next-line no-param-reassign
        style.width = `${Math.cos(angle) * safeAreaDiameter}%`;
      }
    },
    [],
  );

  const onDeleteIcon = useConfirmation({
    title: <FormattedMessage {...messages.deleteIconWarningTitle} />,
    body: <FormattedMessage {...messages.deleteIconWarning} />,
    cancelLabel: <FormattedMessage {...messages.cancel} />,
    confirmLabel: <FormattedMessage {...messages.delete} />,
    async action() {
      const { id } = app;

      try {
        await axios.delete(`/api/apps/${id}/icon`);
        push({
          body: formatMessage(messages.deleteIconSuccess),
          color: 'info',
        });
        const url = `${app.iconUrl.replace(/#\d+/, '')}#${Date.now()}`;
        setApp({ ...app, hasIcon: false, iconUrl: url });
        setValue('icon', url);
      } catch {
        push(formatMessage(messages.errorIconDelete));
      }
    },
  });

  const onDeleteMaskableIcon = useConfirmation({
    title: <FormattedMessage {...messages.deleteIconWarningTitle} />,
    body: <FormattedMessage {...messages.deleteIconWarning} />,
    cancelLabel: <FormattedMessage {...messages.cancel} />,
    confirmLabel: <FormattedMessage {...messages.delete} />,
    async action() {
      const { id } = app;

      try {
        await axios.delete(`/api/apps/${id}/maskableIcon`);
        push({
          body: formatMessage(messages.deleteIconSuccess),
          color: 'info',
        });
        setApp({
          ...app,
          hasMaskableIcon: false,
        });
        setValue('maskableIcon', null);
      } catch {
        push(formatMessage(messages.errorIconDelete));
      }
    },
  });

  return (
    <div>
      <span className="label">
        <FormattedMessage {...messages.icon} />
      </span>
      <Link className="help" to={`/${lang}/docs/guide/app-icons`}>
        <FormattedMessage {...messages.more} />
      </Link>
      <div className="is-flex">
        <div className="mb-2 mr-2">
          <IconPicker disabled={disabled} name="icon" onChange={handleChange}>
            <figure className={`image is-flex is-128x128 ${styles.icon}`}>
              {iconUrl ? (
                <img
                  alt={formatMessage(messages.iconPreview)}
                  className={styles.preview}
                  src={iconUrl}
                />
              ) : (
                <Icon className={styles.iconFallback} icon="mobile-alt" />
              )}
            </figure>
          </IconPicker>
          <Button
            className={`${styles.deleteButton} mt-1`}
            color="danger"
            disabled={!app.hasIcon}
            icon="trash-alt"
            onClick={onDeleteIcon}
          />
        </div>
        <div className="mb-2 mr-2">
          <IconPicker disabled={disabled} name="maskableIcon" onChange={handleChange}>
            <figure
              className={`image is-flex is-128x128 ${styles.maskableIcon}`}
              // eslint-disable-next-line react/forbid-dom-props
              style={{
                clipPath: shapes[shape],
                backgroundColor: values.iconBackground || 'white',
              }}
            >
              {maskableIconUrl ? (
                // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
                <img
                  alt={formatMessage(messages.maskableIconPreview)}
                  className={hasMaskableIcon ? styles.fill : styles.contain}
                  onLoad={handleMaskableIconLoad}
                  src={maskableIconUrl}
                />
              ) : (
                <Icon className={styles.maskableIconFallback} icon="mobile-alt" />
              )}
            </figure>
          </IconPicker>
          <Button
            className={`${styles.deleteButton} mt-1`}
            color="danger"
            disabled={!app.hasMaskableIcon}
            icon="trash-alt"
            onClick={onDeleteMaskableIcon}
          />
        </div>
        <div>
          <RadioGroup name="shape" onChange={shapeShift} value={shape}>
            <RadioButton id="shape-minimal" value="minimal">
              <FormattedMessage {...messages.minimal} />
            </RadioButton>
            <RadioButton id="shape-circle" value="circle">
              <FormattedMessage {...messages.circle} />
            </RadioButton>
            <RadioButton id="shape-rounded" value="rounded">
              <FormattedMessage {...messages.rounded} />
            </RadioButton>
            <RadioButton id="shape-square" value="square">
              <FormattedMessage {...messages.square} />
            </RadioButton>
          </RadioGroup>
          <Input
            className="is-paddingless"
            disabled={disabled}
            name="iconBackground"
            onChange={handleChange}
            type="color"
            value={values.iconBackground}
          />
        </div>
      </div>
    </div>
  );
}
