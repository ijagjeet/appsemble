import classNames from 'classnames';
import axios from 'axios';
import PropTypes from 'prop-types';
import React from 'react';
import { FormattedMessage } from 'react-intl';

import messages from './messages';
import styles from './ConnectOAuth.css';

export default class ConnectOAuth extends React.Component {
  static propTypes = {
    location: PropTypes.shape().isRequired,
    oauthLogin: PropTypes.func.isRequired,
  };

  componentDidMount() {
    const { location } = this.props;

    const params = new URLSearchParams(location.search);

    if (params.has('access_token') && params.has('verified') && params.has('userId')) {
      this.handleOAuthLogin();
    }
  }

  handleOAuthRegister = async () => {
    const { location } = this.props;

    const params = new URLSearchParams(location.search);

    const result = await axios.post('/api/oauth/register', {
      accessToken: params.get('access_token'),
      provider: params.get('provider'),
      refreshToken: params.get('refresh_token'),
      id: params.get('id'),
    });

    if (result.status === 201) {
      await this.handleOAuthLogin();
    }
  };

  handleOAuthLogin() {
    const { location, oauthLogin } = this.props;

    const params = new URLSearchParams(location.search);

    oauthLogin(params.get('access_token'));
  }

  render() {
    const { location } = this.props;

    const params = new URLSearchParams(location.search);

    if (params.has('access_token') && params.has('provider')) {
      return (
        <div className={styles.registerPrompt}>
          <p>
            <FormattedMessage {...messages.greeting} values={{ name: params.get('name') }} />
            <br />
            <FormattedMessage
              {...messages.registerPrompt}
              values={{ provider: params.get('provider') }}
            />
          </p>
          <button
            className={classNames('button', 'is-primary', styles.registerButton)}
            onClick={this.handleOAuthRegister}
            type="button"
          >
            <FormattedMessage {...messages.register} />
          </button>
        </div>
      );
    }

    return null;
  }
}
