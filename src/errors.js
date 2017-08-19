
class ResourceError extends Error {}

class NotFoundError extends ResourceError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

class AuthorizationError extends ResourceError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

module.exports = {
  ResourceError,
  NotFoundError,
  AuthorizationError,
};
