import { rescan } from "./modularThingClient.js";
import { global_state } from "./global_state.js";
import createSynchronizer from "../virtualThings/synchronizer";
import Terminal from "xterm";
import { render, html } from "lit-html";

import "./codemirror.js";

const view = (state) => html`
  <div class="menu">
    <div class="menu-item" @click=${runCode}>run (shift+enter)</div>
    <div class="menu-item" @click=${rescan}>scan</div>
    <div
      class="menu-item"
      @click=${() => (global_state.viewWindow = !state.viewWindow)}
    >
      view/code
    </div>
  </div>
  <div class="content">
    <div class="left-pane">
      <codemirror-editor></codemirror-editor>
      <div class="terminal">
        <div class="entry-line">>>><input /></div>
      </div>

      <!-- <textarea spellcheck="false" class="code-editor"></textarea> -->
    </div>
    <div class="things">
      <div style="font-weight:700; font-size: 1.2em; padding-bottom: 10px;">
        List of Things
      </div>
      ${Object.entries(global_state.things).map(drawThing)}
    </div>

    <div class=${["view-window", state.viewWindow ? "" : "hide"].join(" ")}>
      <div class="column_75" id="column_75">
        <canvas
          id="draw-pancake"
          width="500px"
          height="500px"
          style="border:1px solid #000000; margin: 30px"
        ></canvas>
      </div>
      <div class="column_5"></div>
      <div class="column_20">
        <div><strong>Step motor status:</strong></div>
        <div>Motor 1: Disconnected</div>
        <div>Motor 2: Disconnected</div>
        <div>Motor 3: Disconnected</div>
        <br />
        <div><strong>Basic commands</strong></div>
        <div>
          Motor 1:
          <button id="btn_11" class="mButton">+</button>
          <button id="btn_12" class="mButton">-</button>
        </div>
        <div>
          Motor 2:
          <button id="btn_21" class="mButton">+</button>
          <button id="btn_22" class="mButton">-</button>
        </div>
        <div>
          Motor 3:
          <button id="btn_31" class="mButton">+</button>
          <button id="btn_32" class="mButton">-</button>
        </div>
        <br />
        <div><strong>Pancake simple shapes</strong></div>
        <button id="btn_rect" class="mButton2">Draw rectangle</button>
        <button id="btn_circle" class="mButton2">Draw circle</button>
        <br />
        <br />
        <div><strong>Canvas complex shapes</strong></div>
        <button id="btn_clear" class="mButton2">Clear canvas</button>
        <button id="btn_send" class="mButton2">Send shapes</button>
        <br />
        <br />
        <div><strong>General function</strong></div>
        <button id="btn_reset" class="mButton2">Stop and reset</button>
      </div>
    </div>
  </div>
  ${state.renaming !== "" ? renameForm(state) : ""}
`;

const drawThing = (thing) => html`
  <div class="thing">
    <div class="thing-top-line">
      <div class="thing-name">Name: ${thing[0]}</div>
      <button class="button" @click=${() => (global_state.renaming = thing[0])}>
        rename
      </button>
    </div>
    <div>Type: ${thing[1].firmwareName}</div>
    <div class="thing-api">${drawApi(thing)}</div>
  </div>
  <hr />
`;

const drawApi = (thing) => {
  const [name, obj] = thing;
  const api = obj.vThing.api;

  return api.map(
    (entry) => html`
      <div class="apiEntry">
        <div>
          ${entry.name}(${entry.args.map((x) => x.split(":")[0]).join(", ")})
        </div>
        ${entry.args.map(
          (x, i) => html`<div style="padding-left: 10px;">${x}</div>`
        )}
        ${entry.return
          ? html`<div class="apiEntry-return">
              <b>returns:</b> ${entry.return}
            </div>`
          : ""}
      </div>
    `
  );
};

const getApi = (thing) => {
  const api = Object.keys(thing).map((x) => [x, getParamNames(thing[x])]);
  // don't include "setup" or "setName" or "vt"
  return api
    .filter((x) => !["setup", "setName", "vt", "firmwareName"].includes(x[0]))
    .map(apiEntry);
};

const apiEntry = ([name, params]) => html`
  <div class="apiEntry">${name}(${params.join(", ")})</div>
`;

var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
var ARGUMENT_NAMES = /([^\s,]+)/g;
function getParamNames(func) {
  var fnStr = func.toString().replace(STRIP_COMMENTS, "");
  var result = fnStr
    .slice(fnStr.indexOf("(") + 1, fnStr.indexOf(")"))
    .match(ARGUMENT_NAMES);
  if (result === null) result = [];
  return result;
}

