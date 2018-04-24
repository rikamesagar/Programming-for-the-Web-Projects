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
            console.log("In first")
            const fileMessage = req.file;
            let messageFile = undefined
            if(req.file)
                messageFile = Buffer.from(fileMessage.buffer, 'binary').toString('utf8')

            const {message, image} = req.body;
            if(fileMessage && message){
                console.log("ERROR: Two messages")
                const msg = "Two messages entered";
                const base = fs.readFileSync(resolve(templatePath, 'error', 'hide.mustache'))
                res.send(Mustache.render(base.toString('utf8'), {msg}))
            }
            const msg = messageFile || message
            if(msg === undefined || image === undefined || msg === "")
            {
                const msg = image ===undefined ? "No Image Selected" : "No Message Entered"

                const base = fs.readFileSync(resolve(templatePath, 'error', 'error.mustache'))
                res.send(Mustache.render(base.toString('utf8'), {msg}))
            }
            const hideResult = await axios.post(`${serviceBase}/api/steg/inputs/${image}`,{outGroup:"output", msg: msg})
            console.log(hideResult.status)
            if(hideResult.status===201){
                const msg = "Message Hidden Successefully ";
                const base = fs.readFileSync(resolve(templatePath, 'success', 'success.mustache'))
                res.send(Mustache.render(base.toString('utf8'), {msg}))
            }else{
                const msg = "Error occurred"
                const base = fs.readFileSync(resolve(templatePath, 'error', 'error.mustache'))
                res.send(Mustache.render(base.toString('utf8'), {msg}))
            }
        }else{
            console.log("Making request "+`${serviceBase}/api/images/inputs`)
            const result = await axios.get(`${serviceBase}/api/images/inputs`)
            const images = await Promise.all(result.data.map(async (e, key)=>{
                const imageResult = await axios.get(`${serviceBase}/api/images/inputs/${e}.png`,
                {responseType:"arraybuffer"})
                const base64 = Buffer.from(imageResult.data, 'binary').toString('base64')   
                console.log(e);         
                return {name: e, url:`data:image/png;base64,${base64}`}
            }))
            const base = fs.readFileSync(resolve(templatePath, 'hide', 'hide.mustache'))
            res.send(Mustache.render(base.toString('utf8'), {images: images}))
        }
    }catch(e){
        const msg = e.toString();
        const base = fs.readFileSync(resolve(templatePath, 'error', 'error.mustache'))
                res.send(Mustache.render(base.toString('utf8'), {msg}))
    }

}

async function unhide(req, res){
    try{
        if(req.body){
            const { image } = req.body
            if(image === undefined)
            {
                const msg = "Image not selected";
                const base = fs.readFileSync(resolve(templatePath, 'error', 'error.mustache'))
                res.send(Mustache.render(base.toString('utf8'), {msg}))    
            }
            console.log("Body "+Object.keys(req.body), req.body)
            const unhideResult = await axios.get(`${serviceBase}/api/steg/output/${image}`)
            console.log("Hidden message "+ unhideResult.data.msg)
            const base = fs.readFileSync(resolve(templatePath, 'success', 'success.mustache'))
            res.send(Mustache.render(base.toString('utf8'), {"msg": unhideResult.data.msg}))
        }else{
            console.log("Making request "+`${serviceBase}/api/images/output`)
            const result = await axios.get(`${serviceBase}/api/images/output`)
            const images = await Promise.all(result.data.map(async (e, key)=>{
                const imageResult = await axios.get(`${serviceBase}/api/images/output/${e}.png`,
                {responseType:"arraybuffer"})
                const base64 = Buffer.from(imageResult.data, 'binary').toString('base64')
                console.log(e);         
                return {name: e, url:`data:image/png;base64,${base64}`}
            }))
            const base = fs.readFileSync(resolve(templatePath, 'unhide', 'unhide.mustache'))
            res.send(Mustache.render(base.toString('utf8'), {images: images}))
        }
    }catch(err){
        const msg = err.toString();
        const base = fs.readFileSync(resolve(templatePath, 'error', 'error.mustache'))
        res.send(Mustache.render(base.toString('utf8'), {msg}))
    }
}