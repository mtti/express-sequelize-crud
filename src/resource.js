
const _ = require('lodash');
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

    this.operations = options.operations || ['list', 'create', 'read', 'update', 'delete'];
    this.listAttributes = options.listAttributes || ['id'];
    this.listOrder = options.listOrder || [['createdAt', 'ASC']];
    this.listConditionsCallback = options.listConditionsCallback || function () { return {}; };
    this.parentPropertyName = options.parentPropertyName || null;
    this.parentForeignKey = options.parentForeignKey || null;
    this.filterCallback = options.filterCallback || function (item) { return item; };
    this.resourcePath = options.resourcePath || '/:id';

    this.requireInstance = this.requireInstance.bind(this);
    this.requireAuthorization = this.requireAuthorization.bind(this);
    this.list = this.list.bind(this);
    this.create = this.create.bind(this);
    this.read = this.read.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.update.bind(this);

    if (_.includes(this.operations, 'list')) {
      this.router.get('/', this.requireAuthorization('list'), this.list);
    }
    if (_.includes(this.operations, 'create')) {
      this.router.post('/', jsonParser, this.requireAuthorization('create'), this.create);
    }
    if (_.includes(this.operations, 'read')) {
      this.router.get(this.resourcePath, this.requireInstance, this.requireAuthorization('read'),
        this.read);
    }
    if (_.includes(this.operations, 'update')) {
      this.router.put(this.resourcePath, this.requireInstance, jsonParser,
        this.requireAuthorization('update'), this.update);
    }
    if (_.includes(this.operations, 'delete')) {
      this.router.delete(this.resourcePath, this.requireInstance,
        this.requireAuthorization('delete'), this.delete);
    }
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

  subResource(slug, model, foreignKey, options = {}) {
    const optionsCopy = _.cloneDeep(options);
    optionsCopy.parentForeignKey = foreignKey;
    optionsCopy.parentPropertyName = this.propertyName;

    const subResource = new Resource(model, optionsCopy);

    this.router.use(`${this.resourcePath}/${slug}`, this.requireInstance, this.requireAuthorization('subResource'),
      subResource.router);

    return subResource;
  }

  operation(operationName, handler) {
    this.router.post(`/${operationName}`, jsonParser, this.requireAuthorization(operationName),
      handler);
  }

  instanceOperation(operationName, handler) {
    this.router.post(`${this.resourcePath}/${operationName}`, this.requireInstance, jsonParser,
      this.requireAuthorization(operationName), handler);
  }

  filterOne(item, operation, req) {
    if (!item) {
      return null;
    }
    return this.filterCallback(item, operation, req);
  }

  filterMany(items, operation, req) {
    if (!items) {
      return [];
    }
    return items
      .map(item => this.filterOne(item, operation, req))
      .filter(item => item);
  }

  list(req, res, next) {
    const query = {
      attributes: this.listAttributes,
      where: this.listConditionsCallback(req),
      order: this.listOrder,
    };

    if (this.parentForeignKey && this.parentPropertyName) {
      query.where[this.parentForeignKey] = req[this.parentPropertyName].id;
    }

    this.model.findAll(query)
      .then((rows) => {
        res.json(this.filterMany(rows, 'list', req));
      })
      .catch((err) => {
        next(err);
      });
  }

  create(req, res, next) {
    const body = _.cloneDeep(req.body);
    delete body.id;
    if (this.parentForeignKey && this.parentPropertyName) {
      body[this.parentForeignKey] = req[this.parentPropertyName].id;
    }

    this.model.create(body)
      .then(() => {
        res.json(this.filterOne(instance, 'create', req));
      })
      .catch((err) => {
        next(err);
      });
  }

  read(req, res) {
    const instance = this.filterOne(req[this.propertyName], 'read', 'req');
    res.json(instance);
  }

  update(req, res, next) {
    delete req.body.id;
    delete req.body.createdAt;
    delete req.body.updatedAt;

    req[this.propertyName].update(req.body)
      .then((instance) => {
        res.json(this.filterOne(instace, 'update', req));
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
