'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const mustache = require('mustache');
const querystring = require('querystring');

const STATIC_DIR = 'statics';
const TEMPLATES_DIR = 'templates';

function serve(port, base, model) {
  const app = express();
  app.locals.port = port;
  app.locals.base = base;
  app.locals.model = model;
  process.chdir(__dirname);
  app.use(base, express.static(STATIC_DIR));
  setupTemplates(app);
  setupRoutes(app);
  app.listen(port, function() {
    console.log(`listening on port ${port}`);
  });
}


module.exports = serve;

/******************************** Routes *******************************/

function setupRoutes(app) {
  const base = app.locals.base;
  app.get(`${base}/search.html`, doSearch(app));
  app.get(`${base}/list.html`, listUsers(app));
  app.post(`${base}/delete`, bodyParser.urlencoded({extended: false}),
	   deleteUser(app));
  app.get(`${base}/create.html`, createUserForm(app));
  app.post(`${base}/create.html`, bodyParser.urlencoded({extended: false}),
	   createUpdateUser(app));
  app.get(`${base}/update.html`, updateUserForm(app));
  app.post(`${base}/update.html`, bodyParser.urlencoded({extended: false}),
	   createUpdateUser(app));
  app.get(`${base}/:id.html`, getUser(app)); //must be last
}

/************************** Field Definitions **************************/

