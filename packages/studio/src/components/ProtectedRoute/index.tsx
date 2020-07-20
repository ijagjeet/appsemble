import { useLocationString, useQuery } from '@appsemble/react-components';
import type { Permission } from '@appsemble/utils';
import React, { ReactElement } from 'react';
import { Redirect, Route, RouteProps, useRouteMatch } from 'react-router-dom';

import type { Organization } from '../../types';
import checkRole from '../../utils/checkRole';
import { useUser } from '../UserProvider';

interface ProtectedRouteProps extends RouteProps {
  permission?: Permission;
  organization?: Organization;
}

export default function ProtectedRoute({
  organization,
  permission,
  ...props
}: ProtectedRouteProps): ReactElement {
  const redirect = useLocationString();
  const { userInfo } = useUser();
  const qs = useQuery();
  const { url } = useRouteMatch();

  if (!userInfo) {
    const search = new URLSearchParams(qs);
    search.set('redirect', redirect);
    return <Redirect to={{ pathname: '/login', search: `?${search}` }} />;
  }

  if (permission) {
    if (!organization || !checkRole(organization.role, permission)) {
      return <Redirect to={url} />;
    }
  }

  return <Route {...props} />;
}
