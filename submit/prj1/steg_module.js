#!/usr/bin/env nodejs

const TextEncoder = require('util').TextEncoder;
const TextDecoder = require('util').TextDecoder;
'use strict'; const Ppm = require('./ppm'); /** prefix which always precedes actual message when message is hidden
 * in an image.
 */
const STEG_MAGIC = 'stg'; /** Constructor which takes some kind of ID and a Ppm image */
function StegModule(id, ppm) {
  this.id = id;
  this.ppm = ppm;
}

/************************************  HIDE  ***********************************************/

StegModule.prototype.hide = function(msg) {
  //TODO: hide STEG_MAGIC + msg + '\0' into a copy of this.ppm
  //construct copy as shown below, then update pixelBytes in the copy.

  var retUnhide = this.unhide();
  if(retUnhide.msg != null) return {error: "STEG_MSG: "+ this.id +" image already contains a hidden message"};


  var maxSize = (this.ppm.width*this.ppm.height*3/8 - 3);

  if(msg.length+1 > maxSize)
  {
	return {error: "STEG_TOO_BIG : "+this.id+" message too big to be hidden in image"};
  }

  pixelBytesLocal = this.ppm.pixelBytes;
  pixelBytesLocal = new Uint8Array(pixelBytesLocal)			//Creating local copy of pixelBytes
  const stegMessage = STEG_MAGIC+msg+"\0"
  let arrEncodedStegMessage = []
  let encodedStegMessage = new TextEncoder().encode(stegMessage)	//Converting strgmsg from String to ASCII
  //const letterArray = []
  encodedStegMessage.forEach(function(letter){
	const letterArray = []
	let mask = 1 << 7						//To convert Decimal to Binary
	while(mask>0){
		if((letter & mask) === mask){
			letterArray.push(1)
		}else{
			letterArray.push(0)
		}
		mask = mask >> 1
	}
	arrEncodedStegMessage.push(letterArray)
  })
  arrEncodedStegMessage.forEach(function(arr, index){
	arr.forEach(function(bit, bitIndex){
		const pixelIndex = (index * 8) + bitIndex
		pixelBytesLocal[pixelIndex] = bit === 0 ? pixelBytesLocal[pixelIndex] & (~1) : pixelBytesLocal[pixelIndex] | 1;
	})
  })
  this.ppm.pixelBytes = pixelBytesLocal;
  return {ppm: new Ppm(this.ppm)};
}

/*****************************   UNHIDE    ******************************************************************************************/

StegModule.prototype.unhide = function() {
  //TODO
  //console.log(this.ppm.pixelBytes)
  //let pixelBytesUnhide = this.ppm.pioxelBytes
  //console.log(this.ppm.pixelBytes)
  let dString = ""
  let byteContainer = []
  this.ppm.pixelBytes.forEach(function(b){
	let byte = b
	let lsb = byte & 1
	if(byteContainer.length < 8){
		byteContainer.push(lsb)
	}
	else{
		const raw_letter = '0b'+byteContainer.join('')
		const letter = new TextDecoder().decode(new Uint8Array([raw_letter]))
		dString = dString + letter
		byteContainer = []
		byteContainer.push(lsb)
	}
  })

String.prototype.trimLeft = function(preFix) {
  if (preFix === undefined)
    charlist = "\s";

 return this.replace(new RegExp("^[" + preFix + "]+"), "");
};

  const stgAbsent = dString.indexOf(STEG_MAGIC) === -1
  const nullAbsent = dString.indexOf("\0") === -1

//  console.log(dString.indexOf("\0"))
//  console.log(dString.length)

  if(stgAbsent) return {error: "STEG_NO_MSG: "+this.id+": image does not have a message"}
  if(nullAbsent) return {error: "STEG_BAD_MSG: " +this.id+ " bad message"}

 dString = dString.trimLeft(STEG_MAGIC)

let tempString = ""
  for(let i = 0; i < dString.indexOf("\0"); i++){
                tempString =  tempString + dString[i];
  }

   decodedMessage = tempString

   return { msg: decodedMessage};
}
module.exports = StegModule;