const FIELDS_INFO = {
  id: {
    friendlyName: 'User Id',
    isSearch: 'true',
    isId: 'true',
    isRequired: 'true',
    regex: /^\w+$/,
    error: 'User Id field can only contain alphanumerics or _',
  },
  firstName: {
    friendlyName: 'First Name',
    isSearch: 'true',
    regex: /^[a-zA-Z\-\' ]+$/,
    error: "First Name field can only contain alphabetics, -, ' or space",
  },
  lastName: {
    friendlyName: 'Last Name',
    isSearch: 'true',
    regex: /^[a-zA-Z\-\' ]+$/,
    error: "Last Name field can only contain alphabetics, -, ' or space",
  },
  email: {
    friendlyName: 'Email Address',
    isSearch: 'true',
    type: 'email',
    regex: /^[^@]+\@[^\.]+(\.[^\.]+)+$/,
    error: 'Email Address field must be of the form "user@domain.tld"',
  },
  birthDate: {
    friendlyName: 'Date of Birth',
    isSearch: 'false',
    type: 'date',
    regex: /^\d{4}\-\d\d?\-\d\d?$/,
    error: 'Date of Birth field must be of the form "YYYY-MM-DD"',
  },
};

const FIELDS =
  Object.keys(FIELDS_INFO).map((n) => Object.assign({name: n}, FIELDS_INFO[n]));

/*************************** Action Routines ***************************/

function updateUserForm(app) {
  return async function(req, res) {
    let user = getNonEmptyValues(req.query);
    let errors = validate(user, ['id']);
    if (!errors) {
      try {
	const users = await app.locals.model.get(user.id);
	user = users[0];
      }
      catch (err) {
	errors = wsErrors(err);
      }
    }
    const model = errorModel(app, user, errors);
    const html = doMustache(app, 'update', model);
    res.send(html);
  };
};

function createUserForm(app) {
  return async function(req, res) {
    const model = { base: app.locals.base, fields: FIELDS };
    const html = doMustache(app, 'create', model);
    res.send(html);
  };
};

function createUpdateUser(app) {
  return async function(req, res) {
    const user = getNonEmptyValues(req.body);
    let errors = validate(user, ['id']);
    const isUpdate = req.body.submit === 'update';
    if (!errors) {
      try {
	if (isUpdate) {
	  await app.locals.model.update(user);
	}
	else {
	  await app.locals.model.create(user);
	}
	res.redirect(`${app.locals.base}/${user.id}.html`);
      }
      catch (err) {
	errors = wsErrors(err);
      }
    }
    if (errors) {
      const model = errorModel(app, user, errors);
      const html = doMustache(app, (isUpdate) ? 'update' : 'create', model);
      res.send(html);
    }
  };
};

function listUsers(app) {
  return async function(req, res) {
    const users = await app.locals.model.list();
    const model = { base: app.locals.base, users: users };
    const html = doMustache(app, 'summary', model);
    res.send(html);
  };
};

function getUser(app) {
  return async function(req, res) {
    let model;
    const id = req.params.id;
    try {
      const users = await app.locals.model.get(id);
      const fields =
	users.map((u) => ({id: u.id, fields: fieldsWithValues(u)}));
      model = { base: app.locals.base, users: fields };
    }
    catch (err) {
      const errors = wsErrors(err);
      model = errorModel(app, {}, errors);
    }
    const html = doMustache(app, 'details', model);
    res.send(html);
  };
};

function deleteUser(app) {
  return async function(req, res) {
    const id = req.body.id;
    if (isNonEmpty(id)) await app.locals.model.delete(id); //no error msg
    res.redirect(`${app.locals.base}/list.html`);
  };
};

function doSearch(app) {
  return async function(req, res) {
    const isSubmit = typeof req.query.submit !== 'undefined';
    let users = [];
    let errors = undefined;
    const search = getNonEmptyValues(req.query);
    if (isSubmit) {
      errors = validate(search);
      if (Object.keys(search).length == 0) {
	const msg = 'at least one search parameter must be specified';
	errors = Object.assign(errors || {}, { _: msg });
      }
      if (!errors) {
	const q = querystring.stringify(search);
	try {
	  users = await app.locals.model.list(q);
	}
	catch (err) {
	  errors = wsErrors(err);
	}
	if (users.length === 0) {
	  errors = {_: 'no users found for specified criteria; please retry'};
	}
      }
    }
    let model, template;
    if (users.length > 0) {
      template = 'details';
      const fields =
	users.map((u) => ({id: u.id, fields: fieldsWithValues(u)}));
      model = { base: app.locals.base, users: fields };
    }
    else {
      template =  'search';
      model = errorModel(app, search, errors);
    }
    const html = doMustache(app, template, model);
    res.send(html);
  };
};


/************************** Field Utilities ****************************/

/** Return copy of FIELDS with values and errors injected into it. */
function fieldsWithValues(values, errors={}) {
  return FIELDS.map(function (info) {
    const name = info.name;
    const extraInfo = { value: values[name] };
    if (errors[name]) extraInfo.errorMessage = errors[name];
    return Object.assign(extraInfo, info);
  });
}

/** Given map of field values and requires containing list of required
 *  fields, validate values.  Return errors hash or falsy if no errors.
 */
function validate(values, requires=[]) {
  const errors = {};
  requires.forEach(function (name) {
    if (typeof values[name] === 'undefined') {
      errors[name] =
	`A value for '${FIELDS_INFO[name].friendlyName}' must be provided`;
    }
  });
  for (const name of Object.keys(values)) {
    const fieldInfo = FIELDS_INFO[name];
    const value = values[name];
    if (fieldInfo.regex && !value.match(fieldInfo.regex)) {
      errors[name] = fieldInfo.error;
    }
  }
  return Object.keys(errors).length > 0 && errors;
}

function getNonEmptyValues(values) {
  const out = {};
  Object.keys(values).forEach(function(k) {
    if (typeof FIELDS_INFO[k] !== 'undefined') {
      const v = values[k];
      if (v && v.trim().length > 0) out[k] = v.trim();
    }
  });
  return out;
}

/** Return a model suitable for mixing into a template */
function errorModel(app, values={}, errors={}) {
  return {
    base: app.locals.base,
    errors: errors._,
    fields: fieldsWithValues(values, errors)
  };
}

/************************ General Utilities ****************************/

/** Decode an error thrown by web services into an errors hash
 *  with a _ key.
 */
function wsErrors(err) {
  const msg = (err.message) ? err.message : 'web service error';
  console.error(msg);
  return { _: [ msg ] };
}

function doMustache(app, templateId, view) {
  const templates = { footer: app.templates.footer };
  return mustache.render(app.templates[templateId], view, templates);
}

function errorPage(app, errors, res) {
  if (!Array.isArray(errors)) errors = [ errors ];
  const html = doMustache(app, 'errors', { errors: errors });
  res.send(html);
}

function isNonEmpty(v) {
  return (typeof v !== 'undefined') && v.trim().length > 0;
}

function setupTemplates(app) {
  app.templates = {};
  for (let fname of fs.readdirSync(TEMPLATES_DIR)) {
    const m = fname.match(/^([\w\-]+)\.ms$/);
    if (!m) continue;
    try {
      app.templates[m[1]] =
	String(fs.readFileSync(`${TEMPLATES_DIR}/${fname}`));
    }
    catch (e) {
      console.error(`cannot read ${fname}: ${e}`);
      process.exit(1);
    }
  }
}

