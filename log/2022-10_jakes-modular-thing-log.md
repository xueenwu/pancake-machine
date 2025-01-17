## 2022 10 19 

OK, spinning up some kind of thing for this now. AFAIK I can ~ more or less use the standing OSAP bottom-end. I have a few clear tasks to begin:

- osape / osape-arduino stubs into an arduino project for this board of quentin's design 
- js auto-opening pipe, 

Then a few less clear tasks:

- do we plumb things -> up, so we use "efficient" data transfer ? 
- wrap up a "virtual thing" class, and which methods are exposed ?
- that's it, right ? give leo some handlers 

## The Toolchains Trouble

- can build a new fab-core that uses g7
- and use an arduino library 

OK I ended up... porting OSAP as a library, wasn't that bad. Should be in a better mood more often. Onwards then... 

## JS Auto-Open 

This I've done before... setup most of the guts, next is the actual check-and-swap loop / runtimes ? 

## 2022 10 20 

OK, I'm actually using OSAP sweep-stuff for most of this, then will probably trigger re-scans with an aux websocket pipe (?) or something, I can even tx that w/ osap, etc. 

```js
let rescan = async () => {
  try {
    let graph = await osap.nr.sweep()
    let usbBridge = await osap.nr.find("rt_local-usb-bridge", graph)
    // console.log(usbBridge)
    for(let ch of usbBridge.children){
      // ignore pipe up to us, 
      if(ch.name.includes("wss")) continue
      // peep across usb ports, 
      if(ch.reciprocal){
        if(ch.reciprocal.type == "unreachable"){
          console.warn(`${ch.name}'s partner is unreachable...`)
        } else {
          console.log(`found a... ${ch.reciprocal.parent.name} module`)
        }
      }
    }
  } catch (err) {
    console.error(err)
  }
}

setTimeout(rescan, 1500)
```

next would do...

- match & deliver JS object, 
- trigger on new-port signals 

did that ! 

From Leo: I downgraded the naming system with random unique IDs which presents some clear irritations when the ports randomly resweep and your code no longer works. I think storing names in EEPROM would be hugely advantagous. I added some UI for writing names to devices but we still need the guts of it.

## 2022 11 23

OK I have a motor now and should get back to building its VM... I want also to check again the general state of the modular-system thing, OSAP, and the naming-to-eeprom code... I think I might do it with the RGBBThing, to clear that up first? 

Ah! Yes - I had this in a certified half-baked state: we can rename things, but need a second name to find the proper vm's for them: so each needs a fixed root-vertex name, for the firmware, then a unique-name that's re-writable. 

Also I have this bug

### String Reading / Writing Bug

I think here it's that

- strings written in JS and in CPP are successfully read-back by JS, 
- strings written in JS are not ever read in CPP, 
- additionally, here we use c-strings, 

This means that... likely, the issue is on the ingestion side - i.e. the data is all there when it's written, but i.e. CPP goes looking for a null-termination, but the way I write strings doesn't terminate 'em as such at the moment (badness), so we have this debacle. 

OK, amended that.

### Two-Names 

OK, now we need to stash a firmware-name alongside a unique-root-name... and then report both? 

Yeah I guess I can basically concatenate to `rt_firmwareName_uniqueName`and then disambiguate w/ the `rt_[...]_[...]` delineation, that would be a kind of minimum-surgery, but a little awkward down the line. 

I actually won't have to change any embedded code for that change... 

### Motor VM

OK, I think I'm ~ ready to get to writing this thing, 

### RGBB refactor 

done this 

### OK

the motor-vm is done and seems to be working well: we would want a machine vm then, which can easily use two of those to do motion, seems like. 

I'm thinking it would maybe be useful to write one more VM, but I'm somewhat out of time... we have the button and the motor. 

Probably when we get back the best thing to do is start making demos:

- two potentiometers in, driving xy out, 
  - wants "pos target" to be floating, a new fn on the same motor vm 
- capacitive touch drum kit on solenoids 
  - or use the motors in this old reich machine, spin that up as a static demo 

## 2022 11 28 

I'm getting into machine-week hardware now... I'd basically like to have a composable demo-machine, right? 

## 2022 11 29 

I should do the machine api, etc, but would kind of like to whip up a composable machine... hardware. Seems as though that'd be foolish... I would prefer, though, not to have to controller-ize something with a gd motion transform, but I also should maybe do so, in order to work my way through the problem... in delta-terms. I'll focus up and do that, I guess. 

Also, limit switches... would be the second step. 

- machine.api() ? 
  - setVelocity(), setAcceleration() come back, in motors?
  - there's a "synchronizer" class, with *no transforms* homie, 
    - basically just does the max-velocities-check and scaling-by-unit-vector stuff 
    - is the "machine" but isn't called as such 
- migrate modular-things repos... 
  - modular-things/modular-things-controller
  - modular-things/modular-things-circuits
    - incl. mounts etc, 
- build some demos 
  - dials-to-axis on corexy 
  - drawing robot on corexy 
  - drumkit / sequencer (linear-axis-and-thwapper)

--- 

## The Week

- might be worth doing segmented motion & fixed point arithmetic, for slick motion? serves fab-two-oh... which is maybe enough of an errand ? idk 

## Dev List

- the "rename" button shouldn't allow users to rename the `firmwareName` section of the names... 
  - it's also straight up not done 

## Demo Wishlist 

- touchpad-to-streaming-position drawing robot 