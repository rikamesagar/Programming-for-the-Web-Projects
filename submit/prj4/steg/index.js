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

const OK = 200;
const CREATED = 201;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CONFLICT = 409;
const SERVER_ERROR = 500;

const serviceBase = "http://localhost:1234"

const app = express()
app.locals.port = 4000;
setupRoutes(app)
app.use('/static', express.static('public'))
//app.use(bodyParser.json())
app.listen(4000, function(){
    console.log(`listening on port ${4000}`)
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
                hideError(msg,res,{txtMessage: message, selectedImage: image})
            }
            const msg = messageFile || message
            if(msg === undefined || image === undefined || msg === "")
            {
                const msg = image ===undefined ? "No Image Selected" : "No Message Entered"
                hideError(msg, res, {txtMessage: message, selectedImage: image})
            }
            const hideResult = await axios.post(`${serviceBase}/api/steg/inputs/${image}`,{outGroup:"outputs", msg: msg})
            if(hideResult.status===201){
                const base = fs.readFileSync(resolve(templatePath, 'success', 'success.mustache'))
                res.send(Mustache.render(base.toString('utf8'), {hide:"/hide"}))
            }else{
                const base = fs.readFileSync(resolve(templatePath, 'hide', 'hide.mustache'))
                res.send(Mustache.render(base.toString('utf8'), {form:{}, error:e.toString()}))
            }
        }else{
            const images = await getImages(undefined, 'inputs');
            const base = fs.readFileSync(resolve(templatePath, 'hide', 'hide.mustache'))
            res.send(Mustache.render(base.toString('utf8'), {images: images}))
        }
    }catch(e){
        const {message, image} = req.body || {message: undefined, image: undefined};
        hideError(e.toString(), res,{txtMessage: message, selectedImage: image})
    }
}
async function hideError(e, res, form){
    const images = await getImages(form.selectedImage, 'inputs')
    const base = fs.readFileSync(resolve(templatePath, 'hide', 'hide.mustache'))
    res.send(Mustache.render(base.toString('utf8'), 
    {form:{txtMessage: form.txtMessage, selectedImage: form.selectedImage}, error:e.toString(), images: images}))
}
async function unhideError(e, res, form){
    const images = await getImages(form.selectedImage, 'outputs')
    const base = fs.readFileSync(resolve(templatePath, 'unhide', 'unhide.mustache'))
    res.send(Mustache.render(base.toString('utf8'), 
    {form:{selectedImage: form.selectedImage}, error:e.toString(), images: images}))
}
async function getImages(selectedImage, group){
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

async function unhide(req, res){
    try{
        if(req.body){
            const { image } = req.body
            if(image===undefined){
                unhideError("Select an image", res, {selectedImage: undefined})
            }
            const unhideResult = await axios.get(`${serviceBase}/api/steg/outputs/${image}`)
            const base = fs.readFileSync(resolve(templatePath, 'success', 'success.mustache'))
            res.send(Mustache.render(base.toString('utf8'), {"msg": unhideResult.data.msg, "unhide":"/unhide"}))
        }else{
            const images = await getImages(undefined, 'outputs')
            const base = fs.readFileSync(resolve(templatePath, 'unhide', 'unhide.mustache'))
            res.send(Mustache.render(base.toString('utf8'), {images: images}))
        }
    }catch(err){
        const { image } = req.body ? req.body : {image: undefined}
        const base = fs.readFileSync(resolve(templatePath, 'unhide', 'unhide.mustache'))
        unhideError(err.toString(), res, {image})
    }
}