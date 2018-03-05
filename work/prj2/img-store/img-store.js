'use strict';

const Ppm = require('./ppm');

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const mongo = require('mongodb').MongoClient;
const Binary = require('mongodb').Binary;
const util = require('util');
const fsReadFile = util.promisify(fs.readFile)
const fsWriteFile = util.promisify(fs.writeFile)
const exec = require('child_process').exec;
const osExec = util.promisify(exec);
const tmpDir = '.';//os.tmpdir()

//TODO: add require()'s as necessary

/** This module provides an interface for storing, retrieving and
 *  querying images from a database. An image is uniquely identified
 *  by two non-empty strings:
 *
 *    Group: a string which does not contain any NUL ('\0') 
 *           characters.
 *    Name:  a string which does not contain any '/' or NUL
 *           characters.
 *
 *  Note that the image identification does not include the type of
 *  image.  So two images with different types are regarded as
 *  identical iff they have the same group and name.
 *  
 *  Error Handling: If a function detects an error with a defined
 *  error code, then it must return a rejected promise rejected with
 *  an object containing the following two properties:
 *
 *    errorCode: the error code
 *    message:   an error message which gives details about the error.
 *
 *  If a function detects an error without a defined error code, then
 *  it may reject with an object as above (using a distinct error
 *  code), or it may reject with a JavaScript Error object as
 *  appropriate.
 */


function ImgStore(client,db) { //TODO: add arguments as necessary
  this.client = client;
  this.db = db;
}

ImgStore.prototype.close = close;
ImgStore.prototype.get = get;
ImgStore.prototype.list = list;
ImgStore.prototype.meta = meta;
ImgStore.prototype.put = put;

/** Factory function for creating a new img-store.
 */
async function newImgStore() {
  const client = await mongo.connect(MONGO_URL);
  const db = client.db(DB_NAME);
  return new ImgStore(client, db);
}
module.exports = newImgStore;

/** URL for database images on mongodb server running on default port
 *  on localhost
 */
const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME = 'images';

//List of permitted image types.
const IMG_TYPES = [
  'ppm', 
  'png'
];


/** Release all resources held by this image store.  Specifically,
 *  close any database connections.
 */
async function close() {
  //TODO
}

/** Retrieve image specified by group and name.  Specifically, return
 *  a promise which resolves to a Uint8Array containing the bytes of
 *  the image formatted for image format type.
 *
 *  Defined Error Codes:
 *
 *    BAD_GROUP:   group is invalid (contains a NUL-character).
 *    BAD_NAME:    name is invalid (contains a '/' or NUL-character).
 *    BAD_TYPE:    type is not one of the supported image types.
 *    NOT_FOUND:   there is no stored image for name under group.
 */
async function get(group, name, type) {
  const image = await this.db.collection("imageCollection").findOne({name:name, group:group, type: type})
  let imageData = null
  if(image.type === "png"){
    const temp = `${tmpDir}/${name}.ppm`
    await fsWriteFile(temp, image.bin.read(0))
    await convertTo("png", temp)
    imageData = await fsReadFile(`${tmpDir}/${name}.png`)
  }else{
    imageData = image.bin.read(0)
  }
  const ppm = new Ppm(image._id+"", new Uint8Array(image.bin))
  return imageData
}

/** Return promise which resolves to an array containing the names of
 *  all images stored under group.  The resolved value should be an
 *  empty array if there are no images stored under group.
 *
 *  The implementation of this function must not read the actual image
 *  bytes from the database.
 *
 *  Defined Errors Codes:
 *
 *    BAD_GROUP:   group is invalid (contains a NUL-character).
 */
async function list(group) {
  const collection = await this.db.collection("imageCollection")
  const images = await collection.find({group: group})
  return images.map((element, key)=>element.name)
}

/** Return promise which resolves to an object containing
 *  meta-information for the image specified by group and name.
 *
 *  The return'd object must contain the following properties:
 *
 *    width:         a number giving the width of the image in pixels.
 *    height:        a number giving the height of the image in pixels.
 *    maxNColors:    a number giving the max # of colors per pixel.
 *    nHeaderBytes:  a number giving the number of bytes in the 
 *                   image header.
 *    creationTime:  the time the image was stored.  This must be
 *                   a number giving the number of milliseconds which 
 *                   have expired since 1970-01-01T00:00:00Z.
 *
 *  The implementation of this function must not read the actual image
 *  bytes from the database.
 *
 *  Defined Errors Codes:
 *
 *    BAD_GROUP:   group is invalid (contains a NUL-character).
 *    BAD_NAME:    name is invalid (contains a '/' or NUL-character).
 *    NOT_FOUND:   there is no stored image for name under group.
 */
