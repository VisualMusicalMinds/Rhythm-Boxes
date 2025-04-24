// JS: Place this in the CodePen JS panel (no <script> tags)
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

const ctx = new (window.AudioContext || window.webkitAudioContext)();
const masterGain = ctx.createGain();
masterGain.gain.value = 1;
masterGain.connect(ctx.destination);

document.getElementById("volumeControl").addEventListener("input", e => {
  masterGain.gain.value = parseFloat(e.target.value);
});

document.getElementById("tempoInput").addEventListener("change", e => {
  bpm = parseInt(e.target.value);
  if (bpm < 30) bpm = 30;
  if (bpm > 300) bpm = 300;
  e.target.value = bpm;
  if (isPlaying) {
    clearInterval(interval);
    interval = setInterval(playStep, (60000 / bpm) / 4);
  }
});

function playTick() {
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

function playTone() {
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

function highlightImage(cell) {
  const img = cell.parentElement.querySelector('.cell-image');
  if (img) {
    img.classList.add('highlight');
    setTimeout(() => img.classList.remove('highlight'), (60000 / bpm) / 4);
  }
}

function playStep() {
  cells.forEach(cell => cell.classList.remove("highlight"));
  const currentGroupStart = Math.floor(currentStep / 4) * 4;
  const currentPairStart = currentStep % 2 === 0 ? currentStep : currentStep - 1;
  const group = cells.slice(currentGroupStart, currentGroupStart + 4);
  const pair = [cells[currentPairStart], cells[currentPairStart + 1]];
  const allGroupEmpty = group.every(c => !c.dataset.permanent);
  const bothPairEmpty = pair.every(c => !c.dataset.permanent);

  if ([0, 4, 8, 12].includes(currentStep)) playTick();

  const box = boxes.find(b => b.start === currentStep);
  if (box) {
    for (let i = 0; i < box.length; i++) {
      const cell = cells[box.start + i];
      cell.classList.add("highlight");
      highlightImage(cell);
    }
    playTone();
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

function togglePlay() {
  if (isPlaying) {
    clearInterval(interval);
    isPlaying = false;
    currentStep = 0;
    cells.forEach(cell => cell.classList.remove("highlight"));
  } else {
    interval = setInterval(playStep, (60000 / bpm) / 4);
    isPlaying = true;
  }
}

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

// Create cells and grid
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
    if (!div.dataset.permanent) return;

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

// Drag-and-drop support (mouse)
document.querySelectorAll(".draggable").forEach(box => {
  box.addEventListener("dragstart", e => {
    currentLength = parseInt(box.dataset.length);
    currentColor = box.dataset.color;
    e.dataTransfer.setData("text/plain", box.dataset.length);
    e.dataTransfer.effectAllowed = "copy";
  });
});

grid.addEventListener("dragover", e => {
  e.preventDefault();
  const gridRect = grid.getBoundingClientRect();
  const offsetX = e.clientX - gridRect.left;
  const firstCell = document.querySelector('.cell');
  const cellWidth = firstCell ? firstCell.getBoundingClientRect().width : 32.5;
  const index = Math.floor(offsetX / cellWidth);

  cells.forEach((cell, i) => {
    if (!cell.dataset.permanent) {
      cell.classList.remove("green-primary", "green-secondary", "orange-primary", "orange-secondary", "purple");
    }
  });

  if (index + currentLength <= totalSteps && cells.slice(index, index + currentLength).every(c => !c.dataset.permanent)) {
    for (let i = 0; i < currentLength; i++) {
      const cell = cells[index + i];
      if (currentColor === "green") {
        cell.classList.add(i === 0 ? "green-primary" : "green-secondary");
      } else if (currentColor === "orange") {
        cell.classList.add(i === 0 ? "orange-primary" : "orange-secondary");
      } else if (currentColor === "purple") {
        cell.classList.add("purple");
      }
    }
  }
});

grid.addEventListener("drop", e => {
  e.preventDefault();
  const gridRect = grid.getBoundingClientRect();
  const offsetX = e.clientX - gridRect.left;
  const firstCell = document.querySelector('.cell');
  const cellWidth = firstCell ? firstCell.getBoundingClientRect().width : 32.5;
  const index = Math.floor(offsetX / cellWidth);

  cells.forEach((cell, i) => {
    if (!cell.dataset.permanent) {
      cell.classList.remove("green-primary", "green-secondary", "orange-primary", "orange-secondary", "purple");
    }
  });

  if (index + currentLength > totalSteps || cells.slice(index, index + currentLength).some(c => c.dataset.permanent)) {
    grid.classList.add("shake");
    setTimeout(() => grid.classList.remove("shake"), 300);
    return;
  }

  for (let i = 0; i < currentLength; i++) {
    const cell = cells[index + i];
    if (currentColor === "green") {
      cell.classList.add(i === 0 ? "green-primary" : "green-secondary");
    } else if (currentColor === "orange") {
      cell.classList.add(i === 0 ? "orange-primary" : "orange-secondary");
    } else if (currentColor === "purple") {
      cell.classList.add("purple");
    }
    cell.dataset.permanent = "true";
    cell.dataset.color = currentColor;
  }
  boxes.push({ start: index, length: currentLength, color: currentColor });
  updateImageRow();
});

// Touch/Smartboard Drag and Drop Support
let touchDragging = false;
let touchDragElement = null;
let dragPreview = null;

document.querySelectorAll(".draggable").forEach(box => {
  box.addEventListener('touchstart', function(e) {
    e.preventDefault();
    touchDragging = true;
    touchDragElement = box;
    currentLength = parseInt(box.dataset.length);
    currentColor = box.dataset.color;
    // Create drag preview
    dragPreview = box.cloneNode(true);
    dragPreview.style.position = 'fixed';
    dragPreview.style.pointerEvents = 'none';
    dragPreview.style.opacity = 0.7;
    dragPreview.style.zIndex = 1000;
    document.body.appendChild(dragPreview);
    const touch = e.touches[0];
    dragPreview.style.left = `${touch.clientX - box.offsetWidth/2}px`;
    dragPreview.style.top = `${touch.clientY - box.offsetHeight/2}px`;
  });
});

document.addEventListener('touchmove', function(e) {
  if (!touchDragging || !dragPreview) return;
  const touch = e.touches[0];
  dragPreview.style.left = `${touch.clientX - dragPreview.offsetWidth/2}px`;
  dragPreview.style.top = `${touch.clientY - dragPreview.offsetHeight/2}px`;

  // Show highlight on grid
  const gridRect = grid.getBoundingClientRect();
  if (
    touch.clientX >= gridRect.left && touch.clientX <= gridRect.right &&
    touch.clientY >= gridRect.top && touch.clientY <= gridRect.bottom
  ) {
    const offsetX = touch.clientX - gridRect.left;
    const firstCell = document.querySelector('.cell');
    const cellWidth = firstCell ? firstCell.getBoundingClientRect().width : 32.5;
    const index = Math.floor(offsetX / cellWidth);

    cells.forEach((cell, i) => {
      if (!cell.dataset.permanent) {
        cell.classList.remove("green-primary", "green-secondary", "orange-primary", "orange-secondary", "purple");
      }
    });

    if (index + currentLength <= totalSteps && cells.slice(index, index + currentLength).every(c => !c.dataset.permanent)) {
      for (let i = 0; i < currentLength; i++) {
        const cell = cells[index + i];
        if (currentColor === "green") {
          cell.classList.add(i === 0 ? "green-primary" : "green-secondary");
        } else if (currentColor === "orange") {
          cell.classList.add(i === 0 ? "orange-primary" : "orange-secondary");
        } else if (currentColor === "purple") {
          cell.classList.add("purple");
        }
      }
    }
  }
});

document.addEventListener('touchend', function(e) {
  if (!touchDragging) return;
  // Remove preview
  if (dragPreview) {
    document.body.removeChild(dragPreview);
    dragPreview = null;
  }
  // Try to drop if over grid
  const touch = e.changedTouches[0];
  const gridRect = grid.getBoundingClientRect();
  if (
    touch.clientX >= gridRect.left && touch.clientX <= gridRect.right &&
    touch.clientY >= gridRect.top && touch.clientY <= gridRect.bottom
  ) {
    const offsetX = touch.clientX - gridRect.left;
    const firstCell = document.querySelector('.cell');
    const cellWidth = firstCell ? firstCell.getBoundingClientRect().width : 32.5;
    const index = Math.floor(offsetX / cellWidth);

    cells.forEach((cell, i) => {
      if (!cell.dataset.permanent) {
        cell.classList.remove("green-primary", "green-secondary", "orange-primary", "orange-secondary", "purple");
      }
    });

    if (index + currentLength > totalSteps || cells.slice(index, index + currentLength).some(c => c.dataset.permanent)) {
      grid.classList.add("shake");
      setTimeout(() => grid.classList.remove("shake"), 300);
      touchDragging = false;
      touchDragElement = null;
      return;
    }
    for (let i = 0; i < currentLength; i++) {
      const cell = cells[index + i];
      if (currentColor === "green") {
        cell.classList.add(i === 0 ? "green-primary" : "green-secondary");
      } else if (currentColor === "orange") {
        cell.classList.add(i === 0 ? "orange-primary" : "orange-secondary");
      } else if (currentColor === "purple") {
        cell.classList.add("purple");
      }
      cell.dataset.permanent = "true";
      cell.dataset.color = currentColor;
    }
    boxes.push({ start: index, length: currentLength, color: currentColor });
    updateImageRow();
  }
  touchDragging = false;
  touchDragElement = null;
});

// Cleanup highlight when clicking outside grid
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
