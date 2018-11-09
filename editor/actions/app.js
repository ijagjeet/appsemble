import axios from 'axios';

const GET_START = 'apps/GET_START';
const GET_SUCCESS = 'apps/GET_SUCCESS';
const GET_ERROR = 'apps/GET_ERROR';

const CREATE_SUCCESS = 'app/CREATE_SUCCESS';

const initialState = {
  apps: [],
  error: null,
};

export default (state = initialState, action) => {
  switch (action.type) {
    case GET_START:
      return {
        ...state,
        error: null,
      };
    case GET_SUCCESS:
      return {
        ...state,
        apps: action.apps,
        error: null,
      };
    case GET_ERROR:
      return {
        ...state,
        error: action.error,
      };
    case CREATE_SUCCESS:
      return {
        ...state,
        apps: [...state.apps, action.app],
      };
    default:
      return state;
  }
};

export function getApps() {
  return async dispatch => {
    dispatch({
      type: GET_START,
    });
    try {
      const { data: apps } = await axios.get(`/api/apps`);
      dispatch({
        type: GET_SUCCESS,
        apps,
      });
    } catch (error) {
      dispatch({
        type: GET_ERROR,
        error,
      });
    }
  };
}

export function createApp(recipe) {
  return async dispatch => {
    const { data: app } = await axios.post('/api/apps', recipe);
    dispatch({
      type: CREATE_SUCCESS,
      app,
    });

    return app;
  };
}
