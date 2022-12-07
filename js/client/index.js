import { rescan } from './modularThingClient.js';
import { global_state } from './global_state.js';
import createSynchronizer from '../virtualThings/synchronizer';
import Terminal from 'xterm';
import { render, html } from 'lit-html';

import './codemirror.js';

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

    <div class=${['view-window', state.viewWindow ? '' : 'hide'].join(' ')}>
      <canvas
        id="draw-pancake"
        width="200"
        height="200"
        style="border:1px solid #000000;"
      >
      </canvas>
      <button id="send-code" class="button">Click to step axisMotor</button>
    </div>
  </div>
  ${state.renaming !== '' ? renameForm(state) : ''}
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
          ${entry.name}(${entry.args.map((x) => x.split(':')[0]).join(', ')})
        </div>
        ${entry.args.map(
          (x, i) => html`<div style="padding-left: 10px;">${x}</div>`
        )}
        ${entry.return
          ? html`<div class="apiEntry-return">
              <b>returns:</b> ${entry.return}
            </div>`
          : ''}
      </div>
    `
  );
};

const getApi = (thing) => {
  const api = Object.keys(thing).map((x) => [x, getParamNames(thing[x])]);
  // don't include "setup" or "setName" or "vt"
  return api
    .filter((x) => !['setup', 'setName', 'vt', 'firmwareName'].includes(x[0]))
    .map(apiEntry);
};

const apiEntry = ([name, params]) => html`
  <div class="apiEntry">${name}(${params.join(', ')})</div>
`;

var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
var ARGUMENT_NAMES = /([^\s,]+)/g;
function getParamNames(func) {
  var fnStr = func.toString().replace(STRIP_COMMENTS, '');
  var result = fnStr
    .slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')'))
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
        const newName = document.querySelector('.rename-form-input').value;
        thing.vThing.setName(newName);
        delete state.things[state.renaming];
        state.things[newName] = thing;
        state.renaming = '';
      }}
    >
      rename
    </button>
    <button class="button" @click=${() => (state.renaming = '')}>close</button>
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
  const cache = localStorage.getItem('cache');
  if (cache) {
    const cm = document.querySelector('codemirror-editor');
    cm.view.dispatch({
      changes: { from: 0, insert: cache ?? '' },
    });
  }
}

init();

function getCode() {
  const cm = document.querySelector('codemirror-editor');
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
    const viewWindow = document.querySelector('.view-window');
    viewWindow.innerHTML = '';
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
    `await axisMotor.setCScale(0.5);
    await axisMotor.setSPU(1);
    await axisMotor.relative(200);
    `
  );
}

window.addEventListener('keydown', (e) => {
  const code = getCode();

  window.localStorage.setItem('cache', code);

  if (e.keyCode === 13 && e.shiftKey) {
    console.log('shift + enter');
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
  window.localStorage.setItem('xyCoords', JSON.stringify(xyCoords));
  // create canvas element and append it to document body
  // var canvas = document.createElement('canvas');
  var canvas = document.getElementById('draw-pancake');
  // document.body.appendChild(canvas);

  // some hotfixes... ( ≖_≖)
  // document.body.style.margin = 0;
  // canvas.style.position = 'fixed';

  // get canvas 2D context and set him correct size
  var ctx = canvas.getContext('2d');
  // resize();

  // last known position
  var pos = { x: 0, y: 0 };
  var lastMove = Date.now();

  window.addEventListener('resize', resize);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mousedown', setPosition);
  canvas.addEventListener('mouseenter', setPosition);

  var sendCodeButton = document.getElementById('send-code');
  sendCodeButton.addEventListener('click', sendCode);

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

  // resize canvas
  function resize() {
    ctx.canvas.width = window.innerWidth;
    // ctx.canvas.height = window.innerHeight;
    ctx.canvas.height = 200;
  }

  function draw(e) {
    if (Date.now() - lastMove > 40) {
      // mouse left button must be pressed
      if (e.buttons !== 1) return;

      ctx.beginPath(); // begin

      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#c0392b';

      ctx.moveTo(pos.x, pos.y); // from
      setPosition(e);
      ctx.lineTo(pos.x, pos.y); // to

      ctx.stroke(); // draw it!
      console.log('x', pos.x, 'y', pos.y);

      lastMove = Date.now();

      xyCoords.push([pos.x, pos.y]);
      window.localStorage.setItem('xyCoords', JSON.stringify(xyCoords));
    }
  }

  function sendCode() {
    console.log('WINDOW', window.localStorage.getItem('xyCoords'));
    runCodeXyCoords(window.localStorage.getItem('xyCoords'));
  }
}

operateCanvas();
