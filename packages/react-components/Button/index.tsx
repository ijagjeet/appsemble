import { BulmaColor, BulmaSize } from '@appsemble/types';
import classNames from 'classnames';
import { ComponentPropsWithoutRef, ElementType, ReactElement } from 'react';

import { ButtonChildren } from '../index.js';

type ButtonProps<C extends ElementType = 'button'> = ComponentPropsWithoutRef<C> &
  ComponentPropsWithoutRef<typeof ButtonChildren> & {
    /**
     * The bulma color to apply to the button.
     */
    color?: BulmaColor;

    /**
     * The component type to use. This is specifically useful to create links that look like
     * buttons.
     */
    component?: C;

    /**
     * Set to true to invert the colors.
     */
    inverted?: boolean;

    /**
     * Set to true to indicate the button is in a loading state.
     */
    loading?: boolean;

    /**
     * The size that should be used for the button’s icons.
     */
    iconSize?: Exclude<BulmaSize, 'normal'>;

    /**
     * The size modifier that should be used for the button’s icons.
     */
    iconSizeModifier?: '2x' | '3x' | 'lg';
  };

/**
 * Render a button with Bulma styling.
 *
 * The button type is set to `button` by default.
 */
export function Button<C extends ElementType = 'button'>({
  children,
  className,
  color,
  component: Component = 'button' as C,
  icon,
  iconPosition = 'left',
  iconSize,
  iconSizeModifier,
  inverted,
  loading,
  ...props
}: ButtonProps<C> & Omit<ComponentPropsWithoutRef<C>, keyof ButtonProps<C>>): ReactElement {
  if (Component === 'button') {
    // @ts-expect-error TypeScript can’t statically determine the type from props based on
    // Component.
    // eslint-disable-next-line no-param-reassign
    props.type ??= 'button';
  }
  return (
    // @ts-expect-error This is working as intended.
    <Component
      className={classNames('button', className, {
        [`is-${color}`]: color,
        'is-inverted': inverted,
        'is-loading': loading,
      })}
      {...props}
    >
      <ButtonChildren
        icon={icon}
        iconPosition={iconPosition}
        iconSize={iconSize}
        iconSizeModifier={iconSizeModifier}
      >
        {children}
      </ButtonChildren>
    </Component>
  );
}
