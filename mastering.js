// Parâmetros Estáticos do Modo Presets
const presetParams = {
  balanced: { lowShelf: 1.0, midPeak: -0.5, highShelf: 1.5, saturation: 0.1, sideGain: 1.2, compThreshold: -16, compRatio: 1.5, compAttack: 0.03, compRelease: 0.15, gainBoost: 4.0 },
  warm: { lowShelf: 3.0, midPeak: 1.0, highShelf: -1.0, saturation: 0.4, sideGain: 0.5, compThreshold: -18, compRatio: 2.0, compAttack: 0.05, compRelease: 0.2, gainBoost: 3.0 },
  bright: { lowShelf: -0.5, midPeak: 0.5, highShelf: 4.0, saturation: 0.15, sideGain: 2.5, compThreshold: -14, compRatio: 1.5, compAttack: 0.02, compRelease: 0.1, gainBoost: 4.0 },
  punchy: { lowShelf: 2.0, midPeak: -1.5, highShelf: 2.0, saturation: 0.25, sideGain: 1.2, compThreshold: -20, compRatio: 3.0, compAttack: 0.08, compRelease: 0.1, gainBoost: 5.0 },
  bass: { lowShelf: 5.0, midPeak: -1.0, highShelf: 1.0, saturation: 0.3, sideGain: 1.0, compThreshold: -18, compRatio: 2.5, compAttack: 0.04, compRelease: 0.12, gainBoost: 4.5 }
};

const eqFrequencies = [60, 150, 400, 1100, 3000, 7000, 14000];
let audioCtx = null;
let currentTab = 'presets';

const menuBtnPresets = document.getElementById("menu-btn-presets");
const menuBtnReference = document.getElementById("menu-btn-reference");
const wsPresets = document.getElementById("workspace-presets");
const wsReference = document.getElementById("workspace-reference");

const loaderModal = document.getElementById("loader-modal");
const loaderTitle = document.getElementById("loader-title");
const loaderText = document.getElementById("loader-text");

const privacyModal = document.getElementById("privacy-modal");
const btnPrivacy = document.getElementById("btn-privacy");
const btnClosePrivacy = document.getElementById("btn-close-privacy");
const btnAgreePrivacy = document.getElementById("btn-agree-privacy");

btnPrivacy.addEventListener("click", () => {
  privacyModal.classList.remove("opacity-0", "pointer-events-none");
});

const closePrivacyModal = () => {
  privacyModal.classList.add("opacity-0", "pointer-events-none");
};

btnClosePrivacy.addEventListener("click", closePrivacyModal);
btnAgreePrivacy.addEventListener("click", closePrivacyModal);

menuBtnPresets.addEventListener("click", () => switchTab('presets'));
menuBtnReference.addEventListener("click", () => switchTab('reference'));

function switchTab(tab) {
  if (currentTab === tab) return;
  currentTab = tab;
  pPause();
  rPause();

  if (tab === 'presets') {
    menuBtnPresets.className = "px-4 py-2 rounded-lg text-xs font-bold transition-all bg-brand-accent text-white shadow-md focus:outline-none";
    menuBtnReference.className = "px-4 py-2 rounded-lg text-xs font-bold transition-all text-gray-400 hover:text-white focus:outline-none";
    wsPresets.classList.remove("hidden");
    wsReference.classList.add("hidden");
  } else {
    menuBtnReference.className = "px-4 py-2 rounded-lg text-xs font-bold transition-all bg-brand-accent text-white shadow-md focus:outline-none";
    menuBtnPresets.className = "px-4 py-2 rounded-lg text-xs font-bold transition-all text-gray-400 hover:text-white focus:outline-none";
    wsReference.classList.remove("hidden");
    wsPresets.classList.add("hidden");
  }
}

function showLoader(title, text) {
  loaderTitle.textContent = title;
  loaderText.textContent = text;
  loaderModal.classList.remove("opacity-0", "pointer-events-none");
}

function hideLoader() {
  loaderModal.classList.add("opacity-0", "pointer-events-none");
}

// --- PRESETS AUDIO LOGIC ---
let pTargetBuffer = null;
let pSourceNode = null;
let pStartTime = 0;
let pPauseTime = 0;
let pIsPlaying = false;
let pCurrentPreset = 'balanced';
let pCurrentMode = 'A';
let pTargetFileName = "";

let pBypassGainNode = null, pMasteringGainNode = null, pInputGainNode = null;
let pHpFilterNode = null, pLowShelfNode = null, pMidFilterNode = null, pHighShelfNode = null, pLpFilterNode = null;
let pMidGainNode = null, pLeftSideNode = null, pRightSideNode = null, pSideSumNode = null, pSideHpNode = null, pSideGainNode = null;
let pSaturatorNode = null, pLeftMergeNode = null, pRightMergeMidNode = null, pRightMergeSideNode = null, pRightMergeNode = null, pChannelMergerNode = null;
let pCompressorNode = null, pLimiterNode = null;

const pFileInput = document.getElementById("p-file-input");
const pDropzone = document.getElementById("p-dropzone");
pDropzone.addEventListener("click", () => pFileInput.click());
pDropzone.addEventListener("dragover", (e) => { e.preventDefault(); pDropzone.classList.add("border-brand-accent"); });
pDropzone.addEventListener("dragleave", () => pDropzone.classList.remove("border-brand-accent"));
pDropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  pDropzone.classList.remove("border-brand-accent");
  if (e.dataTransfer.files.length > 0) pLoadFile(e.dataTransfer.files[0]);
});
pFileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) pLoadFile(e.target.files[0]);
});

async function pLoadFile(file) {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  pTargetFileName = file.name.split('.').slice(0, -1).join('.');
  showLoader("Carregando", "Processando arquivo de áudio para presets...");
  try {
    const arrayBuffer = await file.arrayBuffer();
    pTargetBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    pDropzone.classList.add("hidden");
    document.getElementById("p-player-container").classList.remove("hidden");
    document.getElementById("p-btn-download").disabled = false;
    document.getElementById("p-track-name").textContent = file.name;
    
    pBuildAudioGraph();
    pDrawWaveform();
    pUpdatePlaybackTime(0);
  } catch (err) {
    console.error(err);
    alert("Erro ao ler o áudio para Presets.");
  } finally {
    hideLoader();
  }
}

