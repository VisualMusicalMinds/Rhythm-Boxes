const grid = document.getElementById("grid");
const totalSteps = 16;
const cells = [];
const boxes = [];
let currentColor = '';
let currentLength = 0;
let bpm = 60;
let isPlaying = false;
let currentStep = 0;
let interval;

// ---- SOUND MODE/PITCH ----
let soundMode = "drum";
let selectedPitch = "A2";

// ---- AUDIO CONTEXT, LAZY INIT ----
let ctx = null;
let masterGain = null;
async function ensureAudio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state !== "running") {
    await ctx.resume();
  }
}

// ---- HANDLER FOR VOLUME ----
document.getElementById("volumeControl").addEventListener("input", async e => {
  await ensureAudio();
  masterGain.gain.value = parseFloat(e.target.value);
});

// ---- HANDLER FOR TEMPO ----
document.getElementById("tempoInput").addEventListener("change", e => {
  bpm = parseInt(e.target.value);
  if (bpm < 30) bpm = 30;
  if (bpm > 300) bpm = 300;
  e.target.value = bpm;
  if (isPlaying) {
    clearInterval(interval);
    startPlaybackLoop();
  }
});

// ---- SOUND MODE & PITCH SELECTORS ----
document.querySelectorAll('input[name="soundMode"]').forEach(radio => {
  radio.addEventListener('change', function() {
    soundMode = this.value;
    document.getElementById('pitchSelector').style.display = (soundMode === "pitch") ? "" : "none";
  });
});
document.getElementById("pitchSelector").addEventListener('change', function() {
  selectedPitch = this.value;
});

