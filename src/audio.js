// Audio capture module — iOS-compatible via AudioContext + ScriptProcessorNode
// Deliberately avoids MediaRecorder (fails on iOS Safari with WebM codec)

const SAMPLE_RATE = 44100;
const RECORD_MS = 5000;

export async function startCapture(onAnalyserReady) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { sampleRate: SAMPLE_RATE, channelCount: 1, echoCancellation: false }
  });

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaStreamSource(stream);

  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 64;
  source.connect(analyser);

  // ScriptProcessorNode is deprecated but still the only reliable PCM tap on iOS Safari
  const processor = audioCtx.createScriptProcessor(4096, 1, 1);
  source.connect(processor);
  processor.connect(audioCtx.destination);

  const samples = [];
  processor.onaudioprocess = (e) => {
    const data = e.inputBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) samples.push(data[i]);
  };

  onAnalyserReady(analyser);

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        processor.disconnect();
        source.disconnect();
        stream.getTracks().forEach(t => t.stop());
        audioCtx.close();

        const wav = encodeWAV(new Float32Array(samples), audioCtx.sampleRate);
        const base64 = arrayBufferToBase64(wav);
        resolve(base64);
      } catch (err) {
        reject(err);
      }
    }, RECORD_MS);
  });
}

function encodeWAV(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);        // PCM
  view.setUint16(22, 1, true);        // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);       // 16-bit
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  floatTo16BitPCM(view, 44, samples);

  return buffer;
}

function floatTo16BitPCM(view, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// Chunked to avoid stack overflow on large buffers
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