function pBuildAudioGraph() {
  pBypassGainNode = audioCtx.createGain();
  pMasteringGainNode = audioCtx.createGain();
  pInputGainNode = audioCtx.createGain();

  pHpFilterNode = audioCtx.createBiquadFilter();
  pHpFilterNode.type = "highpass";
  pHpFilterNode.frequency.value = 30;

  pLowShelfNode = audioCtx.createBiquadFilter();
  pLowShelfNode.type = "lowshelf";
  pLowShelfNode.frequency.value = 80;

  pMidFilterNode = audioCtx.createBiquadFilter();
  pMidFilterNode.type = "peaking";
  pMidFilterNode.frequency.value = 1000;
  pMidFilterNode.Q.value = 1.0;

  pHighShelfNode = audioCtx.createBiquadFilter();
  pHighShelfNode.type = "highshelf";
  pHighShelfNode.frequency.value = 12000;

  pLpFilterNode = audioCtx.createBiquadFilter();
  pLpFilterNode.type = "lowpass";
  pLpFilterNode.frequency.value = 20000;

  const splitter = audioCtx.createChannelSplitter(2);
  pMidGainNode = audioCtx.createGain();
  pMidGainNode.gain.value = 0.5;

  pLeftSideNode = audioCtx.createGain();
  pLeftSideNode.gain.value = 0.5;
  pRightSideNode = audioCtx.createGain();
  pRightSideNode.gain.value = -0.5;
  pSideSumNode = audioCtx.createGain();

  pSideHpNode = audioCtx.createBiquadFilter();
  pSideHpNode.type = "highpass";
  pSideHpNode.frequency.value = 120;
  pSideGainNode = audioCtx.createGain();

  pSaturatorNode = audioCtx.createWaveShaper();
  pSaturatorNode.oversample = "4x";

  pLeftMergeNode = audioCtx.createGain();
  pRightMergeMidNode = audioCtx.createGain();
  pRightMergeSideNode = audioCtx.createGain();
  pRightMergeSideNode.gain.value = -1.0;
  pRightMergeNode = audioCtx.createGain();
  pChannelMergerNode = audioCtx.createChannelMerger(2);

  pCompressorNode = audioCtx.createDynamicsCompressor();
  pLimiterNode = audioCtx.createDynamicsCompressor();

  pInputGainNode.connect(pHpFilterNode);
  pHpFilterNode.connect(pLowShelfNode);
  pLowShelfNode.connect(pMidFilterNode);
  pLowShelfNode.connect(pHighShelfNode);
  pHighShelfNode.connect(pLpFilterNode);

  pLpFilterNode.connect(splitter);
  splitter.connect(pMidGainNode, 0);
  splitter.connect(pMidGainNode, 1);

  splitter.connect(pLeftSideNode, 0);
  splitter.connect(pRightSideNode, 1);
  pLeftSideNode.connect(pSideSumNode);
  pRightSideNode.connect(pSideSumNode);

  pMidGainNode.connect(pSaturatorNode);
  pSideSumNode.connect(pSideHpNode);
  pSideHpNode.connect(pSideGainNode);

  pSaturatorNode.connect(pLeftMergeNode);
  pSideGainNode.connect(pLeftMergeNode);
  pLeftMergeNode.connect(pChannelMergerNode, 0, 0);

  pSaturatorNode.connect(pRightMergeMidNode);
  pSideGainNode.connect(pRightMergeSideNode);
  pRightMergeMidNode.connect(pRightMergeNode);
  pRightMergeSideNode.connect(pRightMergeNode);
  pRightMergeNode.connect(pChannelMergerNode, 0, 1);

  pChannelMergerNode.connect(pCompressorNode);
  pCompressorNode.connect(pLimiterNode);
  pLimiterNode.connect(pMasteringGainNode);

  pMasteringGainNode.connect(audioCtx.destination);
  pBypassGainNode.connect(audioCtx.destination);

  pUpdateParameters();
}

function pUpdateParameters() {
  if (!audioCtx || !pTargetBuffer) return;
  const params = presetParams[pCurrentPreset];
  const intensity = parseFloat(document.getElementById("p-intensity-slider").value);
  document.getElementById("p-intensity-val").textContent = intensity.toFixed(1) + "x";

  if (pCurrentMode === 'B') {
    pBypassGainNode.gain.setTargetAtTime(1.0, audioCtx.currentTime, 0.01);
    pMasteringGainNode.gain.setTargetAtTime(0.0, audioCtx.currentTime, 0.01);
    return;
  } else {
    pBypassGainNode.gain.setTargetAtTime(0.0, audioCtx.currentTime, 0.01);
    pMasteringGainNode.gain.setTargetAtTime(1.0, audioCtx.currentTime, 0.01);
  }

  const gainLinear = Math.pow(10, (params.gainBoost * intensity) / 20);
  pInputGainNode.gain.setTargetAtTime(gainLinear, audioCtx.currentTime, 0.05);

  pLowShelfNode.gain.setTargetAtTime(params.lowShelf * intensity, audioCtx.currentTime, 0.05);
  pMidFilterNode.gain.setTargetAtTime(params.midPeak * intensity, audioCtx.currentTime, 0.05);
  pHighShelfNode.gain.setTargetAtTime(params.highShelf * intensity, audioCtx.currentTime, 0.05);

  pSaturatorNode.curve = makeSoftClipCurve(params.saturation * intensity);

  const sideGainLinear = Math.pow(10, (params.sideGain * intensity) / 20);
  pSideGainNode.gain.setTargetAtTime(sideGainLinear, audioCtx.currentTime, 0.05);

  pCompressorNode.threshold.setTargetAtTime(params.compThreshold, audioCtx.currentTime, 0.05);
  pCompressorNode.ratio.setTargetAtTime(params.compRatio, audioCtx.currentTime, 0.05);
  pCompressorNode.attack.setTargetAtTime(params.compAttack, audioCtx.currentTime, 0.05);
  pCompressorNode.release.setTargetAtTime(params.compRelease, audioCtx.currentTime, 0.05);

  pLimiterNode.threshold.setTargetAtTime(-1.0, audioCtx.currentTime, 0.01);
  pLimiterNode.ratio.setTargetAtTime(20.0, audioCtx.currentTime, 0.01);
  pLimiterNode.attack.setTargetAtTime(0.001, audioCtx.currentTime, 0.01);
  pLimiterNode.release.setTargetAtTime(0.1, audioCtx.currentTime, 0.01);
}

