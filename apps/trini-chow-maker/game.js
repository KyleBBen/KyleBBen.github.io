const recipes = {
  mango: { name: 'Mango', goal: 5 },
  lime: { name: 'Lime', goal: 1 },
  herb: { name: 'Chadon beni', goal: 1 },
  pepper: { name: 'Pepper', goal: 1 },
};

const ingredientLayout = [
  ['mango', 12, 26], ['mango', 31, 36], ['mango', 50, 24],
  ['mango', 69, 36], ['mango', 88, 26], ['lime', 14, 55],
  ['herb', 36, 53], ['pepper', 65, 53], ['pepper', 87, 55],
];

const ids = ['camera', 'camera-label', 'restart', 'mode', 'stage', 'video', 'instruction',
  'ingredients', 'bowl', 'contents', 'drop-label', 'cursor', 'result', 'verdict',
  'result-copy', 'again', 'control-help', 'recipe-list', 'recipe-note', 'mix',
  'mix-count', 'serve'];
const ui = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
const totals = {};
let selected;
let drag;
let shakes;
let served;
let tracker;
let trackerPromise;
let stream;
let cameraGeneration = 0;
let videoFrame;
let lastVideoTime = -1;
let handClosed = false;
let handPoint;
let swing;

function foodImage(type, tilt = -8) {
  const image = document.createElement('span');
  image.className = 'food ' + type;
  image.style.setProperty('--tilt', tilt + 'deg');
  image.setAttribute('aria-hidden', 'true');
  return image;
}

const rows = Object.fromEntries(Object.entries(recipes).map(([type, recipe]) => {
  const row = document.createElement('li');
  const label = document.createElement('span');
  const count = document.createElement('span');
  label.textContent = recipe.name;
  row.append(foodImage(type), label, count);
  ui['recipe-list'].append(row);
  return [type, count];
}));

function complete() {
  return Object.keys(recipes).every(type => totals[type] >= recipes[type].goal);
}

function message(text) {
  ui.instruction.textContent = text;
}

function update() {
  for (const [type, count] of Object.entries(rows)) {
    const goal = recipes[type].goal;
    count.textContent = totals[type] + ' / ' + goal;
    count.className = 'recipe-total' + (totals[type] > goal ? ' extra' : totals[type] === goal ? ' done' : '');
  }
  const ready = complete();
  ui.mix.disabled = !ready;
  ui.mix.hidden = shakes === 3;
  ui.serve.hidden = shakes < 3;
  ui['mix-count'].textContent = shakes + ' / 3';
  ui['recipe-note'].textContent = totals.pepper > 1 ? 'That’s heavy pepper now!' :
    ready ? 'The bowl is ready to mix.' : 'One pepper is plenty for this order.';
  ui.bowl.classList.toggle('ready', Boolean(selected) || ready);
  ui['drop-label'].hidden = ui.contents.childElementCount > 0 && !selected;
  ui.bowl.setAttribute('aria-label', selected ? 'Drop selected ingredient in bowl' :
    shakes === 3 ? 'Serve chow' : ready ? 'Shake bowl' : 'Mixing bowl');
}

function select(token) {
  if (selected) {
    selected.classList.remove('chosen', 'held');
    selected.style.left = selected.dataset.x + '%';
    selected.style.top = selected.dataset.y + '%';
    selected.setAttribute('aria-pressed', 'false');
  }
  selected = token;
  if (selected) {
    selected.classList.add('chosen');
    selected.setAttribute('aria-pressed', 'true');
  }
  update();
}

function reset() {
  select(null);
  drag = null;
  shakes = 0;
  served = false;
  swing = null;
  for (const type of Object.keys(recipes)) totals[type] = 0;
  ui.contents.replaceChildren();
  ui.result.hidden = true;
  ui.bowl.classList.remove('shake');
  ui.ingredients.replaceChildren();
  ingredientLayout.forEach(([type, x, y], index) => {
    const token = document.createElement('button');
    const label = document.createElement('span');
    token.type = 'button';
    token.className = 'ingredient';
    token.dataset.type = type;
    token.dataset.x = x;
    token.dataset.y = y;
    token.style.left = x + '%';
    token.style.top = y + '%';
    token.setAttribute('aria-pressed', 'false');
    label.className = 'food-label';
    label.textContent = recipes[type].name;
    token.append(foodImage(type, index * 12 - 27), label);
    token.addEventListener('click', event => {
      if (event.detail === 0 && !served) {
        select(token === selected ? null : token);
        message(selected ? 'Choose the bowl to drop it.' : 'Choose an ingredient.');
      }
    });
    ui.ingredients.append(token);
  });
  message(stream ? 'Pinch a mango and release over the bowl.' : 'Drag mango into the bowl.');
  update();
}

