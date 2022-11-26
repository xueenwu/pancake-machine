/*
a "virtual thing" - of course 

Jake Read, Leo McElroy and Quentin Bolsee at the Center for Bits and Atoms
(c) Massachusetts Institute of Technology 2022

This work may be reproduced, modified, distributed, performed, and
displayed for any purpose, but must acknowledge the open systems assembly protocol (OSAP) and modular-things projects.
Copyright is retained and must be preserved. The work is provided as is;
no warranty is provided, and users accept all liability.
*/

import { TS } from "../osapjs/core/ts.js"
import PK from "../osapjs/core/packets.js"

export default function(osap, vt, name) {

  // ---------------------------------- OSAP... stuff, 
  let routeToFirmware = PK.VC2VMRoute(vt.route)

  // this is the '1th' vertex, so we address it like-this:
  let rgbEndpointMirror = osap.endpoint("rgbEndpointMirror")
  rgbEndpointMirror.addRoute(PK.route(routeToFirmware).sib(1).end());

  let capData = 0;
  let padValue = osap.endpoint("padValueMirror");
  // padValue.addRoute(PK.route(routeToFirmware).sib(2).end());
  // console.log(
    // routeToFirmware,
    // PK.route().sib(0).pfwd().sib(0).pfwd().sib(1).end(),
    // PK.route(routeToFirmware).sib(2).end()
  // )
  padValue.onData = (data) => {
    const number = TS.read("int16", data, 0);
    console.log("cap reading:", number);
    capData = number;
  }

  let capacitivePads = osap.endpoint("readPadMirror");
  capacitivePads.addRoute(PK.route(routeToFirmware).sib(3).end());


  // we should have a setup function:
  const setup = async () => {
    try {
      // we want to hook i.e. our button (in embedded, at index 2) to our button rx endpoint, 
      // whose index we can know...
      // given that we know ~ what the topology looks like in these cases (browser...node...usb-embedded)
      // we should be able to dead-reckon the route up:
      let routeUp = PK.route().sib(0).pfwd().sib(0).pfwd().sib(3).end()
      // the source of our button presses is here... the 2nd endpoint at our remote thing
      let source = vt.children[2]
      // rm any previous,
      try {
        await osap.mvc.removeEndpointRoute(source.route, 0)
      } catch (err) {
        // this is chill, we get an error if we try to delete and nothing is there, can ignore... 
        // console.error(err)
      }
      // so we build a route from that thing (the source) to us, using this mvc-api:
      await osap.mvc.setEndpointRoute(source.route, routeUp)
    } catch (err) {
      throw err
    }
  }

  return {
    setRGB: async (r, g, b) => {
      try {
        // float, float, float, -> int-etc,
        // we could also do the i.e. linearization here, or accept various "color" types 
        let datagram = new Uint8Array(3)
        datagram[0] = 255 - r * 255
        datagram[1] = 255 - g * 255
        datagram[2] = 255 - b * 255 
        // console.log('writing', datagram)
        await rgbEndpointMirror.write(datagram, "acked")
      } catch (err) {
        console.error(err)
      }
    },
    readPad: async (index) => {
      try {
        // let data = await padQuery.pull();
        // const data = await capacitivePads.read();
        // return TS.read("int16", data, 0);
        let datagram = new Uint8Array(1);
        datagram[0] = index;
        await capacitivePads.write(datagram, "acked")
        // this return below of capData would return *the previous* reading, 
        // not whatever is sent up after this "trigger" is sent down... 
        // you would have to wait here for new data to be sent 
        // up to the capacitivePads endpoint, so i.e. setting a flag 
        // that you've triggered a read, then awaiting the next .onData() call, 
        // instead the new firmware just uses the endpoint-query thing, 
        // which stuffs the endpoint just before a query packet reads it 
        // I guess that if the cap.read() call in embedded code is a little slow, 
        // there should be a way to trigger each individually, but I would in that case 
        // just write a FW that loops through 'em on its own time and writes new data 
        // as-fast-as-possible, then the most-recents can be retrieved immediately 
        // await padValue.read();
        return capData;
      } catch (err) {
        console.error(err)
      }
    },
    setup,
    vt,
  }
}