function pPlay() {
  if (!pTargetBuffer) return;
  if (audioCtx.state === "suspended") audioCtx.resume();
  pSourceNode = audioCtx.createBufferSource();
  pSourceNode.buffer = pTargetBuffer;

  const bypassMatchedGain = Math.pow(10, -2.0 / 20);
  pBypassGainNode.gain.setValueAtTime(bypassMatchedGain, audioCtx.currentTime);

  pSourceNode.connect(pInputGainNode);
  pSourceNode.connect(pBypassGainNode);

  const offset = pPauseTime;
  pSourceNode.start(0, offset);
  pStartTime = audioCtx.currentTime - offset;
  pIsPlaying = true;
  document.getElementById("p-btn-play").innerHTML = `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
  pTick();
}

function pPause() {
  if (!pIsPlaying) return;
  pSourceNode.stop();
  pPauseTime = audioCtx.currentTime - pStartTime;
  pIsPlaying = false;
  document.getElementById("p-btn-play").innerHTML = `<svg class="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
}

function pStop() {
  if (pIsPlaying) {
    pSourceNode.stop();
    pIsPlaying = false;
  }
  pPauseTime = 0;
  pUpdatePlaybackTime(0);
  document.getElementById("p-btn-play").innerHTML = `<svg class="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
}

function pTick() {
  if (!pIsPlaying) return;
  const elapsed = audioCtx.currentTime - pStartTime;
  if (elapsed >= pTargetBuffer.duration) {
    pStop();
    return;
  }
  pUpdatePlaybackTime(elapsed);
  requestAnimationFrame(pTick);
}

function pUpdatePlaybackTime(seconds) {
  const current = formatTime(seconds);
  const total = formatTime(pTargetBuffer ? pTargetBuffer.duration : 0);
  document.getElementById("p-time-display").textContent = `${current} / ${total}`;
  if (pTargetBuffer) {
    const percent = (seconds / pTargetBuffer.duration) * 100;
    document.getElementById("p-playhead").style.width = `${percent}%`;
  }
}

function pDrawWaveform() {
  const canvas = document.getElementById("p-waveform-canvas");
  const ctx = canvas.getContext("2d");
  const width = canvas.width = canvas.parentElement.clientWidth;
  const height = canvas.height = 96;
  const rawData = pTargetBuffer.getChannelData(0);
  const step = Math.ceil(rawData.length / width);
  const amp = height / 2;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(15, 20, 35, 0.8)";
  ctx.fillRect(0, 0, width, height);

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "#818cf8");
  grad.addColorStop(0.5, "#4f46e5");
  grad.addColorStop(1, "#818cf8");
  ctx.fillStyle = grad;

  for (let i = 0; i < width; i++) {
    let min = 1.0; let max = -1.0;
    for (let j = 0; j < step; j++) {
      const d = rawData[i * step + j];
      if (d < min) min = d;
      if (d > max) max = d;
    }
    ctx.fillRect(i, (1 + min) * amp, 1.5, Math.max(1, (max - min) * amp));
  }
}

document.getElementById("p-waveform-canvas").addEventListener("click", (e) => {
  if (!pTargetBuffer) return;
  const rect = document.getElementById("p-waveform-canvas").getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const targetTime = (clickX / rect.width) * pTargetBuffer.duration;
  const wasPlaying = pIsPlaying;
  if (pIsPlaying) pSourceNode.stop();
  pPauseTime = targetTime;
  pUpdatePlaybackTime(targetTime);
  if (wasPlaying) pPlay();
});

document.getElementById("p-btn-play").addEventListener("click", () => pIsPlaying ? pPause() : pPlay());
document.getElementById("p-btn-stop").addEventListener("click", () => pStop());

document.getElementById("p-btn-mode-a").addEventListener("click", () => {
  pCurrentMode = 'A';
  document.getElementById("p-btn-mode-a").className = "px-4 py-1.5 rounded-lg text-sm font-bold transition-all bg-brand-accent text-white shadow-md focus:outline-none";
  document.getElementById("p-btn-mode-b").className = "px-4 py-1.5 rounded-lg text-sm font-bold transition-all text-gray-400 hover:text-white focus:outline-none";
  pUpdateParameters();
});
document.getElementById("p-btn-mode-b").addEventListener("click", () => {
  pCurrentMode = 'B';
  document.getElementById("p-btn-mode-b").className = "px-4 py-1.5 rounded-lg text-sm font-bold transition-all bg-brand-accent text-white shadow-md focus:outline-none";
  document.getElementById("p-btn-mode-a").className = "px-4 py-1.5 rounded-lg text-sm font-bold transition-all text-gray-400 hover:text-white focus:outline-none";
  pUpdateParameters();
});

document.getElementById("p-btn-reset").addEventListener("click", () => {
  pStop();
  pTargetBuffer = null;
  document.getElementById("p-player-container").classList.add("hidden");
  document.getElementById("p-dropzone").classList.remove("hidden");
  document.getElementById("p-btn-download").disabled = true;
  pFileInput.value = "";
});

document.getElementById("preset-selector-group").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  document.querySelectorAll(".p-btn-preset").forEach(b => {
    b.className = "p-btn-preset w-full text-left p-3 rounded-xl border border-brand-border text-gray-300 flex justify-between items-center transition-all focus:outline-none";
    b.querySelector("span").classList.add("hidden");
  });
  btn.className = "p-btn-preset w-full text-left p-3 rounded-xl border border-brand-accent/50 bg-brand-accent/10 text-white flex justify-between items-center transition-all focus:outline-none";
  btn.querySelector("span").classList.remove("hidden");
  pCurrentPreset = btn.getAttribute("data-preset");
  pUpdateParameters();
});

document.getElementById("p-intensity-slider").addEventListener("input", pUpdateParameters);

document.getElementById("p-btn-download").addEventListener("click", async () => {
  if (!pTargetBuffer) return;
  pPause();
  showLoader("Renderizando", "Processando arquivos de áudio em segundo plano com Web Worker...");

  const params = presetParams[pCurrentPreset];
  const intensity = parseFloat(document.getElementById("p-intensity-slider").value);
  const duration = pTargetBuffer.duration;
  const sampleRate = pTargetBuffer.sampleRate;

  const offlineCtx = new OfflineAudioContext(2, duration * sampleRate, sampleRate);
  const os = offlineCtx.createBufferSource();
  os.buffer = pTargetBuffer;

  const oInput = offlineCtx.createGain();
  const oHp = offlineCtx.createBiquadFilter();
  oHp.type = "highpass"; oHp.frequency.value = 30;

  const oLow = offlineCtx.createBiquadFilter();
  oLow.type = "lowshelf"; oLow.frequency.value = 80; oLow.gain.value = params.lowShelf * intensity;

  const oMid = offlineCtx.createBiquadFilter();
  oMid.type = "peaking"; oMid.frequency.value = 1000; oMid.Q.value = 1.0; oMid.gain.value = params.midPeak * intensity;

  const oHigh = offlineCtx.createBiquadFilter();
  oHigh.type = "highshelf"; oHigh.frequency.value = 12000; oHigh.gain.value = params.highShelf * intensity;

  const oLp = offlineCtx.createBiquadFilter();
  oLp.type = "lowpass"; oLp.frequency.value = 20000;

  const oSplitter = offlineCtx.createChannelSplitter(2);
  const oMidGain = offlineCtx.createGain(); oMidGain.gain.value = 0.5;
  const oLeftSide = offlineCtx.createGain(); oLeftSide.gain.value = 0.5;
  const oRightSide = offlineCtx.createGain(); oRightSide.gain.value = -0.5;
  const oSideSum = offlineCtx.createGain();

  const oSideHp = offlineCtx.createBiquadFilter();
  oSideHp.type = "highpass"; oSideHp.frequency.value = 120;
  const oSideGain = offlineCtx.createGain();

  const oSaturator = offlineCtx.createWaveShaper();
  oSaturator.oversample = "4x"; oSaturator.curve = makeSoftClipCurve(params.saturation * intensity);

  const oLeftMerge = offlineCtx.createGain();
  const oRightMergeMid = offlineCtx.createGain();
  const oRightMergeSide = offlineCtx.createGain(); oRightMergeSide.gain.value = -1.0;
  const oRightMerge = offlineCtx.createGain();
  const oMerger = offlineCtx.createChannelMerger(2);

  const oComp = offlineCtx.createDynamicsCompressor();
  const oLimiter = offlineCtx.createDynamicsCompressor();

  oInput.gain.value = Math.pow(10, (params.gainBoost * intensity) / 20);
  oSideGain.gain.value = Math.pow(10, (params.sideGain * intensity) / 20);

  oComp.threshold.value = params.compThreshold;
  oComp.ratio.value = params.compRatio;
  oComp.attack.value = params.compAttack;
  oComp.release.value = params.compRelease;

  oLimiter.threshold.value = -1.0;
  oLimiter.ratio.value = 20.0;
  oLimiter.attack.value = 0.001;
  oLimiter.release.value = 0.1;

  os.connect(oInput); oInput.connect(oHp); oHp.connect(oLow); oLow.connect(oMid); oMid.connect(oHigh); oHigh.connect(oLp);
  oLp.connect(oSplitter);
  oSplitter.connect(oMidGain, 0); oSplitter.connect(oMidGain, 1);
  oSplitter.connect(oLeftSide, 0); oRightSide.connect(oRightSide, 1);
  oLeftSide.connect(oSideSum); oRightSide.connect(oSideSum);

  oMidGain.connect(oSaturator);
  oSideSum.connect(oSideHp); oSideHp.connect(oSideGain);

  oSaturator.connect(oLeftMerge); oSideGain.connect(oLeftMerge);
  oLeftMerge.connect(oMerger, 0, 0);

  oSaturator.connect(oRightMergeMid); oSideGain.connect(oRightMergeSide);
  oRightMergeMid.connect(oRightMerge); oRightMergeSide.connect(oRightMerge);
  oRightMerge.connect(oMerger, 0, 1);

  oMerger.connect(oComp); oComp.connect(oLimiter);
  oLimiter.connect(offlineCtx.destination);

  os.start();
  try {
    const renderBuffer = await offlineCtx.startRendering();
    const wavBlob = await bufferToWavAsync(renderBuffer);
    const url = URL.createObjectURL(wavBlob);
    const l = document.createElement("a");
    l.href = url;
    l.download = `${pTargetFileName}_EstudioNeto_PresetMaster.wav`;
    l.click();
  } catch (err) {
    console.error(err);
    alert("Erro na renderização final.");
  } finally {
    hideLoader();
  }
});

// --- REFERENCE AUDIO LOGIC ---
let rTargetBuffer = null;
let rRefBuffer = null;
let rSourceNode = null;
let rStartTime = 0;
let rPauseTime = 0;
let rIsPlaying = false;
let rCurrentMode = 'A';
let rTargetFileName = "";
let rMatchEQGains = new Float32Array(7);
let rLoudnessBoostDb = 0;
let rStereoWidthMultiplier = 1.0;

let rBypassGainNode = null, rMasteringGainNode = null, rInputGainNode = null;
let rHpFilterNode = null, rEqFilters = [];
let rMidGainNode = null, rLeftSideNode = null, rRightSideNode = null, rSideSumNode = null, rSideHpNode = null, rSideGainNode = null;
let rSaturatorNode = null, rLeftMergeNode = null, rRightMergeMidNode = null, rRightMergeSideNode = null, rRightMergeNode = null, rChannelMergerNode = null;
let rCompressorNode = null, rLimiterNode = null;

const rFileTarget = document.getElementById("r-file-target");
const rDropzoneTarget = document.getElementById("r-dropzone-target");
rDropzoneTarget.addEventListener("click", () => rFileTarget.click());
setupDropzone(rDropzoneTarget, rFileTarget, (file) => rLoadFile(file, 'target'));

const rFileRef = document.getElementById("r-file-ref");
const rDropzoneRef = document.getElementById("r-dropzone-ref");
rDropzoneRef.addEventListener("click", () => rFileRef.click());
setupDropzone(rDropzoneRef, rFileRef, (file) => rLoadFile(file, 'ref'));

function setupDropzone(element, inputElement, callback) {
  element.addEventListener("dragover", (e) => { e.preventDefault(); element.classList.add("border-brand-accent"); });
  element.addEventListener("dragleave", () => element.classList.remove("border-brand-accent"));
  element.addEventListener("drop", (e) => {
    e.preventDefault();
    element.classList.remove("border-brand-accent");
    if (e.dataTransfer.files.length > 0) callback(e.dataTransfer.files[0]);
  });
  inputElement.addEventListener("change", (e) => {
    if (e.target.files.length > 0) callback(e.target.files[0]);
  });
}

async function rLoadFile(file, type) {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  showLoader("Processando", `Mapeando ${file.name}...`);
  try {
    const arrayBuffer = await file.arrayBuffer();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);
    if (type === 'target') {
      rTargetBuffer = decoded;
      rTargetFileName = file.name.split('.').slice(0, -1).join('.');
      document.getElementById("r-target-status").textContent = "✓ Faixa de Origem Carregada";
      document.getElementById("r-target-status").className = "text-sm text-indigo-400 font-bold";
      document.getElementById("r-target-details").textContent = `${formatTime(decoded.duration)} | Stereo`;
      document.getElementById("r-target-details").classList.remove("hidden");
    } else {
      rRefBuffer = decoded;
      document.getElementById("r-ref-status").textContent = "✓ Referência Carregada";
      document.getElementById("r-ref-status").className = "text-sm text-emerald-400 font-bold";
      document.getElementById("r-ref-details").textContent = `${formatTime(decoded.duration)} | Stereo`;
      document.getElementById("r-ref-details").classList.remove("hidden");
    }

    if (rTargetBuffer && rRefBuffer) {
      document.getElementById("r-analysis-trigger-panel").classList.remove("hidden");
    }
  } catch (err) {
    console.error(err);
    alert("Erro na análise do arquivo de áudio.");
  } finally {
    hideLoader();
  }
}

function runFFT(re, im) {
  const n = re.length;
  let limit = 1; let bit = n >> 1;
  while (limit < n) {
    for (let i = 0; i < limit; i++) {
      if ((i & bit) === 0) {
        const j = i | bit;
        const tempRe = re[i]; const tempIm = im[i];
        re[i] = re[j]; im[i] = im[j];
        re[j] = tempRe; im[j] = tempIm;
      }
    }
    limit = limit << 1; bit = bit >> 1;
  }
  let size = 2;
  while (size <= n) {
    const halfSize = size >> 1;
    const tabStep = n / size;
    for (let i = 0; i < n; i += size) {
      for (let j = i, k = 0; j < i + halfSize; j++, k += tabStep) {
        const angle = -2 * Math.PI * k / n;
        const wr = Math.cos(angle); const wi = Math.sin(angle);
        const tRe = re[j + halfSize] * wr - im[j + halfSize] * wi;
        const tIm = re[j + halfSize] * wi + im[j + halfSize] * wr;
        re[j + halfSize] = re[j] - tRe; im[j + halfSize] = im[j] - tIm;
        re[j] += tRe; im[j] += tIm;
      }
    }
    size = size << 1;
  }
}

function rAnalyzeProfile(buffer) {
  const numChannels = buffer.numberOfChannels;
  const leftData = buffer.getChannelData(0);
  const rightData = numChannels > 1 ? buffer.getChannelData(1) : leftData;
  const totalSamples = buffer.length;

  const windowSize = 4096;
  const numWindows = 150;
  const step = Math.floor((totalSamples - windowSize) / numWindows);

  const binsAccumulator = new Float32Array(windowSize / 2);
  let totalMidRms = 0; let totalSideRms = 0;

  const re = new Float32Array(windowSize);
  const im = new Float32Array(windowSize);

  for (let w = 0; w < numWindows; w++) {
    const offset = w * step;
    let sumSqMid = 0; let sumSqSide = 0;

    for (let i = 0; i < windowSize; i++) {
      const l = leftData[offset + i];
      const r = rightData[offset + i];
      const mid = (l + r) * 0.5;
      const side = (l - r) * 0.5;

      sumSqMid += mid * mid;
      sumSqSide += side * side;

      re[i] = mid;
      im[i] = 0;
    }

    totalMidRms += Math.sqrt(sumSqMid / windowSize);
    totalSideRms += Math.sqrt(sumSqSide / windowSize);

    runFFT(re, im);

    for (let i = 0; i < windowSize / 2; i++) {
      binsAccumulator[i] += Math.sqrt(re[i] * re[i] + im[i] * im[i]);
    }
  }

  for (let i = 0; i < windowSize / 2; i++) {
    binsAccumulator[i] /= numWindows;
  }

  const avgMidRms = totalMidRms / numWindows;
  const avgSideRms = totalSideRms / numWindows;
  const widthRatio = avgMidRms > 0 ? (avgSideRms / avgMidRms) : 0;
  const finalRmsCombined = Math.sqrt((avgMidRms * avgMidRms) + (avgSideRms * avgSideRms));

  const sampleRate = buffer.sampleRate;
  const bandLimits = [0, 100, 250, 750, 2000, 5000, 10000, 22000];
  const bandEnergies = new Float32Array(7);

  for (let b = 0; b < 7; b++) {
    const lowFreq = bandLimits[b];
    const highFreq = bandLimits[b + 1];
    const lowBin = Math.floor((lowFreq * windowSize) / sampleRate);
    const highBin = Math.min(windowSize / 2 - 1, Math.ceil((highFreq * windowSize) / sampleRate));

    let sumBins = 0; let count = 0;
    for (let bin = lowBin; bin <= highBin; bin++) {
      sumBins += binsAccumulator[bin];
      count++;
    }
    bandEnergies[b] = count > 0 ? (sumBins / count) : 1e-5;
  }

  return { rms: finalRmsCombined, stereoWidth: widthRatio, bandEnergies: bandEnergies };
}

document.getElementById("r-btn-start-analysis").addEventListener("click", () => {
  showLoader("Mapeamento", "Analisando referências espectrais locais...");
  setTimeout(() => {
    try {
      const targetProfile = rAnalyzeProfile(rTargetBuffer);
      const refProfile = rAnalyzeProfile(rRefBuffer);

      for (let b = 0; b < 7; b++) {
        const ratio = refProfile.bandEnergies[b] / targetProfile.bandEnergies[b];
        let dB = 20 * Math.log10(ratio);
        if (isNaN(dB) || !isFinite(dB)) dB = 0;
        rMatchEQGains[b] = Math.max(-7.5, Math.min(7.5, dB));
      }

      const rmsRatio = refProfile.rms / targetProfile.rms;
      rLoudnessBoostDb = 20 * Math.log10(rmsRatio);
      if (isNaN(rLoudnessBoostDb) || !isFinite(rLoudnessBoostDb)) rLoudnessBoostDb = 4.0;
      rLoudnessBoostDb = Math.max(1.0, Math.min(10.0, rLoudnessBoostDb));

      const sideRatio = refProfile.stereoWidth / targetProfile.stereoWidth;
      rStereoWidthMultiplier = isNaN(sideRatio) || !isFinite(sideRatio) ? 1.0 : Math.max(0.6, Math.min(1.8, sideRatio));

      document.getElementById("r-metric-rms").textContent = `+${rLoudnessBoostDb.toFixed(1)} dB`;
      document.getElementById("r-metric-width").textContent = `${(rStereoWidthMultiplier * 100).toFixed(0)}%`;

      document.getElementById("r-analysis-trigger-panel").classList.add("hidden");
      document.getElementById("r-studio-panel").classList.remove("hidden");
      document.getElementById("r-studio-track-name").textContent = rTargetFileName + ".wav";

      rBuildAudioGraph();
      rDrawWaveform();
      rDrawEQCurve();
      rUpdatePlaybackTime(0);

    } catch (err) {
      console.error(err);
      alert("Falha na análise estatística de correspondência.");
    } finally {
      hideLoader();
    }
  }, 100);
});

function rBuildAudioGraph() {
  rBypassGainNode = audioCtx.createGain();
  rMasteringGainNode = audioCtx.createGain();
  rInputGainNode = audioCtx.createGain();

  rHpFilterNode = audioCtx.createBiquadFilter();
  rHpFilterNode.type = "highpass";
  rHpFilterNode.frequency.value = 28;

  rEqFilters = [];
  let lastNode = rHpFilterNode;

  for (let i = 0; i < 7; i++) {
    const filter = audioCtx.createBiquadFilter();
    if (i === 0) {
      filter.type = "lowshelf";
    } else if (i === 6) {
      filter.type = "highshelf";
    } else {
      filter.type = "peaking";
      filter.Q.value = 1.0;
    }
    filter.frequency.value = eqFrequencies[i];
    lastNode.connect(filter);
    rEqFilters.push(filter);
    lastNode = filter;
  }

  rSaturatorNode = audioCtx.createWaveShaper();
  rSaturatorNode.oversample = "4x";

  const splitter = audioCtx.createChannelSplitter(2);
  rMidGainNode = audioCtx.createGain(); rMidGainNode.gain.value = 0.5;
  rLeftSideNode = audioCtx.createGain(); rLeftSideNode.gain.value = 0.5;
  rRightSideNode = audioCtx.createGain(); rRightSideNode.gain.value = -0.5;
  rSideSumNode = audioCtx.createGain();

  rSideHpNode = audioCtx.createBiquadFilter();
  rSideHpNode.type = "highpass"; rSideHpNode.frequency.value = 120;
  rSideGainNode = audioCtx.createGain();

  rLeftMergeNode = audioCtx.createGain();
  rRightMergeMidNode = audioCtx.createGain();
  rRightMergeSide = audioCtx.createGain(); rRightMergeSide.gain.value = -1.0;
  rRightMergeNode = audioCtx.createGain();
  rChannelMergerNode = audioCtx.createChannelMerger(2);

  rCompressorNode = audioCtx.createDynamicsCompressor();
  rLimiterNode = audioCtx.createDynamicsCompressor();

  lastNode.connect(splitter);
  splitter.connect(rMidGainNode, 0); splitter.connect(rMidGainNode, 1);
  splitter.connect(rLeftSideNode, 0); splitter.connect(rRightSideNode, 1);
  rLeftSideNode.connect(rSideSumNode); rRightSideNode.connect(rSideSumNode);

  rMidGainNode.connect(rSaturatorNode);
  rSideSumNode.connect(rSideHpNode); rSideHpNode.connect(rSideGainNode);

  rSaturatorNode.connect(rLeftMergeNode); rSideGainNode.connect(rLeftMergeNode);
  rLeftMergeNode.connect(rChannelMergerNode, 0, 0);

  rSaturatorNode.connect(rRightMergeMidNode); rSideGainNode.connect(rRightMergeSide);
  rRightMergeMidNode.connect(rRightMergeNode); rRightMergeSide.connect(rRightMergeNode);
  rRightMergeNode.connect(rChannelMergerNode, 0, 1);

  rChannelMergerNode.connect(rCompressorNode); rCompressorNode.connect(rLimiterNode);
  rLimiterNode.connect(rMasteringGainNode);

  rMasteringGainNode.connect(audioCtx.destination);
  rBypassGainNode.connect(audioCtx.destination);

  rUpdateParameters();
}

function rUpdateParameters() {
  if (!audioCtx || !rTargetBuffer) return;
  const intensity = parseFloat(document.getElementById("r-intensity-slider").value);
  document.getElementById("r-intensity-val").textContent = intensity.toFixed(1) + "x";

  if (rCurrentMode === 'B') {
    rBypassGainNode.gain.setTargetAtTime(1.0, audioCtx.currentTime, 0.01);
    rMasteringGainNode.gain.setTargetAtTime(0.0, audioCtx.currentTime, 0.01);
    return;
  } else {
    rBypassGainNode.gain.setTargetAtTime(0.0, audioCtx.currentTime, 0.01);
    rMasteringGainNode.gain.setTargetAtTime(1.0, audioCtx.currentTime, 0.01);
  }

  const gainLinear = Math.pow(10, (rLoudnessBoostDb * intensity) / 20);
  rInputGainNode.gain.setTargetAtTime(gainLinear, audioCtx.currentTime, 0.05);

  for (let i = 0; i < 7; i++) {
    rEqFilters[i].gain.setTargetAtTime(rMatchEQGains[i] * intensity, audioCtx.currentTime, 0.05);
  }

  rSaturatorNode.curve = makeSoftClipCurve(0.2 * intensity);
  rSideGainNode.gain.setTargetAtTime(rStereoWidthMultiplier * intensity, audioCtx.currentTime, 0.05);

  rCompressorNode.threshold.setTargetAtTime(-16, audioCtx.currentTime, 0.05);
  rCompressorNode.ratio.setTargetAtTime(1.6, audioCtx.currentTime, 0.05);
  rCompressorNode.attack.setTargetAtTime(0.04, audioCtx.currentTime, 0.05);
  rCompressorNode.release.setTargetAtTime(0.12, audioCtx.currentTime, 0.05);

  rLimiterNode.threshold.setTargetAtTime(-1.0, audioCtx.currentTime, 0.01);
  rLimiterNode.ratio.setTargetAtTime(20.0, audioCtx.currentTime, 0.01);
  rLimiterNode.attack.setTargetAtTime(0.001, audioCtx.currentTime, 0.01);
  rLimiterNode.release.setTargetAtTime(0.1, audioCtx.currentTime, 0.01);
}

function rPlay() {
  if (!rTargetBuffer) return;
  if (audioCtx.state === "suspended") audioCtx.resume();
  rSourceNode = audioCtx.createBufferSource();
  rSourceNode.buffer = rTargetBuffer;

  const bypassMatchedGain = Math.pow(10, -2.0 / 20);
  rBypassGainNode.gain.setValueAtTime(bypassMatchedGain, audioCtx.currentTime);

  rSourceNode.connect(rInputGainNode);
  rSourceNode.connect(rBypassGainNode);

  const offset = rPauseTime;
  rSourceNode.start(0, offset);
  rStartTime = audioCtx.currentTime - offset;
  rIsPlaying = true;
  document.getElementById("r-btn-play").innerHTML = `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
  rTick();
}

