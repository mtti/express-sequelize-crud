
const express = require('express');
const bodyParser = require('body-parser');
const { NotFoundError, AuthorizationError } = require('./errors');

const jsonParser = bodyParser.json();

class Resource {
  constructor(model, options = {}) {
    this.model = model;

    this.propertyName = options.propertyName || this.model.name;
    if (options.router) {
      this.router = options.router;
    } else {
      this.router = express.Router();
    }
    if (options.authorizationCallback) {
      this.authorizationCallback = options.authorizationCallback;
    } else {
      this.authorizationCallback = () => true;
    }

    this.requireInstance = this.requireInstance.bind(this);
    this.requireAuthorization = this.requireAuthorization.bind(this);
    this.create = this.create.bind(this);
    this.read = this.read.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.update.bind(this);

    this.router.post('/', jsonParser, this.requireAuthorization('create'), this.create);
    this.router.get('/:id', this.requireInstance, this.requireAuthorization('read'), this.read);
    this.router.put('/:id', this.requireInstance, jsonParser, this.requireAuthorization('update'),
      this.update);
    this.router.delete('/:id', this.requireInstance, this.requireAuthorization('delete'),
      this.delete);
  }

  requireInstance(req, res, next) {
    this.model.findById(req.params.id)
      .then((instance) => {
        if (!instance) {
          next(new NotFoundError('Not found'));
          return;
        }
        req[this.propertyName] = instance;
        next();
      })
      .catch((err) => {
        next(err);
      });
  }

  requireAuthorization(operation) {
    return (req, res, next) => {
      const result = this.authorizationCallback(operation, req);
      if (result.then) {
        result
          .then(() => {
            next();
          })
          .catch((err) => {
            next(err);
          });
      } else if (result) {
        next();
      } else {
        next(new AuthorizationError('Access denied'));
      }
    };
  }

  operation(operationName, handler) {
    this.router.post(`/${operationName}`, jsonParser, this.requireAuthorization(operationName),
      handler);
  }

  instanceOperation(operationName, handler) {
    this.router.post(`/:id/${operationName}`, this.requireInstance, jsonParser,
      this.requireAuthorization(operationName), handler);
  }

  create(req, res, next) {
    delete req.body.id;
    const instance = this.model.build(req.body);
    instance.save()
      .then(() => {
        res.json(instance);
      })
      .catch((err) => {
        next(err);
      });
  }

  read(req, res) {
    res.json(req[this.propertyName]);
  }

  update(req, res, next) {
    delete req.body.id;
    delete req.body.createdAt;
    delete req.body.updatedAt;

    req[this.propertyName].update(req.body)
      .then((instance) => {
        res.json(instance);
      })
      .catch((err) => {
        next(err);
      });
  }

  delete(req, res, next) {
    req[this.propertyName].destroy()
      .then(() => {
        res.status(200).send('OK');
      })
      .catch((err) => {
        next(err);
      });
  }
}

module.exports = Resource;
