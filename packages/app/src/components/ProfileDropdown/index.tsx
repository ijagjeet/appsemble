import { Button, Icon, NavbarDropdown } from '@appsemble/react-components';
import { ReactElement } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';

import { useAppDefinition } from '../AppDefinitionProvider';
import { useUser } from '../UserProvider';
import styles from './index.css';
import { messages } from './messages';

export function ProfileDropdown(): ReactElement {
  const { formatMessage } = useIntl();
  const { definition } = useAppDefinition();
  const { isLoggedIn, logout, userInfo } = useUser();

  const showLogin = definition.security;
  const { layout } = definition;

  if (!showLogin || (layout?.login != null && layout?.login !== 'navbar')) {
    return null;
  }

  if (!isLoggedIn) {
    return (
      <Link className={`navbar-item ${styles.login}`} to="/Login">
        <FormattedMessage {...messages.login} />
      </Link>
    );
  }

  return (
    <NavbarDropdown
      className={`is-right ${styles.dropdown}`}
      label={
        <figure className="image is-32x32">
          {userInfo?.picture ? (
            <img
              alt={formatMessage(messages.pfp)}
              className={`is-rounded ${styles.gravatar}`}
              src={userInfo.picture}
            />
          ) : (
            <Icon
              className={`is-rounded has-background-grey-dark has-text-white-ter ${styles.gravatarFallback}`}
              icon="user"
            />
          )}
        </figure>
      }
    >
      {(layout?.settings ?? 'navbar') === 'navbar' && (
        <Link className="navbar-item" to="/Settings">
          <Icon icon="wrench" />
          <span>
            <FormattedMessage {...messages.settings} />
          </span>
        </Link>
      )}
      {(layout?.feedback ?? 'navbar') === 'navbar' && (
        <Link className="navbar-item" to="/Feedback">
          <Icon icon="comment" />
          <span>
            <FormattedMessage {...messages.feedback} />
          </span>
        </Link>
      )}
      {showLogin && (
        <>
          <hr className="navbar-divider" />
          <Button
            className={`navbar-item pl-5 ${styles.logoutButton}`}
            icon="sign-out-alt"
            onClick={logout}
          >
            <FormattedMessage {...messages.logoutButton} />
          </Button>
        </>
      )}
    </NavbarDropdown>
  );
}