function rPause() {
  if (!rIsPlaying) return;
  rSourceNode.stop();
  rPauseTime = audioCtx.currentTime - rStartTime;
  rIsPlaying = false;
  document.getElementById("r-btn-play").innerHTML = `<svg class="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
}

document.getElementById("r-btn-reset").addEventListener("click", () => {
  rStop();
  rTargetBuffer = null;
  rRefBuffer = null;
  document.getElementById("r-studio-panel").classList.add("hidden");
  document.getElementById("r-analysis-trigger-panel").classList.add("hidden");
  document.getElementById("r-target-status").textContent = "Arraste ou clique para carregar a música alvo";
  document.getElementById("r-target-status").className = "text-sm text-gray-400";
  document.getElementById("r-target-details").classList.add("hidden");
  document.getElementById("r-ref-status").textContent = "Arraste ou clique para carregar a referência";
  document.getElementById("r-ref-status").className = "text-sm text-gray-400";
  document.getElementById("r-ref-details").classList.add("hidden");
  rFileTarget.value = "";
  rFileRef.value = "";
});

function rStop() {
  if (rIsPlaying) {
    rSourceNode.stop();
    rIsPlaying = false;
  }
  rPauseTime = 0;
  rUpdatePlaybackTime(0);
  document.getElementById("r-btn-play").innerHTML = `<svg class="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
}

