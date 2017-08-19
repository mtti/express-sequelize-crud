Library for creating REST APIs from Sequelize models.

There are an astonishing number of libraries out there that do more or less the same thing as this one. I created this one because most of the other one seem to have been abandoned for years. If you so far havent chosen to use any of those, you probably shouldn't use this one either since this will probably be abandoned too.

Seriously, just use [Epilogue](https://www.npmjs.com/package/epilogue) or something.

If, however, you are feeling crazy or stupid, here's a basic example followed by some probably out of date documentation:

    import express from 'express';
    import Sequelize from 'sequelize';
    import sequelizeCrud from 'express-sequelize-crud';
    const { Resource } = sequelizeCrud;
    import Document from '../models/document';

    const db = new Sequelize('postgres://user:pass@localhost:5432/mydb');
    db.sync();
    const app = express();

    const documentResource = new Resource(Document);
    app.use('/documents', documentResource.router);

    app.listen(3000);

This will give you `POST /documents/`, `GET /documents/:id`, `PUT /documents/:id` and `DELETE /documents/:id` which do what you'd expect them to do. It doesn't give you `GET /documents/` though, because you'll usually want to customize that to fit your access control scheme.

The `Resource(model, options)` constructor accepts an optional options object with any of the following keys:

* `router` An Express router to use if you want to bring your own. If omitted, a new one will be created and made available through `.router`.
* `propertyName` Property name under `req` to load the model instance to. Defaults to `model.name`.
* `authorizationCallback` Callback `function (operation, req)` which receives the operation name as string and the request object. Returns boolean or a promise which resolves to a boolean. `true` means access granted, `false` means access denied. Built-in operation names are `create`, `read`, `update` and `delete`. If this is omitted all requests are always allowed, the assumption being that you're doing your own access control somewhere else.

A resource instance has these methods:

* `operation(name, handler)` Convenience method for adding a `POST /name`. Also adds JSON parser and authorization callback middlewares.
* `instanceOperation(name, handler)` Convenience method for adding a `POST /:id/name`. Also adds JSON parser, authorization and instance loading middlewares.
* `requireInstance` Middleware for loading the model instance.
* `requireAuthorization(name)` Creates a middleware for calling the authorization callback with the given operation name.
