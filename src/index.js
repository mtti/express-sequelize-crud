'use strict';

const Resource = require('./resource');
const { ResourceError, NotFoundError, AuthorizationError } = require('./errors');

module.exports = {
  Resource,
  ResourceError,
  NotFoundError,
  AuthorizationError,
};