function rTick() {
  if (!rIsPlaying) return;
  const elapsed = audioCtx.currentTime - rStartTime;
  if (elapsed >= rTargetBuffer.duration) {
    rStop();
    return;
  }
  rUpdatePlaybackTime(elapsed);
  requestAnimationFrame(rTick);
}

function rUpdatePlaybackTime(seconds) {
  const current = formatTime(seconds);
  const total = formatTime(rTargetBuffer ? rTargetBuffer.duration : 0);
  document.getElementById("r-time-display").textContent = `${current} / ${total}`;
  if (rTargetBuffer) {
    const percent = (seconds / rTargetBuffer.duration) * 100;
    document.getElementById("r-playhead").style.width = `${percent}%`;
  }
}

function rDrawWaveform() {
  const canvas = document.getElementById("r-waveform-canvas");
  const ctx = canvas.getContext("2d");
  const width = canvas.width = canvas.parentElement.clientWidth;
  const height = canvas.height = 96;
  const rawData = rTargetBuffer.getChannelData(0);
  const step = Math.ceil(rawData.length / width);
  const amp = height / 2;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(15, 20, 35, 0.8)";
  ctx.fillRect(0, 0, width, height);

  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "#a78bfa");
  grad.addColorStop(0.5, "#7c3aed");
  grad.addColorStop(1, "#a78bfa");
  ctx.fillStyle = grad;

  for (let i = 0; i < width; i++) {
    let min = 1.0; let max = -1.0;
    for (let j = 0; j < step; j++) {
      const d = rawData[i * step + j];
      if (d < min) min = d;
      if (d > max) max = d;
    }
    ctx.fillRect(i, (1 + min) * amp, 1.5, Math.max(1, (max - min) * amp));
  }
}