const renameForm = (state) => html`
  <div class="rename-form">
    <div class="rename-input">
      <div class="rename-label">Name:</div>
      <input .value=${state.renaming} class="rename-form-input" />
    </div>
    <button
      class="button"
      @click=${() => {
        const thing = state.things[state.renaming];
        const newName = document.querySelector(".rename-form-input").value;
        thing.vThing.setName(newName);
        delete state.things[state.renaming];
        state.things[newName] = thing;
        state.renaming = "";
      }}
    >
      rename
    </button>
    <button class="button" @click=${() => (state.renaming = "")}>close</button>
  </div>
`;

const r = () => {
  render(view(global_state), document.body);
  window.requestAnimationFrame(r);
};

window.state = () => console.log(global_state);

function init() {
  r();
  // "terminal is not a constructor" despite NPM reinstall
  // var term = new Terminal();
  // term.open(document.querySelector('.terminal'));
  // term.write('Hello from \x1B[1;3;31mxterm.js\x1B[0m $ ');
  const cache = localStorage.getItem("cache");
  if (cache) {
    const cm = document.querySelector("codemirror-editor");
    cm.view.dispatch({
      changes: { from: 0, insert: cache ?? "" },
    });
  }
}

init();

function getCode() {
  const cm = document.querySelector("codemirror-editor");
  const doc = cm.view.state.doc;
  const code = doc.toString();

  return code;
}

let intervals = [];
let timeouts = [];
let loops = [];

function runCode() {
  const code = getCode();
  runCodeStr(code);
}

