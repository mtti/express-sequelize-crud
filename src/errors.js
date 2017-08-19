'use strict';

class ResourceError extends Error {
  constructor(message, name) {
    super(message);
    this.name = name;
  }
}

class NotFoundError extends ResourceError {
  constructor(message) {
    super(message, this.constructor.name);
  }
}

class AuthorizationError extends ResourceError {
  constructor(message) {
    super(message, this.constructor.name);
  }
}

module.exports = {
  ResourceError,
  NotFoundError,
  AuthorizationError,
};
