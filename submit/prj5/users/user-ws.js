'use strict';

const axios = require('axios');


function UserWs(baseUrl) {
  this.usersUrl = `${baseUrl}/users`;
}

module.exports = UserWs;

UserWs.prototype.list = async function(q) {
  try {
    const url = this.usersUrl + ((typeof q === 'undefined') ? '' : `?${q}`);
    const response = await axios.get(url);
    return response.data;
  }
  catch (err) {
    throw (err.response.data) ? err.response.data : err;
  }
};

UserWs.prototype.get = async function(id) {
  try {
    const response = await axios.get(`${this.usersUrl}/${id}`);
    return response.data;
  }
  catch (err) {
    throw (err.response.data) ? err.response.data : err;
  }  
};

UserWs.prototype.delete = async function(id) {
  try {
    const response = await axios.delete(`${this.usersUrl}/${id}`);
    return response.data;
  }
  catch (err) {
    throw (err.response.data) ? err.response.data : err;
  }
};

UserWs.prototype.create = async function(user) {
  try {
    const response = await axios.post(this.usersUrl, user);
    return response.data;
  }
  catch (err) {
    throw (err.response.data) ? err.response.data : err;
  }
};

UserWs.prototype.update = async function(user) {
  try {
    const response = await axios.patch(`${this.usersUrl}/${user.id}`, user);
    return response.data;
  }
  catch (err) {
    throw (err.response.data) ? err.response.data : err;
  }  
};