function rDrawEQCurve() {
  const canvas = document.getElementById("r-eq-curve-canvas");
  const ctx = canvas.getContext("2d");
  const width = canvas.width = canvas.parentElement.clientWidth;
  const height = canvas.height = 144;
  const intensity = parseFloat(document.getElementById("r-intensity-slider").value);

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(31, 41, 55, 0.8)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2);
  ctx.stroke();

  ctx.strokeStyle = "#8b5cf6";
  ctx.lineWidth = 3;
  ctx.beginPath();

  for (let x = 0; x < width; x++) {
    const percent = x / width;
    const font = 20 * Math.pow(1000, percent);
    let gainValue = 0;
    for (let i = 0; i < 7; i++) {
      const filterFreq = eqFrequencies[i];
      const dist = Math.abs(Math.log10(font / filterFreq));
      const influence = Math.exp(-dist * dist * 3.5);
      gainValue += rMatchEQGains[i] * intensity * influence;
    }
    const y = height / 2 - (gainValue / 10) * (height / 2);
    if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

document.getElementById("r-waveform-canvas").addEventListener("click", (e) => {
  if (!rTargetBuffer) return;
  const rect = document.getElementById("r-waveform-canvas").getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const targetTime = (clickX / rect.width) * rTargetBuffer.duration;
  const wasPlaying = rIsPlaying;
  if (rIsPlaying) rSourceNode.stop();
  rPauseTime = targetTime;
  rUpdatePlaybackTime(targetTime);
  if (wasPlaying) rPlay();
});

document.getElementById("r-btn-play").addEventListener("click", () => rIsPlaying ? rPause() : rPlay());
document.getElementById("r-btn-stop").addEventListener("click", () => rStop());

document.getElementById("r-btn-mode-a").addEventListener("click", () => {
  rCurrentMode = 'A';
  document.getElementById("r-btn-mode-a").className = "px-4 py-1.5 rounded-lg text-sm font-bold transition-all bg-brand-accent text-white shadow-md focus:outline-none";
  document.getElementById("r-btn-mode-b").className = "px-4 py-1.5 rounded-lg text-sm font-bold transition-all text-gray-400 hover:text-white focus:outline-none";
  rUpdateParameters();
});
document.getElementById("r-btn-mode-b").addEventListener("click", () => {
  rCurrentMode = 'B';
  document.getElementById("r-btn-mode-b").className = "px-4 py-1.5 rounded-lg text-sm font-bold transition-all bg-brand-accent text-white shadow-md focus:outline-none";
  document.getElementById("r-btn-mode-a").className = "px-4 py-1.5 rounded-lg text-sm font-bold transition-all text-gray-400 hover:text-white focus:outline-none";
  rUpdateParameters();
});

document.getElementById("r-intensity-slider").addEventListener("input", () => {
  rUpdateParameters();
  rDrawEQCurve();
});

document.getElementById("r-btn-download").addEventListener("click", async () => {
  if (!rTargetBuffer) return;
  rPause();
  showLoader("Renderizando", "Exportando arquivo de áudio de alta fidelidade...");

  const intensity = parseFloat(document.getElementById("r-intensity-slider").value);
  const duration = rTargetBuffer.duration;
  const sampleRate = rTargetBuffer.sampleRate;

  const offlineCtx = new OfflineAudioContext(2, duration * sampleRate, sampleRate);
  const os = offlineCtx.createBufferSource();
  os.buffer = rTargetBuffer;

  const oInput = offlineCtx.createGain();
  const oHp = offlineCtx.createBiquadFilter();
  oHp.type = "highpass"; oHp.frequency.value = 28;

  let lastNode = oHp;
  for (let i = 0; i < 7; i++) {
    const filter = offlineCtx.createBiquadFilter();
    if (i === 0) {
      filter.type = "lowshelf";
    } else if (i === 6) {
      filter.type = "highshelf";
    } else {
      filter.type = "peaking";
      filter.Q.value = 1.0;
    }
    filter.frequency.value = eqFrequencies[i];
    filter.gain.value = rMatchEQGains[i] * intensity;
    lastNode.connect(filter);
    lastNode = filter;
  }

  const oSplitter = offlineCtx.createChannelSplitter(2);
  const oMidGain = offlineCtx.createGain(); oMidGain.gain.value = 0.5;
  const oLeftSide = offlineCtx.createGain(); oLeftSide.gain.value = 0.5;
  const oRightSide = offlineCtx.createGain(); oRightSide.gain.value = -0.5;
  const oSideSum = offlineCtx.createGain();

  const oSideHp = offlineCtx.createBiquadFilter();
  oSideHp.type = "highpass"; oSideHp.frequency.value = 120;
  const oSideGain = offlineCtx.createGain();

  const oSaturator = offlineCtx.createWaveShaper();
  oSaturator.oversample = "4x"; oSaturator.curve = makeSoftClipCurve(0.2 * intensity);

  const oLeftMerge = offlineCtx.createGain();
  const oRightMergeMid = offlineCtx.createGain();
  const oRightMergeSide = offlineCtx.createGain(); oRightMergeSide.gain.value = -1.0;
  const oRightMerge = offlineCtx.createGain();
  const oMerger = offlineCtx.createChannelMerger(2);

  const oComp = offlineCtx.createDynamicsCompressor();
  const oLimiter = offlineCtx.createDynamicsCompressor();

  oInput.gain.value = Math.pow(10, (rLoudnessBoostDb * intensity) / 20);
  oSideGain.gain.value = rStereoWidthMultiplier * intensity;

  oComp.threshold.value = -16;
  oComp.ratio.value = 1.6;
  oComp.attack.value = 0.04;
  oComp.release.value = 0.12;

  oLimiter.threshold.value = -1.0;
  oLimiter.ratio.value = 20.0;
  oLimiter.attack.value = 0.001;
  oLimiter.release.value = 0.1;

  os.connect(oInput);
  oInput.connect(oHp);
  lastNode.connect(oSplitter);

  oSplitter.connect(oMidGain, 0); oSplitter.connect(oMidGain, 1);
  oSplitter.connect(oLeftSide, 0); oRightSide.connect(oRightSide, 1);
  oLeftSide.connect(oSideSum); oRightSide.connect(oSideSum);

  oMidGain.connect(oSaturator);
  oSideSum.connect(oSideHp); oSideHp.connect(oSideGain);

  oSaturator.connect(oLeftMerge); oSideGain.connect(oLeftMerge);
  oLeftMerge.connect(oMerger, 0, 0);

  oSaturator.connect(oRightMergeMid); oSideGain.connect(oRightMergeSide);
  oRightMergeMid.connect(oRightMerge); oRightMergeSide.connect(oRightMerge);
  oRightMerge.connect(oMerger, 0, 1);

  oMerger.connect(oComp); oComp.connect(oLimiter);
  oLimiter.connect(offlineCtx.destination);

  os.start();
  try {
    const renderBuffer = await offlineCtx.startRendering();
    const wavBlob = await bufferToWavAsync(renderBuffer);
    const url = URL.createObjectURL(wavBlob);
    const l = document.createElement("a");
    l.href = url;
    l.download = `${rTargetFileName}_EstudioNeto_RefMaster.wav`;
    l.click();
  } catch (err) {
    console.error(err);
    alert("Erro na exportação de referência.");
  } finally {
    hideLoader();
  }
});

// --- COMPARTILHADO ---
function makeSoftClipCurve(drive) {
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    if (drive === 0) {
      curve[i] = x;
    } else {
      curve[i] = Math.tanh(drive * x * 2.0) / Math.tanh(drive * 2.0);
    }
  }
  return curve;
}

