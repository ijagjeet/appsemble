import classNames from 'classnames';
import * as React from 'react';

import Button from '../Button';
import useClickOutside from '../hooks/useClickOutside';
import useToggle from '../hooks/useToggle';
import Icon from '../Icon';

interface DropdownProps {
  /**
   * The children to render as menu items.
   *
   * Typically these are nodes that have the `dropdown-item` or `dropdown-divicer` class.
   */
  children: React.ReactNode;

  /**
   * An optional class name to add to the root element.
   */
  className?: string;

  /**
   * The label to render on the menu toggle button.
   */
  label: React.ReactNode;
}

/**
 * Render an aria compliant Bulma dropdown menu.
 */
export default function Dropdown({
  children,
  className,
  label,
}: DropdownProps): React.ReactElement {
  const ref = React.useRef<HTMLDivElement>();
  const { disable, enabled, toggle } = useToggle();

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        disable();
      }
    },
    [disable],
  );

  useClickOutside(ref, disable);

  return (
    <div ref={ref} className={classNames('dropdown', className, { 'is-active': enabled })}>
      <div className="dropdown-trigger">
        <Button aria-haspopup onClick={toggle} onKeyDown={onKeyDown}>
          {label}
          <Icon icon="angle-down" size="small" />
        </Button>
      </div>
      <div
        className="dropdown-menu"
        onClick={toggle}
        onKeyDown={onKeyDown}
        role="menu"
        tabIndex={0}
      >
        <div className="dropdown-content">{children}</div>
      </div>
    </div>
  );
}
