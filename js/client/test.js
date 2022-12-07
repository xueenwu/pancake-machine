/*
MOTORS:
  - axisMotor: stepper motor that controls rotation of arm + pancake extruder
  - extrusionMotor: stepper motor that controls the extrusion of pancake batter
  - rMotor: stepper motor that controls the distance of the extruder from the axis
*/

/***************************************** GLOBAL VARIABLES ******************************************/
const ARMLENGTH = 250; // mm
const TEETH = 20; // number of teeth for rMotor
const TEETHDIST = 2; // mm
const EXTRUDE = Math.PI / 2; // radians to rotate stepper to extrude pancake mix (higher = more pancake)
const AXISORIGIN = 0; // change based on final setup
const RORIGIN = 0;
const CSCALE = 1;
const VELOCITY = 100;
// 800 steps per revolution -> choosing 400/pi steps per unit means 2pi units in a revolution
const SPU = 400 / Math.PI;

/***************************************** INITIAL SETUP ********************************************/
// TODO: add/change global variables for the different motors
await axisMotor.setCScale(CSCALE);
await axisMotor.setVelocity(VELOCITY);
await axisMotor.setSPU(SPU);
await extrusionMotor.setCScale(CSCALE);
await extrusionMotor.setVelocity(VELOCITY);
await extrusionMotor.setSPU(SPU);
await rMotor.setCScale(CSCALE);
await rMotor.setVelocity(VELOCITY);
await rMotor.setSPU(SPU);

/***************************************** HELPER FUNCTIONS ******************************************/
/**
 * Moves axisMotor and rMotor to default position -
 * vertical center of a semi-circle, or at 0 radians in [-pi/2, pi/2] with radius ARMLENGTH
 */
async function moveToOrigin() {
  await axisMotor.absolute(AXISORIGIN);
  await rMotor.absolute(RORIGIN);
};

/**
 * Convert a given rectangular coordinate (x, y) into polar coordinates (theta, r) for
 * axisMotor to rotate "theta" from origin and rMotor to move to a distance "r"
 * @param  {Number} x The x-coordinate 
 * @param  {Number} y The y-coordinate
 * @return {Array}    Array[Number, Number]: first elt is theta and the second elt is r
 */
const convertToPolar = (x, y) => {
  let theta = Math.atan2(y, x); // radians where theta is in [-pi/2, pi/2]
  let r = Math.sqrt(x**2 + y**2);

  // Make sure we're working in bounds
  if(r > ARMLENGTH) {
    throw new Error('XY coords are outside range of arm');
  }

  /***************************************** MAIN FUNCTIONS ******************************************/
  /**
   * Given an array of (x, y) coordinates, draw out the pancake, in order
   * @param  {Array} coordinates The array[array[number, number]] of (x, y) coords to draw in order
   */
  async function execute(coordinates) {
    // First reset the body
    moveToOrigin();
  
    // Now move the axisMotor & rMotor to desired locations to extrude
    let polarCoords = coordinates.map(rect => convertToPolar(rect[0], rect[1]));
    let prev = [AXISORIGIN, RORIGIN];
    for (let i = 0; i < polarCoords.length; i++) {
      await axisMotor.relative(polarCoords[i][0] - prev[0]);
      let dist = polarCoords[i][1] - prev[1];
      await rMotor.relative(dist/(TEETH * TEETHDIST));
      await extrusionMotor.absolute(EXTRUDE);
      prev = polarCoords[i]
    }
  
    // Reset
    moveToOrigin();
  }

  return [theta, r];
};

/***************************************** TEST CODE ******************************************/
execute(${xyCoords});