class PCMRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.chunk = new Float32Array(2048);
    this.count = 0;
    this.port.onmessage = () => {
      if (this.count) this.send(this.chunk.slice(0, this.count));
      this.port.postMessage(null);
    };
  }
  send(samples) {
    this.port.postMessage(samples, [samples.buffer]);
  }
  process(inputs) {
    const input = inputs[0][0];
    if (!input) return true;
    for (const value of input) {
      this.chunk[this.count++] = value;
      if (this.count === this.chunk.length) {
        this.send(this.chunk);
        this.chunk = new Float32Array(2048);
        this.count = 0;
      }
    }
    return true;
  }
}
registerProcessor('pcm-recorder', PCMRecorder);
