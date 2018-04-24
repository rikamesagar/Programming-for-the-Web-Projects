#!/usr/bin/env nodejs

'use strict';

const path = require('path');
const process = require('process');
const express = require('express');
const Mustache = require('mustache');
const fs = require('fs')
const {promisify} = require('util');
const resolve = require('path').resolve;
const templatePath = resolve(process.cwd(), 'views');
const imagePath = resolve(process.cwd(), 'public')
const axios = require('axios');
const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer();
const assert = require('assert');

const OK = 200;
const CREATED = 201;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CONFLICT = 409;
const SERVER_ERROR = 500;

let port;

let serviceBase;

function usage() {
    console.error(`usage: ${process.argv[1]} PORT WS_BASE_URL`);
    process.exit(1);
  }

  function getPort(portArg) {
    let port = Number(portArg);
    if (!port) usage();
    return port;
  }

  const BASE = '/api';

async function go(args) {
  try {
    port = getPort(args[0]);
    serviceBase = args[1];
  }
  catch (err) {
    console.error(err);
  }
} 

if (process.argv.length != 4) usage();
go(process.argv.slice(2));

const app = express()
setupRoutes(app)
app.use('/static', express.static('public'))
app.listen(port, function(){
    console.log(`listening on port ${port}`)
})


function setupRoutes(app){
    app.get(`/index.html`, (req, res)=>{
        const base = fs.readFileSync(resolve(templatePath, 'index', 'index.mustache'))
        res.send(Mustache.render(base.toString('utf8'), {images: {images: true}}))
    })
    app.get(`/hide`, (req, res)=>hide(req, res))
    app.post(`/hide`, upload.single('file_msg'), (req, res)=>hide(req, res))
    
    app.get(`/unhide`, (req, res)=>{unhide(req, res)})
    app.post('/unhide',bodyParser.urlencoded({ extended: false }), (req, res)=>{unhide(req, res)})
}

async function hide(req, res){
    try{
        if(req.body){
            const fileMessage = req.file;
            let messageFile = undefined
            if(req.file)
                messageFile = Buffer.from(fileMessage.buffer, 'binary').toString('utf8')
            const {message, image} = req.body;
            if(fileMessage && message){
                const msg = "Two messages entered";
                return hideError(msg,res,{txtMessage: message, selectedImage: image})
            }
            const msg = messageFile || message
            if(msg === undefined || image === undefined || msg === "")
            {
                const msg = image ===undefined ? "No Image Selected" : "No Message Entered"
                return hideError(msg, res, {txtMessage: message, selectedImage: image})
            }
            const hideResult = await axios.post(`${serviceBase}/api/steg/inputs/${image}`,{outGroup:"outputs", msg: msg})
            if(hideResult.status===201){
                const base = fs.readFileSync(resolve(templatePath, 'success', 'success.mustache'))
                return res.send(Mustache.render(base.toString('utf8'), {hide:"/hide"}))
            }else{
                const base = fs.readFileSync(resolve(templatePath, 'hide', 'hide.mustache'))
                return res.send(Mustache.render(base.toString('utf8'), {form:{}, error:e.toString(), port:`${port}`}))
            }
        }else{
            const images = await getImages(undefined, 'inputs');
            const base = fs.readFileSync(resolve(templatePath, 'hide', 'hide.mustache'))
            return res.send(Mustache.render(base.toString('utf8'), {images: images, port:`${port}`}))
        }
    }catch(e){
        const {message, image} = req.body || {message: undefined, image: undefined};
        return hideError(e.toString(), res,{txtMessage: message, selectedImage: image})
    }
}
async function hideError(e, res, form){
    try{
    const images = await getImages(form.selectedImage, 'inputs')
    const base = fs.readFileSync(resolve(templatePath, 'hide', 'hide.mustache'))
    return res.send(Mustache.render(base.toString('utf8'), 
    {form:{txtMessage: form.txtMessage, selectedImage: form.selectedImage}, error:e.toString(), images: images, port:`${port}`}))
    }
    catch(err){
        return err;
    }
}
async function unhideError(e, res, form){
    try{
    const images = await getImages(form.selectedImage, 'outputs')
    const base = fs.readFileSync(resolve(templatePath, 'unhide', 'unhide.mustache'))
    return res.send(Mustache.render(base.toString('utf8'), 
    {form:{selectedImage: form.selectedImage}, error:e.toString(), images: images, port:`${port}`}))
    }
    catch(e){
        return e;
    }
}
async function getImages(selectedImage, group){
    try{
    const result = await axios.get(`${serviceBase}/api/images/${group}`) 
    const images = await Promise.all(result.data.map(async (imageName, key)=>{
        const imageResult = await axios.get(`${serviceBase}/api/images/${group}/${imageName}.png`,
        {responseType:"arraybuffer"})
        const base64 = Buffer.from(imageResult.data, 'binary').toString('base64')
        const selected = imageName === selectedImage        
        return {name: imageName, url:`data:image/png;base64,${base64}`, selected: selected}
    }))
    return images;
    }
    catch(err){
        const { image } = req.body ? req.body : {image: undefined}
        unhideError(err.toString(), res, {image})
    }
}

async function unhide(req, res){
    try{
        if(req.body){
            const { image } = req.body
            if(image===undefined){
                unhideError("Select an image", res, {selectedImage: undefined})
            }
            const unhideResult = await axios.get(`${serviceBase}/api/steg/outputs/${image}`)
            const base = fs.readFileSync(resolve(templatePath, 'success', 'success.mustache'))
            res.send(Mustache.render(base.toString('utf8'), {"msg": unhideResult.data.msg, "unhide":"/unhide", port:`${port}`}))
        }else{
            const images = await getImages(undefined, 'outputs')
            const base = fs.readFileSync(resolve(templatePath, 'unhide', 'unhide.mustache'))
            res.send(Mustache.render(base.toString('utf8'), {images: images, port:`${port}`}))
        }
    }catch(err){
        const { image } = req.body ? req.body : {image: undefined}
        const base = fs.readFileSync(resolve(templatePath, 'unhide', 'unhide.mustache'))
        unhideError(err.toString(), res, {image})
    }
}