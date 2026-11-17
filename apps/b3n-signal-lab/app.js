'use strict';
const get = id => document.getElementById(id);
const wave = get('wave');
const ctx = wave.getContext('2d');
const rate = get('rate');
const bits = get('bits');
const record = get('record');
const file = get('file');
const demo = get('demo');
const play = get('play');
const status = get('status');
const zoom = get('zoom');
const position = get('position');
let source;
let pcm;
let url;
let recording;
let conversion = 0;

function quantize(samples, depth) {
  const scale = 2 ** (depth - 1);
  return Int16Array.from(samples, value => Math.max(-scale, Math.min(scale - 1, Math.round(value * scale))));
}

function makeWav(samples, hz, depth) {
  const bytes = depth / 8;
  const view = new DataView(new ArrayBuffer(44 + samples.length * bytes + (samples.length * bytes % 2)));
  const ascii = (offset, value) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  ascii(0, 'RIFF');
  view.setUint32(4, view.byteLength - 8, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, hz, true);
  view.setUint32(28, hz * bytes, true);
  view.setUint16(32, bytes, true);
  view.setUint16(34, depth, true);
  ascii(36, 'data');
  view.setUint32(40, samples.length * bytes, true);
  samples.forEach((value, index) => depth === 8
    ? view.setUint8(44 + index, value + 128)
    : view.setInt16(44 + index * 2, value, true));
  return new Blob([view], { type: 'audio/wav' });
}

async function convert() {
  const ticket = ++conversion;
  const hz = Number(rate.value);
  const depth = Number(bits.value);
  const input = source;
  let samples = input.samples;
  if (input.hz !== hz) {
    const offline = new OfflineAudioContext(1, Math.max(1, Math.round(samples.length * hz / input.hz)), hz);
    const buffer = offline.createBuffer(1, samples.length, input.hz);
    buffer.copyToChannel(samples, 0);
    const node = offline.createBufferSource();
    node.buffer = buffer;
    node.connect(offline.destination);
    node.start();
    samples = (await offline.startRendering()).getChannelData(0);
  }
  if (ticket !== conversion) return;
  const data = quantize(samples, depth);
  const wav = makeWav(data, hz, depth);
  pcm = { data, wav, hz, depth };
  if (url) URL.revokeObjectURL(url);
  url = URL.createObjectURL(wav);
  play.src = url;
  get('source').textContent = input.label;
  get('format').textContent = (hz / 1000) + ' kHz  /  ' + depth + '-BIT PCM';
  get('summary').textContent = data.length.toLocaleString() + ' samples · ' + (data.length / hz).toFixed(2) + ' s · mono';
  draw();
}

function draw() {
  if (!pcm) return;
  const { data, hz, depth } = pcm;
  const detail = zoom.value === 'samples';
  const count = detail ? Math.min(160, data.length) : data.length;
  const start = detail ? Math.round(Number(position.value) * (data.length - count) / 1000) : 0;
  position.hidden = !detail;
  document.querySelector('.position-label').hidden = !detail;
  const w = wave.clientWidth;
  const h = wave.clientHeight;
  const ratio = window.devicePixelRatio || 1;
  wave.width = w * ratio;
  wave.height = h * ratio;
  ctx.scale(ratio, ratio);
  const y = value => h / 2 - value * (h / 2 - 8) / 2 ** (depth - 1);
  ctx.beginPath();
  for (let i = 0; i <= 8; i++) {
    ctx.moveTo(w * i / 8, 0); ctx.lineTo(w * i / 8, h);
  }
  for (let i = 0; i <= 4; i++) {
    ctx.moveTo(0, h * i / 4); ctx.lineTo(w, h * i / 4);
  }
  ctx.strokeStyle = '#2a3845';
  ctx.stroke();
  ctx.strokeStyle = '#77f4cb';
  ctx.fillStyle = '#77f4cb';
  ctx.beginPath();
  if (detail) {
    for (let i = 0; i < count; i++) {
      const x = 3 + (w - 6) * i / Math.max(1, count - 1);
      const height = y(data[start + i]);
      ctx.moveTo(x, h / 2); ctx.lineTo(x, height);
      ctx.fillRect(x - 1, height - 1, 2, 2);
    }
  } else {
    for (let x = 0; x < w; x++) {
      const first = Math.floor(x * count / w);
      const end = Math.max(first + 1, Math.floor((x + 1) * count / w));
      let low = data[first], high = low;
      for (let i = first + 1; i < end; i++) {
        low = Math.min(low, data[i]); high = Math.max(high, data[i]);
      }
      ctx.moveTo(x, y(high)); ctx.lineTo(x, y(low) + 1);
    }
  }
  ctx.stroke();
  const ms = index => (index * 1000 / hz).toFixed(detail ? 2 : 0) + ' ms';
  get('left').textContent = ms(start);
  get('right').textContent = ms(start + count);
  get('table-title').textContent = detail ? 'First samples in this view' : 'First samples in the clip';
  const rows = [];
  for (let i = start; i < Math.min(start + 6, data.length); i++) {
    const row = document.createElement('tr');
    const stored = depth === 8 ? data[i] + 128 : data[i] & 65535;
    for (const value of [i, (i * 1000 / hz).toFixed(3), depth === 8 ? stored : data[i], stored.toString(2).padStart(depth, '0')]) {
      row.insertCell().textContent = value;
    }
    rows.push(row);
  }
  get('samples').replaceChildren(...rows);
}

