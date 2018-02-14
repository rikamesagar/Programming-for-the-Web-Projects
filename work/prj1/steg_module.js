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
/** Hide message msg using PPM image contained in this StegModule object
 * and return an object containing the new PPM image.
 *
 * Specifically, this function will always return an object.  If an
 * error occurs, then the "error" property of the return'd object
 * will be set to a suitable error message.  If everything ok, then
 * the "ppm" property of return'd object will be set to a Ppm image
 * ppmOut which is derived from this.ppm with msg hidden.
 *
 * The ppmOut image will be formed from the image contained in this
 * StegModule object and msg as follows.
 *
 * 1.  The meta-info (header, comments, resolution, color-depth)
 * for ppmOut is set to that of the PPM image contained in this
 * StegModule object.
 *
 * 2.  A magicMsg is formed as the concatenation of STEG_MAGIC,
 * msg and the NUL-character '\0'.
 *
 * 3.  The bits of the character codes of magicMsg including the
 * terminating NUL-character are unpacked (MSB-first) into the
 * LSB of successive pixel bytes of the ppmOut image.  Note
 * that the pixel bytes of ppmOut should be identical to those
 * of the image in this StegModule object except that the LSB of each
 * pixel byte will contain the bits of magicMsg.
 *
 * The function should detect the following errors:
 *
 * STEG_TOO_BIG: The provided pixelBytes array is not large enough
 * to allow hiding magicMsg.
 * STEG_MSG: The image contained in this StegModule object may already
 * contain a hidden message; detected by seeing
 * this StegModule object's underlying image pixel bytes
 * starting with a hidden STEG_MAGIC string.
 *
 * Each error message must start with the above IDs (STEG_TOO_BIG, etc).
 */

StegModule.prototype.hide = function(msg) {
  //TODO: hide STEG_MAGIC + msg + '\0' into a copy of this.ppm
  //construct copy as shown below, then update pixelBytes in the copy.
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
/** Return message hidden in this StegModule object.  Specifically, if
 * an error occurs, then return an object with "error" property set
 * to a string describing the error.  If everything is ok, then the
 * return'd object should have a "msg" property set to the hidden
 * message.  Note that the return'd message should not contain
 * STEG_MAGIC or the terminating NUL '\0' character.
 *
 * The function will detect the following errors:
 *
 * STEG_NO_MSG: The image contained in this Steg object does not
 * contain a hidden message; detected by not
 * seeing this Steg object's underlying image pixel
 * bytes starting with a hidden STEG_MAGIC
 * string.
 * STEG_BAD_MSG: A bad message was decoded (the NUL-terminator
 * was not found).
 *
 * Each error message must start with the above IDs (STEG_NO_MSG, etc).
 */

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
//const nullAbsent = dString.indexOf("\0") != -1

//  console.log(dString.indexOf("\0"))
//  console.log(dString.length)

  if(stgAbsent) return {error: "STEG_NO_MSG"}
//  if(nullAbsent) return {error: "STEG_BAD_MSG"}

 dString = dString.trimLeft(STEG_MAGIC)

let tempString = ""
  for(let i = 0; i < dString.indexOf("\0"); i++){
                tempString =  tempString + dString[i];
  }

    decodedMessage = "Decoded Message is : " + tempString

//  console.log(dString)
//  return 'msg: ' + dString;
   return { msg: decodedMessage };
//   return { msg: dString };
}
module.exports = StegModule;
