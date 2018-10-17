import InvalidArgumentError from 'oauth2-server/lib/errors/invalid-argument-error';
import NodeOAuthServer, { Request, Response } from 'oauth2-server';
import UnauthorizedRequestError from 'oauth2-server/lib/errors/unauthorized-request-error';
import { omit } from 'lodash';

async function handleResponse(ctx, response) {
  if (response.status === 302) {
    const { location } = response.headers;
    delete response.headers.location;
    ctx.set(response.headers);
    ctx.redirect(location);
  } else {
    ctx.set(response.headers);
    ctx.status = response.status;
    ctx.body = response.body;
  }
}

async function handleError(e, ctx, response, next, useErrorHandler) {
  if (useErrorHandler) {
    ctx.state.oauth = { error: e };
    await next();
  } else {
    if (response) {
      ctx.set(response.headers);
    }

    ctx.status = e.code;

    if (e instanceof UnauthorizedRequestError) {
      ctx.body = '';
      return;
    }

    ctx.body = { error: e.name, error_description: e.message };
  }
}

export default class oauth2Server {
  constructor(options = {}) {
    if (!options.model) {
      throw new InvalidArgumentError('Missing parameter: `model`');
    }

    this.useErrorHandler = !!options.useErrorHandler;
    this.continueMiddleware = !!options.continueMiddleware;

    this.server = new NodeOAuthServer(omit(options, ['useErrorHandler', 'continueMiddleware']));
  }

  /**
   * Authentication Middleware.
   *
   * Returns a middleware this will validate a token.
   *
   * (See: https://tools.ietf.org/html/rfc6749#section-7)
   */
  authenticate(options) {
    return async (ctx, next) => {
      const request = new Request(ctx.request);
      const response = new Response(ctx.response);
      let token;

      try {
        token = await this.server.authenticate(request, response, options);
        ctx.state.oauth = { token };
      } catch (e) {
        await handleError.call(this, e, ctx, null, next, this.useErrorHandler);
        return;
      }

      await next();
    };
  }

  authorize(options) {
    return async (ctx, next) => {
      const request = new Request(ctx.request);
      const response = new Response(ctx.request);
      let code;

      try {
        code = await this.server.authorize(request, response, options);
        ctx.state.oauth = { code };
      } catch (e) {
        await handleError.call(this, e, ctx, response, next, this.useErrorHandler);
        return;
      }

      if (this.continueMiddleware) {
        await next();
      }

      await handleResponse.call(this, ctx, response);
    };
  }

  /**
   * Grant Middleware.
   *
   * Returns middleware this will grant tokens to valid requests.
   *
   * (See: https://tools.ietf.org/html/rfc6749#section-3.2)
   */
  token(options) {
    return async (ctx, next) => {
      if (ctx.request.type === 'application/json') {
        // Allow the server to support both JSON and x-www-form-urlencoded methods
        ctx.request.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }

      const request = new Request(ctx.request);
      const response = new Response(ctx.response);
      let token;

      try {
        token = await this.server.token(request, response, options);
        ctx.state.oauth = { token };
      } catch (e) {
        await handleError.call(this, e, ctx, response, next, this.useErrorHandler);
        return;
      }

      if (this.continueMiddleware) {
        await next();
      }

      await handleResponse.call(this, ctx, response);
    };
  }
}
