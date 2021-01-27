import classNames from 'classnames';
import { ComponentProps, VNode } from 'preact';

import { Button } from '..';
import styles from './index.css';

export function CardFooterButton({
  className,
  color = 'white',
  ...props
}: ComponentProps<typeof Button>): VNode {
  return (
    <Button
      className={classNames(`card-footer-item ${styles.root}`, className)}
      color={color}
      {...props}
    />
  );
}