function drop() {
  if (!selected || served) return;
  const token = selected;
  const type = token.dataset.type;
  const index = ui.contents.childElementCount;
  select(null);
  token.remove();
  totals[type]++;
  shakes = 0;
  swing = null;
  const garnish = foodImage(type, (index * 31) % 80 - 40);
  garnish.style.left = 25 + (index * 37) % 45 + '%';
  garnish.style.top = 29 + (index * 17) % 37 + '%';
  ui.contents.append(garnish);
  message(totals.pepper > 1 ? 'Heavy pepper! ' + (complete() ? 'Time to shake.' : 'Finish seasoning.') :
    complete() ? 'Shake the bowl three times.' : recipes[type].name + ' in. Keep going!');
  update();
}

function shake() {
  if (served || selected || !complete() || shakes === 3) return;
  shakes++;
  ui.bowl.classList.remove('shake');
  void ui.bowl.offsetWidth;
  ui.bowl.classList.add('shake');
  message(shakes === 3 ? 'All mixed. Serve your chow!' : 'Keep shaking! ' + shakes + ' / 3');
  update();
}

function serve() {
  if (served || shakes !== 3) return;
  served = true;
  select(null);
  ui.verdict.textContent = totals.pepper > 1 ? 'That’s heavy!' : 'Chow ready!';
  ui['result-copy'].textContent = totals.pepper > 1 ?
    'Tasty, but somebody asked for slight pepper.' : 'Tangy mango, fresh chadon beni, and just enough pepper.';
  ui.result.hidden = false;
  ui.verdict.focus({ preventScroll: true });
}

function bowlAction() {
  if (selected) drop();
  else if (shakes === 3) serve();
  else shake();
}

function inBowl(x, y) {
  const rect = ui.bowl.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function position(node, x, y) {
  const rect = ui.stage.getBoundingClientRect();
  node.style.left = (x - rect.left) + 'px';
  node.style.top = (y - rect.top) + 'px';
}

ui.stage.addEventListener('pointerdown', event => {
  const token = event.target.closest('.ingredient');
  if (!token || served || drag || event.button !== 0) return;
  event.preventDefault();
  select(token);
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
  ui.stage.setPointerCapture(event.pointerId);
});
ui.stage.addEventListener('pointermove', event => {
  if (drag?.id !== event.pointerId || !selected) return;
  if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 8) drag.moved = true;
  if (!drag.moved) return;
  selected.classList.add('held');
  position(selected, event.clientX, event.clientY);
});
ui.stage.addEventListener('pointerup', event => {
  if (drag?.id !== event.pointerId) return;
  const { moved } = drag;
  drag = null;
  if (moved && inBowl(event.clientX, event.clientY)) drop();
  else if (moved) {
    select(null);
    message('Try dropping the ingredient over the bowl.');
  } else message('Tap the bowl to drop it.');
});
function cancelDrag(event) {
  if (drag?.id !== event.pointerId) return;
  drag = null;
  select(null);
}
ui.stage.addEventListener('pointercancel', cancelDrag);
ui.stage.addEventListener('lostpointercapture', cancelDrag);

function loadTracker() {
  if (!trackerPromise) {
    const root = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21';
    const modelAssetPath = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
    trackerPromise = import(root + '/vision_bundle.mjs').then(async module => {
      const vision = await module.FilesetResolver.forVisionTasks(root + '/wasm');
      return module.HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath },
        runningMode: 'VIDEO',
        numHands: 1,
      });
    }).catch(error => {
      trackerPromise = null;
      throw error;
    });
  }
  return trackerPromise;
}

function stopCamera(help = 'Drag ingredients or tap one, then tap the bowl.') {
  cameraGeneration++;
  cancelAnimationFrame(videoFrame);
  stream?.getTracks().forEach(track => track.stop());
  stream = null;
  ui.video.srcObject = null;
  ui.video.hidden = true;
  ui.stage.classList.remove('camera-on');
  ui.cursor.hidden = true;
  ui.camera.setAttribute('aria-pressed', 'false');
  ui['camera-label'].textContent = 'Use camera';
  ui.mode.textContent = 'TOUCH / MOUSE';
  ui['control-help'].textContent = help;
  if (selected?.classList.contains('held') && !drag) select(null);
  lastVideoTime = -1;
  handClosed = false;
  handPoint = null;
  swing = null;
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    ui['control-help'].textContent = 'Camera unavailable here. Use touch or mouse to play.';
    return;
  }
  const attempt = ++cameraGeneration;
  ui.camera.setAttribute('aria-pressed', 'true');
  ui['camera-label'].textContent = 'Cancel camera';
  ui['control-help'].textContent = 'Allow camera access to enable pinch controls.';
  try {
    const feed = await navigator.mediaDevices.getUserMedia({ audio: false, video: {
      facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 },
    } });
    if (attempt !== cameraGeneration) {
      feed.getTracks().forEach(track => track.stop());
      return;
    }
    stream = feed;
    ui.video.srcObject = feed;
    await ui.video.play();
    if (attempt !== cameraGeneration) return;
    ui['control-help'].textContent = 'Loading hand tracking…';
    tracker = await loadTracker();
    if (attempt !== cameraGeneration) return;
    ui.video.hidden = false;
    ui.stage.classList.add('camera-on');
    ui['camera-label'].textContent = 'Camera off';
    ui.mode.textContent = 'HAND TRACKING';
    ui['control-help'].textContent = 'Pinch to grab, open over the bowl to drop. Swipe back and forth over the bowl to shake.';
    if (!complete()) message('Pinch an ingredient and release over the bowl.');
    videoFrame = requestAnimationFrame(trackHand);
  } catch {
    if (attempt === cameraGeneration) {
      stopCamera('Camera or hand tracking unavailable. Use touch or mouse to play.');
    }
  }
}

