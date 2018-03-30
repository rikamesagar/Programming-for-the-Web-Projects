const express = require('express');
const bodyParser = require('body-parser');
var jsonParser = bodyParser.json()
const multer = require('multer');
const upload = multer();

const Steg = require('steg');
const Ppm = require('ppm');

const OK = 200;
const CREATED = 201;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CONFLICT = 409;
const SERVER_ERROR = 500;

function serve(port, base, images) {
  const app = express();
  app.locals.port = port;
  app.locals.base = base;
  app.locals.images = images;
  setupRoutes(app);
  app.listen(port, function() {
    console.log(`listening on port ${port}`);
  });
}

module.exports = {
  serve: serve
}

const IMAGES = 'images'; 

const STEG = 'steg';

const IMG_FIELD = 'img';

/** Set up routes based on IMAGES and STEG for all URLs to be handled
 *  by this server with all necessary middleware and handlers.
 */
function setupRoutes(app) {
const base = app.locals.base;
  app.get(`${base}/${IMAGES}/:group/:name/meta`, getMeta(app));
  app.get(`${base}/${IMAGES}/:group`, listImages(app));
  app.post(`${base}/${IMAGES}/:group`,upload.single('img'), createImage(app))
  app.get(`${base}/${IMAGES}/:group/:name`, getImage(app));
  app.post(`${base}/${STEG}/:group/:name`, jsonParser, stegHide(app));
  app.get(`${base}/${STEG}/:group/:name`, jsonParser, stegUnhide(app));

}

function createImage(app) {
  return async function(req, res) {
  try{
      const {group, name} = req.params;
      const ogFileName = req.file.originalname
      const fileName = ogFileName.split('.').slice(0,-1).join('.');

      const type = ogFileName.split('.').slice(-1)[0];

      const ret_name = await app.locals.images.putBytes(group, new Uint8Array(req.file.buffer), type, )
	const output=requestUrl(req)+"/"+ret_name+"."+type;
	res.location(output);
	res.sendStatus(CREATED);
	res.end();
    }catch(e){
      const mapped = mapError(e);
      res.status(mapped.status).json(mapped);
    }
  };
}

/** If everything ok, set response status to OK with body containing
 *  bytes of image representation specified by group/name.ext suffix
 *  of request URL.  If not ok, set response status to a suitable HTTP
 *  error status and return JSON object with "code" and "message"
 *  properties giving error details.
 */

function getImage(app) {
  return async function(req, res) {
    //TODO
    try{
      const {group, name} = req.params;
      const fileName = name.split('.').slice(0,-1).join('.');
      const type = name.split('.').slice(-1)[0];
      const bytes = await app.locals.images.get(group, fileName, type)
      res.status(OK).send(new Buffer(bytes,'binary'));
    }catch(e){
      const mapped = mapError(e);
      res.status(mapped.status).json(mapped);
    }
  };
}


/** If everything ok, set response status to OK with body containing
 *  JSON of image meta-information specified by group/name of request
 *  URL.  If not ok, set response status to a suitable HTTP error
 *  status and return JSON object with "code" and "message" properties
 *  giving error details.
 */
function getMeta(app) {
  return async function(req, res) {
    try {
      const {group, name} = req.params;
      const meta = await app.locals.images.meta(group, name);
      res.status(OK).json(meta);
    }
    catch (err) {
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  };
}


/** If everything ok, set response status to OK with body containing a
 *  JSON list (possibly empty) of image names for group suffix of
 *  request URL.  If not ok, set response status to a suitable HTTP
 *  error status and return JSON object with "code" and "message"
 *  properties giving error details.
 */
function listImages(app) {
  return async function(req, res) {
    try{
      const {group, name} = req.params;
      const list = await app.locals.images.list(group)
      res.status(OK).json(list)
    }catch(err){
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  }
}


/*********************** Steganography Services ************************/

/** This service is used for hiding a message in the image specified
 *  by its request URL.  It requires a JSON request body with a 
 *  parameter "msg" giving the message to be hidden and a "outGroup"
 *  parameter giving the group of the image being created.
 */
function stegHide(app) {
  return async function(req, res) {
    //TODO
     try {
     const {msg, outGroup} = req.body;
     const {group, name} = req.params;
     const imgBytes = await app.locals.images.get(group, name, "ppm");
     const ppmImage = new Ppm(name,new Uint8Array(imgBytes));
     const steg = new Steg(ppmImage);
     const hiddenImage = await steg.hide(msg);
     const ret_name = await app.locals.images.putBytes(outGroup,new Uint8Array(hiddenImage.bytes),"ppm", );
     const output = "http:\/\/localhost"+":"+app.locals.port+app.locals.base+"/"+STEG+"/"+outGroup+"/"+ret_name;
     res.location(output);
     res.sendStatus(CREATED).end();
     }
    catch (err) {
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
    }
  };
}

/** If everything ok, set response status to OK with body containing a
 *  JSON object with property "msg" containing the message hidden in
 *  the image specified by the URL for this request.  If not ok, set
 *  response status to a suitable HTTP error status and return JSON
 *  object with "code" and "message" properties giving error details.
 */
function stegUnhide(app) {
  return async function(req, res) {
    //TODO
   try{
    const {group, name} = req.params;
    const fileBuffer = await app.locals.images.get(group, name, "ppm")
    const ppmImage = new Ppm(name, new Uint8Array(fileBuffer))
    const steg = new Steg(ppmImage)
    const message = steg.unhide()
    res.status(OK).send({msg : message});
    }
    catch(err){
      const mapped = mapError(err);
      res.status(mapped.status).json(mapped);
      console.log("\n");
    }
  };
}

/******************************* Utilities *****************************/

/** Given params object containing key: value pairs, return an object
 *  containing a suitable "code" and "message" properties if any value
 *  is undefined; otherwise return falsey.
 */
function checkMissing(params) {
  const missing =
    Object.entries(params).filter(([k, v]) => typeof v === 'undefined')
      .map(([k, v]) => k);
  return missing.length > 0 &&
    { code: 'MISSING',
      message: `field(s) ${missing.join(', ')} not specified`
    };
}


//Object mapping domain error codes to HTTP status codes.
const ERROR_MAP = {
  EXISTS: CONFLICT,
  NOT_FOUND: NOT_FOUND,
  READ_ERROR: SERVER_ERROR,
  WRITE_ERROR: SERVER_ERROR,
  UNLINK_ERROR: SERVER_ERROR
}

/** Map domain/internal errors into suitable HTTP errors.  Return'd
 *  object will have a "status" property corresponding to HTTP status
 *  code.
 */
function mapError(err) {
  console.error(err);
  return err.isDomain
    ? { status: (ERROR_MAP[err.errorCode] || BAD_REQUEST),
	code: err.errorCode,
	message: err.message
      }
    : { status: SERVER_ERROR,
	code: 'INTERNAL',
	message: err.toString()
      };
}

/** Return URL (including host and port) for HTTP request req.
 *  Useful for producing Location headers.
 */
function requestUrl(req) {
  const port = req.app.locals.port;
  const url = req.originalUrl.replace(/\/$/, '');
  return `${req.protocol}://${req.hostname}:${port}${url}`;
}
