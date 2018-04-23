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
        if(req.body && req.file){
            console.log("In first")
            const fileMessage = req.file;
            const messageFile = Buffer.from(fileMessage.buffer, 'binary').toString('utf8')
            const {message, image} = req.body;
            if(fileMessage && message){
                console.log("ERROR: Two messages")
            }
            const msg = messageFile || message
            const hideResult = await axios.post(`${serviceBase}/api/steg/inputs/${image}`,{outGroup:"output", msg: msg})
            console.log(hideResult.status)
            if(hideResult.status===201){
                const base = fs.readFileSync(resolve(templatePath, 'success', 'success.mustache'))
                res.send(Mustache.render(base.toString('utf8'), {}))
            }else{
                const base = fs.readFileSync(resolve(templatePath, 'error', 'error.mustache'))
                res.send(Mustache.render(base.toString('utf8'), {}))
            }
        }else{
            console.log("Making request "+`${serviceBase}/api/images/inputs`)
            const result = await axios.get(`${serviceBase}/api/images/inputs`)
            const images = await Promise.all(result.data.map(async (e, key)=>{
                const imageResult = await axios.get(`${serviceBase}/api/images/inputs/${e}.png`,
                {responseType:"arraybuffer"})
                //fs.writeFileSync(`${imagePath}/images/${e}.png`, imageResult.data)
                const base64 = Buffer.from(imageResult.data, 'binary').toString('base64')
                //const base64 = base64_arraybuffer.encode(imageResult.data)   
                console.log(e);         
                return {name: e, url:`data:image/png;base64,${base64}`}
            }))
            const base = fs.readFileSync(resolve(templatePath, 'hide', 'hide.mustache'))
            res.send(Mustache.render(base.toString('utf8'), {images: images}))
        }
    }catch(e){
        console.log("Error: \n"+e)
        const base = fs.readFileSync(resolve(templatePath, 'error', 'error.mustache'))
        res.send(Mustache.render(base.toString('utf8'), {}))
    }

}

async function unhide(req, res){
    try{
        if(req.body){
            const { image } = req.body
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
                //fs.writeFileSync(`${imagePath}/images/${e}.png`, imageResult.data)
                const base64 = Buffer.from(imageResult.data, 'binary').toString('base64')
                //const base64 = base64_arraybuffer.encode(imageResult.data)   
                console.log(e);         
                return {name: e, url:`data:image/png;base64,${base64}`}
            }))
            const base = fs.readFileSync(resolve(templatePath, 'unhide', 'unhide.mustache'))
            res.send(Mustache.render(base.toString('utf8'), {images: images}))
        }
    }catch(err){
        console.log("Error: \n"+e)
        const base = fs.readFileSync(resolve(templatePath, 'error', 'error.mustache'))
        res.send(Mustache.render(base.toString('utf8'), {}))
    }
}