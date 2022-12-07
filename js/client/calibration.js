/***************************************** GLOBAL VARIABLES ******************************************/
const ARMLENGTH = 250; // mm
const TEETH = 20; // number of teeth for rMotor
const TEETHDIST = 2; // mm
const EXTRUDE = -Math.PI; // radians to rotate stepper to extrude pancake mix (higher = more pancake)
const AXISORIGIN = 0; // change based on final setup
const RORIGIN = 0;
const CSCALE = 1;
const AXISVELOCITY = 0.2;
const RVELOCITY = 3;
const EXTRUSIONVELOCITY = 3;
// 800 steps per revolution -> choosing 400/pi steps per unit means 2pi units in a revolution
const SPU = 400 / Math.PI;

/***************************************** INITIAL SETUP ********************************************/
// TODO: add/change global variables for the different motors
await axisMotor.setSPU(5 * SPU);
await extrusionMotor.setSPU(SPU);
await rMotor.setSPU(SPU);
await axisMotor.setCScale(CSCALE);
await axisMotor.setVelocity(AXISVELOCITY);
await extrusionMotor.setCScale(CSCALE);
await extrusionMotor.setVelocity(EXTRUSIONVELOCITY);
await rMotor.setCScale(CSCALE);
await rMotor.setVelocity(RVELOCITY);

// should move 10mm
// await rMotor.relative(-50/(TEETH * TEETHDIST) * 2 * Math.PI);
// should move 90 degrees (or pi/2 radians)
// await axisMotor.relative(Math.PI/4);
// should do enough for 1 batter out
// await extrusionMotor.relative(4*Math.PI);