function runCodeStr(codeStr) {
  const code = codeStr;
  console.log(code);

  const AsyncFunction = async function () {}.constructor;

  intervals.forEach(clearInterval);
  timeouts.forEach(clearTimeout);
  loops.forEach((x, i) => {
    loops[i] = false;
  });

  const patchedInterval = (callback, time, ...args) => {
    const interval = setInterval(callback, time, ...args);
    intervals.push(interval);
    return interval;
  };

  const patchedTimeout = (callback, time, ...args) => {
    const timeout = setTimeout(callback, time, ...args);
    timeouts.push(timeout);
    return timeout;
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const loop = async (fn, minterval = 0) => {
    let n = loops.length;
    loops.push(true);
    while (loops[n]) {
      const date = new Date();
      const start = date.getTime();
      await fn();
      const elapsed = date.getTime() - start;
      if (elapsed < minterval) await sleep(minterval - elapsed);
    }
  };

  const render = (node) => {
    const viewWindow = document.querySelector(".view-window");
    viewWindow.innerHTML = "";
    viewWindow.append(node);
  };

  const things = {};

  for (const key in global_state.things) {
    things[key] = global_state.things[key].vThing;
  }

  const args = {
    ...things,
    setInterval: patchedInterval,
    setTimeout: patchedTimeout,
    createSynchronizer,
    loop,
    render,
    // document: null,
    window: null,
    eval: null,
  };

  const names = Object.keys(args);
  const values = Object.values(args);

  const f = new AsyncFunction(...names, code);

  f(...values);
}

function runCodeXyCoords(xyCoords) {
  runCodeStr(
    `/*
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
      
      return [theta, r];
    };
    
    
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
      let prev = [AXISORIGIN, RORIGIN]
      for (let i = 0; i < polarCoords.length; i++) {
        await axisMotor.relative(polarCoords[i][0] - prev[0]);
        let dist = polarCoords[i][1] - prev[1];
        await rMotor.relative(dist/(TEETH * TEETHDIST));
        await extrusionMotor.relative(EXTRUDE);
        prev = polarCoords[i];
      }
    
      // Reset
      moveToOrigin();
    }

    /***************************************** TEST CODE ******************************************/
    execute(${xyCoords});`
  );
}

window.addEventListener("keydown", (e) => {
  const code = getCode();

  window.localStorage.setItem("cache", code);

  if (e.keyCode === 13 && e.shiftKey) {
    console.log("shift + enter");
    // const code = getCode();
    // code = `await axisMotor.setCScale(1);
    // await axisMotor.setSPU(1);
    // await axisMotor.relative(1);`;
    runCode();
    e.preventDefault();
  }
});

function operateCanvas() {
  var xyCoords = [];
  window.localStorage.setItem("xyCoords", JSON.stringify(xyCoords));
  // create canvas element and append it to document body
  // var canvas = document.createElement('canvas');
  var canvas = document.getElementById("draw-pancake");
  // document.body.appendChild(canvas);

  // some hotfixes... ( ≖_≖)
  // document.body.style.margin = 0;
  // canvas.style.position = 'fixed';

  // get canvas 2D context and set him correct size
  var ctx = canvas.getContext("2d");
  // resize();

  // last known position
  var pos = { x: 0, y: 0 };
  var lastMove = Date.now();

  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mousedown", setPosition);
  canvas.addEventListener("mouseenter", setPosition);

  // get x and y position within the canvas
  function getMousePos(canvas, e) {
    var rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // new position from mouse event
  function setPosition(e) {
    pos = getMousePos(canvas, e);
    // pos.x = e.clientX;
    // pos.y = e.clientY;
  }

  function draw(e) {
    if (Date.now() - lastMove > 40) {
      // mouse left button must be pressed
      if (e.buttons !== 1) return;

      ctx.beginPath(); // begin

      ctx.lineWidth = 15;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#c0392b";

      ctx.moveTo(pos.x, pos.y); // from
      setPosition(e);
      ctx.lineTo(pos.x, pos.y); // to

      ctx.stroke(); // draw it!


      lastMove = Date.now();

      var x = (pos.x - 250) / 2;
      var y = (400 - pos.y) / 2;

      xyCoords.push([x, y]);
      console.log('x', x, 'y', y);
      window.localStorage.setItem("xyCoords", JSON.stringify(xyCoords));
    }
  }
}

operateCanvas();

// Window resize event
function resize() {
  var canvas = document.getElementById("draw-pancake");
  var ctx = canvas.getContext("2d");
  // ctx.canvas.width = document.getElementById("column_75").offsetWidth;
  // ctx.canvas.height = window.innerHeight;
}

function basicCommandsClick(index = 0, direction = 0) {
  // 0 = axisMotor, 1 = rMotor, 2 = extrusionMotor
  // direction = 1 (forward) or -1 (backward)

  var code =
    index === 0
      ? `await axisMotor.relative(${2 * direction})`
      : index === 1
      ? `await rMotor.relative(${2 * direction})`
      : `await extrusionMotor.relative(${2 * direction})`;
  console.log(`${index}-${direction}`);
  runCodeStr(code);
}

function simpleShapeClick(shape) {
  // Todo: @Kevin
  console.log(`${shape} to extrude`);
  if (shape === "rectangle") {
    var code = ``;
    runCodeStr(code);
  } else if (shape === "circle") {
    var code = ``;
    runCodeStr(code);
  }
}

function setupBasicCommands() {
  var btnMotor11 = document.getElementById("btn_11");
  var btnMotor12 = document.getElementById("btn_12");
  var btnMotor21 = document.getElementById("btn_21");
  var btnMotor22 = document.getElementById("btn_22");
  var btnMotor31 = document.getElementById("btn_31");
  var btnMotor32 = document.getElementById("btn_32");

  btnMotor11.addEventListener("click", function () {
    basicCommandsClick(1, 1);
  });
  btnMotor12.addEventListener("click", function () {
    basicCommandsClick(1, -1);
  });
  btnMotor21.addEventListener("click", function () {
    basicCommandsClick(2, 1);
  });
  btnMotor22.addEventListener("click", function () {
    basicCommandsClick(2, -1);
  });
  btnMotor31.addEventListener("click", function () {
    basicCommandsClick(3, 1);
  });
  btnMotor32.addEventListener("click", function () {
    basicCommandsClick(3, -1);
  });
}

function setupSimpleShapes() {
  var btnDrawRectangle = document.getElementById("btn_rect");
  var btnDrawCircle = document.getElementById("btn_circle");

  btnDrawRectangle.addEventListener("click", function () {
    simpleShapeClick("rectangle");
  });
  btnDrawCircle.addEventListener("click", function () {
    simpleShapeClick("circle");
  });
}

function initializeCanvas(){
  var canvas = document.getElementById('draw-pancake');
  var ctx = canvas.getContext('2d');

  ctx.beginPath(); // begin

  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#000000';

  ctx.moveTo(240, 400); // from
  ctx.lineTo(260, 400); // to
  ctx.stroke(); // draw it!

  ctx.beginPath(); // begin

  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#000000';

  ctx.moveTo(250, 390); // from
  ctx.lineTo(250, 410); // to
  ctx.stroke(); // draw it!

  ctx.beginPath();
  ctx.arc(250, 250, 150, 0, 2 * Math.PI);
  ctx.stroke();

  console.log('here')
}

function setupCanvasFunctions(){
  var btnCanvasClear = document.getElementById("btn_clear");
  var btnSend = document.getElementById("btn_send");

  btnCanvasClear.addEventListener("click", function () {
    var canvas = document.getElementById("draw-pancake");
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    initializeCanvas();
  });

  btnSend.addEventListener("click", function () {
    runCodeXyCoords(window.localStorage.getItem("xyCoords"));
  });
}

function setupGeneralFunction() {
  var btnReset = document.getElementById("btn_reset");
  btnReset.addEventListener("click", function () {
    // Cancel the current thing;
    var code = `
    async function moveToOrigin() {
      await axisMotor.absolute(AXISORIGIN);
      await rMotor.absolute(RORIGIN);
    };
    moveToOrigin();
    
    `;
    runCodeStr();
  });
}

window.onload = function () {
  window.addEventListener("resize", resize);
  setupBasicCommands();
  setupSimpleShapes();
  setupCanvasFunctions();
  setupGeneralFunction();
  initializeCanvas();
}