function toStage(landmark, rect) {
  const scale = Math.max(rect.width / ui.video.videoWidth, rect.height / ui.video.videoHeight);
  const width = ui.video.videoWidth * scale;
  const height = ui.video.videoHeight * scale;
  return {
    x: rect.left + (rect.width - width) / 2 + (1 - landmark.x) * width,
    y: rect.top + (rect.height - height) / 2 + landmark.y * height,
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function tokenAt(x, y) {
  return [...ui.ingredients.children].find(token => {
    const rect = token.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  });
}

function trackShake(x, y, now) {
  if (!complete() || shakes === 3 || !inBowl(x, y)) {
    swing = null;
    return;
  }
  if (!swing || now - swing.time > 450) {
    swing = { x, time: now, direction: 0 };
    return;
  }
  const change = x - swing.x;
  if (Math.abs(change) < 36) return;
  const direction = Math.sign(change);
  if (swing.direction && direction !== swing.direction) shake();
  swing = { x, time: now, direction };
}

function trackHand(now) {
  if (!stream) return;
  videoFrame = requestAnimationFrame(trackHand);
  if (ui.video.readyState < 2 || ui.video.currentTime === lastVideoTime) return;
  lastVideoTime = ui.video.currentTime;
  let landmarks;
  try {
    landmarks = tracker.detectForVideo(ui.video, now).landmarks[0];
  } catch {
    stopCamera('Hand tracking stopped. Use touch or mouse to keep playing.');
    return;
  }
  if (!landmarks) {
    ui.cursor.hidden = true;
    if (selected?.classList.contains('held') && !drag) select(null);
    handClosed = false;
    handPoint = null;
    swing = null;
    return;
  }
  const rect = ui.stage.getBoundingClientRect();
  const thumb = toStage(landmarks[4], rect);
  const index = toStage(landmarks[8], rect);
  const palm = distance(toStage(landmarks[0], rect), toStage(landmarks[9], rect));
  const pinchRatio = distance(thumb, index) / Math.max(palm, 1);
  const closed = pinchRatio < (handClosed ? .42 : .27);
  const middle = { x: (thumb.x + index.x) / 2, y: (thumb.y + index.y) / 2 };
  handPoint = handPoint ? {
    x: handPoint.x * .32 + middle.x * .68,
    y: handPoint.y * .32 + middle.y * .68,
  } : middle;
  const { x, y } = handPoint;
  ui.cursor.hidden = served;
  ui.cursor.classList.toggle('closed', closed);
  position(ui.cursor, x, y);
  if (!drag && !served) {
    if (closed && !handClosed) {
      swing = null;
      const token = tokenAt(x, y);
      if (token) {
        select(token);
        selected.classList.add('held');
      } else if (shakes === 3 && inBowl(x, y)) serve();
    }
    if (closed && selected?.classList.contains('held')) position(selected, x, y);
    if (!closed && handClosed && selected?.classList.contains('held')) {
      if (inBowl(x, y)) drop();
      else select(null);
    }
    if (!closed && !selected) trackShake(x, y, now);
  }
  handClosed = closed;
}

ui.bowl.addEventListener('click', bowlAction);
ui.mix.addEventListener('click', shake);
ui.serve.addEventListener('click', serve);
ui.restart.addEventListener('click', reset);
ui.again.addEventListener('click', () => {
  reset();
  ui.ingredients.firstElementChild.focus({ preventScroll: true });
});
ui.camera.addEventListener('click', () => {
  if (ui.camera.getAttribute('aria-pressed') === 'true') stopCamera();
  else startCamera();
});
window.addEventListener('pagehide', () => stopCamera());
reset();
