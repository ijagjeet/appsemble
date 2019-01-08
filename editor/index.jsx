import '@fortawesome/fontawesome-free/css/all.css';

import getDb from '@appsemble/utils/getDB';
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { applyMiddleware, combineReducers, compose, createStore } from 'redux';
import thunk from 'redux-thunk';

import './index.css';
import App from './components/App';
import { apps, db, message, user } from './actions';

async function getStore() {
  const idb = await getDb({ id: 'appsemble-editor' });

  const composeEnhancers =
    // eslint-disable-next-line no-underscore-dangle
    (process.env.NODE_ENV !== 'production' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) ||
    compose;
  return createStore(
    combineReducers({ apps, user, db, message }),
    {
      db: idb,
    },
    composeEnhancers(applyMiddleware(thunk)),
  );
}

getStore().then(store => {
  ReactDOM.render(
    <Provider store={store}>
      <App
        authentication={{
          url: `${window.location.origin}/api/oauth/token`,
          refreshURL: `${window.location.origin}/api/oauth/token`,
          clientId: 'appsemble-editor',
          clientSecret: 'appsemble-editor-secret',
          scope: 'apps:read apps:write',
        }}
      />
    </Provider>,
    document.getElementById('app'),
  );
});
