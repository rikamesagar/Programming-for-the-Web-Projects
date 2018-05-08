#!/usr/bin/env nodejs

'use strict';

const assert = require('assert');
const process = require('process');

const UserWs = require('./user-ws');
const users = require('./users.js');

function usage() {
  console.error(`usage: ${process.argv[1]} PORT WS_BASE_URL`);
  process.exit(1);
}

function getPort(portArg) {
  let port = Number(portArg);
  if (!port) usage();
  return port;
}

const BASE = '/users';

async function go(args) {
  try {
    const port = getPort(args[0]);
    const wsBaseUrl = args[1];
    const userWs = new UserWs(wsBaseUrl);
    users(port, BASE, userWs);
  }
  catch (err) {
    console.error(err);
  }
}
    

if (process.argv.length != 4) usage();
go(process.argv.slice(2));
