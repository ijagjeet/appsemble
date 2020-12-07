import { Subtitle, Title } from '@appsemble/react-components';
import { IconName } from '@fortawesome/fontawesome-common-types';
import React, { ElementType, MouseEventHandler, ReactElement, ReactNode } from 'react';
import { Link } from 'react-router-dom';

import styles from './index.css';

interface ListButtonProps {
  alt?: string;
  description?: ReactNode;
  icon?: IconName;
  image?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  subtitle?: ReactNode;
  title?: ReactNode;
  to?: string;
}

export function ListButton({
  alt,
  description,
  icon,
  image,
  onClick,
  subtitle,
  title,
  to,
}: ListButtonProps): ReactElement {
  const Wrapper: ElementType = to ? Link : 'button';
  const props = to ? { to } : ({ type: 'button', onClick } as const);

  return (
    <li className="my-4">
      <Wrapper className={`is-flex px-4 py-4 ${styles.wrapper}`} {...props}>
        <figure className={`image is-96x96 is-flex ${styles.figure}`}>
          {image ? (
            <img alt={alt} src={image} />
          ) : (
            <i className={`fas fa-${icon} fa-3x has-color-black`} />
          )}
        </figure>
        <div className={`ml-4 ${styles.content}`}>
          {title && (
            <Title className="is-marginless" level={3}>
              {title}
            </Title>
          )}
          {subtitle && (
            <Subtitle className="is-marginless" level={5}>
              {subtitle}
            </Subtitle>
          )}
          {description && <span className="has-text-grey">{description}</span>}
        </div>
      </Wrapper>
    </li>
  );
}