function formatTime(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

// Lógica de Renderização do Worker com Transferência Direta de RAM (Sem Clonagem / Sem Travamentos)
function bufferToWavAsync(buffer) {
  return new Promise((resolve) => {
    const workerScript = document.getElementById('wav-worker').textContent;
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    
    const numOfChan = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const channelsData = [];
    const transferList = [];
    
    for (let i = 0; i < numOfChan; i++) {
      const srcData = buffer.getChannelData(i);
      // Criar um novo Array Buffer estritamente para isolar do AudioBuffer original e transferir de forma direta
      const copyData = new Float32Array(srcData.length);
      copyData.set(srcData);
      channelsData.push(copyData);
      transferList.push(copyData.buffer); // Passagem física por referência (Tempo: 0ms)
    }
    
    worker.onmessage = function(e) {
      const bufferArr = e.data;
      const wavBlob = new Blob([bufferArr], { type: "audio/wav" });
      worker.terminate();
      resolve(wavBlob);
    };
    
    worker.postMessage({ numOfChan, sampleRate, channelsData }, transferList);
  });
}

window.addEventListener("resize", () => {
  if (pTargetBuffer && currentTab === 'presets') pDrawWaveform();
  if (rTargetBuffer && currentTab === 'reference') {
    rDrawWaveform();
    rDrawEQCurve();
  }
});