async function meta(group, name) {
  const collection = await this.db.collection("metaCollection")
  const meta = await collection.findOne({group: group, name: name})
  const info = { creationTime: meta.creationTime };  
  return ['width', 'height', 'maxNColors', 'nHeaderBytes']
    .reduce((acc, e) => { acc[e] = meta[e]; return acc; }, info);    
}

/** Store the image specified by imgPath in the database under the
 *  specified group with name specified by the base-name of imgPath
 *  (without the extension).  The resolution of the return'd promise
 *  is undefined.
 *
 *  Defined Error Codes:
 *
 *    BAD_GROUP:   group is invalid (contains a NUL-character).
 *    BAD_FORMAT:  the contents of the file specified by imgPath does 
 *                 not satisfy the image format implied by its extension. 
 *    BAD_TYPE:    the extension for imgPath is not a supported type
 *    EXISTS:      the database already contains an image under group
 *                 with name specified by the base-name of imgPath
 *                 (without the extension). 
 *    NOT_FOUND:   the path imgPath does not exist.
 * 
 */
async function put(group, imgPath) {
    const imageName = imgPath.split('/').splice(-1,1)[0].split('.').slice(0, -1)[0]
    const type = imgPath.split('/').splice(-1,1)[0].split('.').slice(-1)[0]
    if(type==="png"){
      const newPath = await convertTo("ppm", imgPath)
      imgPath = newPath
    }
    const collection = await this.db.collection("imageCollection")
    const metaCollection = await this.db.collection("metaCollection")
    const imageData = await fsReadFile(imgPath)
    const binImage = new Binary(imageData)
    const res = collection.insertOne({group:group, name:imageName, bin:binImage, type: type})
    const ppm = new Ppm(toImgId(group, imageName, type), new Uint8Array(imageData))
    const meta = {width: ppm.width, maxNColors: ppm.maxNColors, nHeaderBytes: ppm.nHeaderBytes, height: ppm.height, creationTime: Date.now(), group: group, name: imageName}
    metaCollection.insertOne(meta)
    return undefined
}



//Utility functions

const NAME_DELIM = '/', TYPE_DELIM = '.';

/** Form id for image from group, name and optional type. */
function toImgId(group, name, type) {
  let v = `${group}${NAME_DELIM}${name}`;
  if (type) v += `${TYPE_DELIM}${type}`
  return v;
}

/** Given imgId of the form group/name return [group, name]. */
function fromImgId(imgId) {
  const nameIndex = imgId.lastIndexOf(NAME_DELIM);
  assert(nameIndex > 0);
  return [imgId.substr(0, nameIndex), imgId.substr(nameIndex + 1)];
}

/** Given a image path imgPath, return [ name, ext ]. */
function pathToNameExt(imgPath) {
  const typeDelimIndex = imgPath.lastIndexOf(TYPE_DELIM);
  const ext = imgPath.substr(typeDelimIndex + 1);
  const name = path.basename(imgPath.substr(0, typeDelimIndex));
  return [name, ext];
}

//Error utility functions

function isBadGroup(group) {
  return (group.trim().length === 0 || group.indexOf('\0') >= 0) &&
    new ImgError('BAD_GROUP', `bad image group ${group}`);
}

function isBadName(name) {
  return (name.trim().length === 0 ||
	  name.indexOf('\0') >= 0 || name.indexOf('/') >= 0) &&
    new ImgError('BAD_NAME', `bad image name '${name}'`);
}

function isBadExt(imgPath) {
  const lastDotIndex = imgPath.lastIndexOf('.');
  const type = (lastDotIndex < 0) ? '' : imgPath.substr(lastDotIndex + 1);
  return IMG_TYPES.indexOf(type) < 0 &&
    new ImgError('BAD_TYPE', `bad image type '${type}' in path ${imgPath}`);
}

function isBadPath(path) {
  return !fs.existsSync(path) &&
    new ImgError('NOT_FOUND', `file ${path} not found`);
}

function isBadType(type) {
  return IMG_TYPES.indexOf(type) < 0 &&
    new ImgError('BAD_TYPE', `bad image type '${type}'`);
}

/** Build an image error object using errorCode code and error 
 *  message msg. 
 */
function ImgError(code, msg) {
  this.errorCode = code;
  this.message = msg;
}

async function convertTo(format, imgPath){
  const _from = format === "ppm" ? "png" : "ppm";
  const to = format === "ppm" ? "ppm" : "png"
  const imageName = imgPath.split('/').splice(-1,1)[0].split('.').slice(0, -1)[0]
  const type = imgPath.split('/').splice(-1,1)[0].split('.').slice(-1)[0]
  await osExec(`magick convert ${imageName}.${_from} ${tmpDir}/${imageName}.${to}`)
  return `${tmpDir}/${imageName}.${to}`
}