// ---- NOTE TO FREQUENCY ----
function noteToFrequency(note) {
  // Map note names to MIDI numbers
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  let match = note.match(/^([A-G]#?)(\d)$/);
  if (!match) return 440;
  let [_, n, octave] = match;
  let noteIndex = notes.indexOf(n);
  if (noteIndex === -1) return 440;
  let midi = noteIndex + 12 * (parseInt(octave) + 1);
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ---- SOUND FUNCTIONS ----
async function playTick() {
  await ensureAudio();
  const bufferSize = 4096;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(800, ctx.currentTime);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  noise.start(ctx.currentTime);
  noise.stop(ctx.currentTime + 0.05);
}

// ---- TRIANGLE WAVE PITCH ----
async function playPitch(note) {
  await ensureAudio();
  const duration = 0.13;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(noteToFrequency(note), ctx.currentTime);
  gain.gain.setValueAtTime(1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

// ---- SINE TONE FOR DRUMBOXES (no longer used for pitch, keep for legacy) ----
async function playTone() {
  await ensureAudio();
  const duration = 0.13;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(110, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + duration * 0.8);
  gain.gain.setValueAtTime(1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start();
  osc.stop(ctx.currentTime + duration);

  const click = ctx.createBufferSource();
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  click.buffer = buffer;
  const clickGain = ctx.createGain();
  clickGain.gain.value = 0.25;
  click.connect(clickGain).connect(masterGain);
  click.start();
}

// ---- HIGHLIGHT IMAGE ----
function highlightImage(cell) {
  const img = cell.parentElement.querySelector('.cell-image');
  if (img) {
    img.classList.add('highlight');
    setTimeout(() => img.classList.remove('highlight'), (60000 / bpm) / 4);
  }
}

// ---- PLAY CURRENT STEP ----
async function playStep() {
  cells.forEach(cell => cell.classList.remove("highlight"));
  const currentGroupStart = Math.floor(currentStep / 4) * 4;
  const currentPairStart = currentStep % 2 === 0 ? currentStep : currentStep - 1;
  const group = cells.slice(currentGroupStart, currentGroupStart + 4);
  const pair = [cells[currentPairStart], cells[currentPairStart + 1]];
  const allGroupEmpty = group.every(c => !c.dataset.permanent);
  const bothPairEmpty = pair.every(c => !c.dataset.permanent);

  if ([0, 4, 8, 12].includes(currentStep)) await playTick();

  const box = boxes.find(b => b.start === currentStep);
  if (box) {
    for (let i = 0; i < box.length; i++) {
      const cell = cells[box.start + i];
      cell.classList.add("highlight");
      highlightImage(cell);
    }
    // SOUND LOGIC: Drum or Pitch
    if (soundMode === "drum") {
      await playTone();
    } else {
      await playPitch(selectedPitch);
    }
  } else if (!cells[currentStep].dataset.permanent) {
    if (allGroupEmpty) {
      group.forEach(c => {
        c.classList.add("highlight");
        setTimeout(() => c.classList.remove("highlight"), (60000 / bpm) / 4);
        highlightImage(c);
      });
    } else if (bothPairEmpty && currentStep % 2 === 0) {
      pair.forEach(c => {
        c.classList.add("highlight");
        setTimeout(() => c.classList.remove("highlight"), (60000 / bpm) / 4);
        highlightImage(c);
      });
    } else {
      const cell = cells[currentStep];
      cell.classList.add("highlight");
      setTimeout(() => cell.classList.remove("highlight"), (60000 / bpm) / 4);
      highlightImage(cell);
    }
  }

  currentStep = (currentStep + 1) % totalSteps;
}

// ---- PLAYBACK LOOP ----
function startPlaybackLoop() {
  interval = setInterval(() => {
    playStep().catch(console.error);
  }, (60000 / bpm) / 4);
}

// ---- PLAY/STOP BUTTON ----
async function togglePlay() {
  await ensureAudio();
  if (isPlaying) {
    clearInterval(interval);
    isPlaying = false;
    currentStep = 0;
    cells.forEach(cell => cell.classList.remove("highlight"));
  } else {
    isPlaying = true;
    startPlaybackLoop();
  }
}

// ---- CLEAR BUTTON ----
function clearAll() {
  boxes.length = 0;
  cells.forEach(cell => {
    cell.classList.remove("green-primary", "green-secondary", "orange-primary", "orange-secondary", "purple", "highlight");
    delete cell.dataset.permanent;
    delete cell.dataset.color;
    const img = cell.parentElement.querySelector(".cell-image");
    if (img) img.src = "https://raw.githubusercontent.com/VisualMusicalMinds/Cartoon_Notation/refs/heads/main/Cartoon%20Rhythm0008.png";
  });
}

// ---- WIRE UP BUTTONS ----
document.getElementById("playButton").addEventListener("click", togglePlay);
document.getElementById("clearButton").addEventListener("click", clearAll);

// ---- GRID IMAGE LOGIC ----
function updateImageRow() {
  for (let i = 0; i < totalSteps; i++) {
    const wrapper = cells[i].parentElement;
    const img = wrapper.querySelector(".cell-image");
    img.src = "https://raw.githubusercontent.com/VisualMusicalMinds/Cartoon_Notation/refs/heads/main/Cartoon%20Rhythm0008.png";
  }

  for (let i = 0; i < totalSteps; i++) {
    const cell = cells[i];
    let src = "";
    let skip = 0;

    if (cell.dataset.permanent) {
      if (cell.dataset.color === "green") {
        src = "https://raw.githubusercontent.com/VisualMusicalMinds/Cartoon_Notation/refs/heads/main/Cartoon%20Rhythm0002.png";
        skip = 3;
      } else if (cell.dataset.color === "orange") {
        src = "https://raw.githubusercontent.com/VisualMusicalMinds/Cartoon_Notation/refs/heads/main/Cartoon%20Rhythm0004.png";
        skip = 1;
      } else if (cell.dataset.color === "purple") {
        src = "https://raw.githubusercontent.com/VisualMusicalMinds/Cartoon_Notation/refs/heads/main/Cartoon%20Rhythm0006.png";
        skip = 0;
      }
    } else {
      const groupStart = Math.floor(i / 4) * 4;
      const group = cells.slice(groupStart, groupStart + 4);
      const allEmpty = group.every(c => !c.dataset.permanent);
      if (allEmpty && i % 4 === 0) {
        src = "https://raw.githubusercontent.com/VisualMusicalMinds/Cartoon_Notation/refs/heads/main/Cartoon%20Rhythm0003.png";
        skip = 3;
      } else {
        const pairStart = i % 2 === 0 ? i : i - 1;
        const pair = [cells[pairStart], cells[pairStart + 1]];
        const bothEmpty = pair.every(c => !c.dataset.permanent);
        const oneEmpty = !cell.dataset.permanent && pair.some(c => c.dataset.permanent);
        if (bothEmpty && i % 2 === 0) {
          src = "https://raw.githubusercontent.com/VisualMusicalMinds/Cartoon_Notation/refs/heads/main/Cartoon%20Rhythm0005.png";
          skip = 1;
        } else if (oneEmpty) {
          src = "https://raw.githubusercontent.com/VisualMusicalMinds/Cartoon_Notation/refs/heads/main/Cartoon%20Rhythm0007.png";
          skip = 0;
        }
      }
    }

    const wrapper = cells[i].parentElement;
    const img = wrapper.querySelector(".cell-image");
    if (src) {
      img.src = src;
      for (let j = 1; j <= skip; j++) {
        const nextCell = cells[i + j];
        if (nextCell) {
          const spacerImg = nextCell.parentElement.querySelector(".cell-image");
          spacerImg.src = "https://raw.githubusercontent.com/VisualMusicalMinds/Cartoon_Notation/refs/heads/main/Cartoon%20Rhythm0008.png";
        }
      }
      i += skip;
    }
  }
}

// ---- BUILD THE GRID ----
for (let i = 0; i < totalSteps; i++) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("cell-wrapper");
  const img = document.createElement("img");
  img.className = "cell-image";
  img.src = "https://raw.githubusercontent.com/VisualMusicalMinds/Cartoon_Notation/refs/heads/main/Cartoon%20Rhythm0008.png";
  wrapper.appendChild(img);
  const div = document.createElement("div");
  div.classList.add("cell");
  div.dataset.index = i;
  if (i === 0) div.textContent = '1';
  if (i === 2) div.textContent = '&';
  if (i === 4) div.textContent = '2';
  if (i === 6) div.textContent = '&';
  if (i === 8) div.textContent = '3';
  if (i === 10) div.textContent = '&';
  if (i === 12) div.textContent = '4';
  if (i === 14) div.textContent = '&';
  wrapper.appendChild(div);
  grid.appendChild(wrapper);

  div.addEventListener("click", () => {
    // Remove a placed box if tapped/clicked with nothing selected
    if (!div.dataset.permanent || selectedLength !== null) return;

    const startIndex = parseInt(div.dataset.index);
    const boxIndex = boxes.findIndex(box => startIndex >= box.start && startIndex < box.start + box.length);
    if (boxIndex === -1) return;

    const box = boxes[boxIndex];
    for (let j = 0; j < box.length; j++) {
      const cell = cells[box.start + j];
      cell.classList.remove("green-primary", "green-secondary", "orange-primary", "orange-secondary", "purple");
      delete cell.dataset.permanent;
      delete cell.dataset.color;
    }

    boxes.splice(boxIndex, 1);
    updateImageRow();
  });

  cells.push(div);
}

// ---- TAP/CLICK-TO-SELECT, CLICK-TO-PLACE (NO DRAG) ----
let selectedLength = null;
let selectedColor = null;

// Select from library
document.querySelectorAll(".draggable").forEach(box => {
  box.addEventListener("click", function() {
    selectedLength = parseInt(box.dataset.length);
    selectedColor = box.dataset.color;
    document.querySelectorAll(".draggable").forEach(b => b.classList.remove("selected"));
    box.classList.add("selected");
  });
});

// Place on grid
cells.forEach((cell, idx) => {
  cell.addEventListener("click", function() {
    // Don't overwrite if clicking to remove a box:
    if (cell.dataset.permanent && selectedLength === null) return;
       
    // === SHAKING IF IT WON'T FIT ===
    if (
      selectedLength && selectedColor &&
      (
        idx + selectedLength > totalSteps ||
        cells.slice(idx, idx + selectedLength).some(c => c.dataset.permanent)
      )
    ) {
      grid.classList.add("shake");
      setTimeout(() => grid.classList.remove("shake"), 300);
      return; // Don't attempt to place
    }

    if (
      selectedLength && selectedColor &&
      idx + selectedLength <= totalSteps &&
      cells.slice(idx, idx + selectedLength).every(c => !c.dataset.permanent)
    ) {
      for (let i = 0; i < selectedLength; i++) {
        const c = cells[idx + i];
        c.dataset.permanent = "true";
        c.dataset.color = selectedColor;
        if (selectedColor === "green") {
          c.classList.add(i === 0 ? "green-primary" : "green-secondary");
        } else if (selectedColor === "orange") {
          c.classList.add(i === 0 ? "orange-primary" : "orange-secondary");
        } else if (selectedColor === "purple") {
          c.classList.add("purple");
        }
      }
      boxes.push({ start: idx, length: selectedLength, color: selectedColor });
      updateImageRow();
      document.querySelectorAll(".draggable").forEach(b => b.classList.remove("selected"));
      selectedLength = null;
      selectedColor = null;
    }
  });
});

// ---- CLICK OUTSIDE GRID: REMOVE HIGHLIGHTS ----
document.addEventListener('click', (event) => {
  let target = event.target;
  while (target) {
    if (target === grid) {
      return; // Click was inside the grid
    }
    target = target.parentNode;
  }
  // Click was outside the grid
  cells.forEach(cell => {
    if (!cell.dataset.permanent) {
      cell.classList.remove("green-primary", "green-secondary", "orange-primary", "orange-secondary", "purple");
    }
  });
});
