import type { BulmaColor } from '@appsemble/sdk';
import type { IconName, IconPrefix } from '@fortawesome/fontawesome-common-types';
import classNames from 'classnames';
import * as React from 'react';

import Icon from '../Icon';

interface ButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  color?: BulmaColor;
  icon?: IconName;
  iconPrefix?: IconPrefix;
  inverted?: boolean;
  loading?: boolean;
}

export default function Button({
  children,
  className,
  color,
  icon,
  iconPrefix,
  inverted,
  loading,
  type = 'button',
  ...props
}: ButtonProps): React.ReactElement {
  return (
    <button
      className={classNames('button', className, {
        [`is-${color}`]: color,
        'is-inverted': inverted,
        'is-loading': loading,
      })}
      // eslint-disable-next-line react/button-has-type
      type={type}
      {...props}
    >
      {icon ? (
        <>
          <Icon icon={icon} prefix={iconPrefix} />
          {children && <span>{children}</span>}
        </>
      ) : (
        children
      )}
    </button>
  );
}