function showError(error) {
  status.textContent = error.message || 'Audio conversion failed.';
}

function useDemo() {
  const hz = 44100;
  const samples = Float32Array.from({ length: hz * 2 }, (_, i) => {
    const t = i / hz;
    return 0.65 * Math.sin(2 * Math.PI * 220 * t) * Math.exp(-1.7 * t) * Math.min(1, t * 150);
  });
  source = { samples, hz, label: 'Demo tone · 220 Hz' };
  position.value = 0;
  status.textContent = 'Demo tone loaded. Record up to 15 seconds or upload a clip up to 30 seconds.';
  return convert();
}

function lockInput(locked) {
  record.disabled = locked;
  file.disabled = locked;
  demo.disabled = locked;
}

file.addEventListener('change', async () => {
  const selected = file.files[0];
  if (!selected) return;
  lockInput(true);
  try {
    if (selected.size > 25 * 1024 * 1024) throw new Error('Choose a file under 25 MB.');
    status.textContent = 'Decoding audio…';
    const offline = new OfflineAudioContext(1, 1, 48000);
    const audio = await offline.decodeAudioData(await selected.arrayBuffer());
    if (audio.duration > 30) throw new Error('Choose a clip up to 30 seconds.');
    const samples = new Float32Array(audio.length);
    for (let channel = 0; channel < audio.numberOfChannels; channel++) {
      const values = audio.getChannelData(channel);
      for (let i = 0; i < values.length; i++) samples[i] += values[i] / audio.numberOfChannels;
    }
    source = { samples, hz: audio.sampleRate, label: selected.name };
    position.value = 0;
    await convert();
    status.textContent = 'Audio loaded.';
  } catch (error) { showError(error); }
  finally { file.value = ''; lockInput(false); }
});

async function stopRecording() {
  const active = recording;
  if (!active) return;
  recording = null;
  lockInput(true);
  clearTimeout(active.timer);
  record.textContent = '●  Record microphone';
  let timeout;
  try {
    await new Promise(resolve => {
      active.done = resolve;
      timeout = setTimeout(resolve, 500);
      active.node.port.postMessage('flush');
    });
    const length = Math.min(active.hz * 15, active.chunks.reduce((sum, chunk) => sum + chunk.length, 0));
    if (!length) throw new Error('No microphone samples were captured. Try recording again.');
    const samples = new Float32Array(length);
    let offset = 0;
    for (const chunk of active.chunks) {
      const part = chunk.subarray(0, length - offset);
      samples.set(part, offset);
      offset += part.length;
      if (offset === length) break;
    }
    source = { samples, hz: active.hz, label: 'Microphone recording' };
    position.value = 0;
    await convert();
    status.textContent = 'Recording converted to PCM.';
  } catch (error) { showError(error); }
  finally {
    clearTimeout(timeout);
    active.stream.getTracks().forEach(track => track.stop());
    active.context.close().catch(() => {});
    lockInput(false);
  }
}

record.addEventListener('click', async () => {
  if (recording) return stopRecording();
  if (!navigator.mediaDevices?.getUserMedia) {
    status.textContent = 'Microphone access needs a supported browser and a secure page. Try Upload audio.';
    return;
  }
  lockInput(true);
  let context, stream;
  try {
    play.pause();
    context = new AudioContext();
    await context.resume();
    if (!context.audioWorklet) throw new Error('This browser does not support microphone recording here. Try Upload audio.');
    await context.audioWorklet.addModule('capture.js');
    status.textContent = 'Waiting for microphone permission…';
    stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const node = new AudioWorkletNode(context, 'pcm-recorder');
    const input = context.createMediaStreamSource(stream);
    const silent = context.createGain();
    silent.gain.value = 0;
    input.connect(node).connect(silent).connect(context.destination);
    const active = { node, context, stream, hz: context.sampleRate, chunks: [] };
    node.port.onmessage = ({ data }) => data ? active.chunks.push(data) : active.done?.();
    recording = active;
    active.timer = setTimeout(stopRecording, 15000);
    record.disabled = false;
    record.textContent = '■  Stop recording';
    status.textContent = 'Recording. Stops automatically after 15 seconds.';
  } catch (error) {
    stream?.getTracks().forEach(track => track.stop());
    context?.close().catch(() => {});
    if (error.name === 'NotAllowedError') status.textContent = 'Microphone permission was denied. You can still upload audio.';
    else showError(error);
    lockInput(false);
  }
});

function download(blob, name) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
}

get('wav').addEventListener('click', () => { if (pcm) download(pcm.wav, 'signal-lab.wav'); });
get('csv').addEventListener('click', () => {
  if (!pcm) return;
  const { data, hz, depth } = pcm;
  const rows = ['sample,time_seconds,pcm_value\n'];
  for (let start = 0; start < data.length; start += 8192) {
    const block = [];
    for (let i = start; i < Math.min(start + 8192, data.length); i++) {
      block.push(i + ',' + (i / hz).toFixed(9) + ',' + (depth === 8 ? data[i] + 128 : data[i]) + '\n');
    }
    rows.push(block.join(''));
  }
  download(new Blob(rows, { type: 'text/csv' }), 'signal-lab.csv');
});
for (const field of [rate, bits]) field.addEventListener('change', () => convert().catch(showError));
zoom.addEventListener('change', draw);
position.addEventListener('input', draw);
demo.addEventListener('click', () => useDemo().catch(showError));
new ResizeObserver(draw).observe(wave);
useDemo().catch(showError);
