/* 
  Tema 1 — Program de desenare raster (canvas)
*/

/* ----- Selectoare HTML ----- */
const canvas = document.getElementById('canvas');        // referință la canvas
const ctx = canvas.getContext('2d');                     // contextul 2D pentru desenare

const toolSelect = document.getElementById('tool');      // dropdown instrument (linie/rect/elipsă)
const strokeColorInput = document.getElementById('culoare_linie');  // culoare contur
const fillColorInput = document.getElementById('culoare_umplere');  // culoare umplere
const lineWidthRange = document.getElementById('lineWidth');        // slider grosime linie
const lineWidthValue = document.getElementById('lineWidthValue');   // afișare numerică grosime

const bgColorInput = document.getElementById('bgColor'); // input culoare background canvas
const applyBgBtn = document.getElementById('applyBg');   // buton aplicare background

const clearBtn = document.getElementById('clear');       // buton clear canvas
const exportPNGBtn = document.getElementById('exportPNG');   // export PNG
const exportJPEGBtn = document.getElementById('exportJPEG'); // export JPEG
const exportSVGBtn = document.getElementById('exportSVG');   // export SVG

const shapeList = document.getElementById('shapeList');  // lista figurilor desenate

// Selectoare pentru editarea figurii selectate
const editIndex = document.getElementById('editIndex');  // ID figură selectată
const editX1 = document.getElementById('editX1');        // coordonată x1
const editY1 = document.getElementById('editY1');        // coordonată y1
const editX2 = document.getElementById('editX2');        // coordonată x2 / lățime / rx
const editY2 = document.getElementById('editY2');        // coordonată y2 / înălțime / ry
const editStroke = document.getElementById('editStroke');// culoare contur
const editFill = document.getElementById('editFill');    // culoare umplere
const editWidth = document.getElementById('editWidth');  // grosime linie
const applyEditBtn = document.getElementById('applyEdit'); // aplică modificări
const deleteSelectedBtn = document.getElementById('deleteSelected'); // șterge figura selectată

/* ----- Variabile interne ----- */
let drawing = false;           // dacă utilizatorul ține mouse-ul apăsat
let startX = 0, startY = 0;    // punctul de start al desenării
let currentX = 0, currentY = 0;// poziția curentă a mouse-ului
let tempShape = null;          // copia temporară pentru editare live
let selectedIndex = null;      // indexul figurii selectate

const shapes = []; // lista tuturor figurilor desenate

/* ----- Funcții utilitare ----- */
function getMousePos(canvas, evt) {
  const rect = canvas.getBoundingClientRect(); // poziția canvasului în pagină
  return {
    // transformă coordonatele mouse-ului în coordonate reale ale canvasului
    x: Math.round((evt.clientX - rect.left) * (canvas.width / rect.width)),
    y: Math.round((evt.clientY - rect.top) * (canvas.height / rect.height))
  };
}

function cloneShape(s) {
  // creează o copie profundă a unei figuri (folosită pentru preview la editare)
  return {
    type: s.type,
    x1: s.x1,
    y1: s.y1,
    x2: s.x2,
    y2: s.y2,
    stroke: s.stroke,
    fill: s.fill,
    width: s.width
  };
}

function updateTempShape() {
  if (tempShape === null) return; // dacă nu e selectată nicio figură, ieșim

  const w = parseInt(editWidth.value);
  if (!isNaN(w) && w >= 1 && w <= 110) {
    tempShape.width = w; // actualizează grosimea doar dacă e validă
  }

  // actualizează coordonatele și culorile din formular
  tempShape.x1 = parseInt(editX1.value) || tempShape.x1;
  tempShape.y1 = parseInt(editY1.value) || tempShape.y1;
  tempShape.x2 = parseInt(editX2.value) || tempShape.x2;
  tempShape.y2 = parseInt(editY2.value) || tempShape.y2;
  tempShape.stroke = editStroke.value || tempShape.stroke;
  tempShape.fill = editFill.value || tempShape.fill;
  tempShape.width = parseInt(editWidth.value) || tempShape.width;

  redrawAllWithTemp(); // redesenează canvasul cu figura modificată temporar
}

function redrawAll(includePreview = false) {
  // șterge canvasul și aplică background-ul
  ctx.save();
  ctx.fillStyle = canvas.dataset.bgColor || "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  // desenează toate figurile salvate
  for (const s of shapes) {
    ctx.save();
    ctx.lineWidth = s.width;
    ctx.strokeStyle = s.stroke;
    ctx.fillStyle = s.fill || "transparent";

    ctx.beginPath();
    if (s.type === "line") {
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
    } else if (s.type === "rect") {
      ctx.rect(s.x1, s.y1, s.x2, s.y2);
    } else if (s.type === "ellipse") {
      ctx.ellipse(s.x1, s.y1, Math.abs(s.x2), Math.abs(s.y2), 0, 0, Math.PI * 2);
    }

    if (s.fill !== "transparent") ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // dacă utilizatorul desenează → afișăm preview-ul cu linii punctate
  if (includePreview && drawing) {
    const s = getPreviewShape();
    if (!s) return;

    ctx.save();
    ctx.setLineDash([6, 6]); // linie punctată pentru preview
    ctx.lineWidth = s.width;
    ctx.strokeStyle = s.stroke;
    ctx.fillStyle = s.fill;

    ctx.beginPath();
    if (s.type === "line") {
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
    } else if (s.type === "rect") {
      ctx.rect(s.x1, s.y1, s.x2, s.y2);
    } else if (s.type === "ellipse") {
      ctx.ellipse(s.x1, s.y1, Math.abs(s.x2), Math.abs(s.y2), 0, 0, Math.PI * 2);
    }

    if (s.fill !== "transparent") ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function redrawAllWithTemp() {
  // identic cu redrawAll, dar înlocuiește figura selectată cu versiunea temporară
  ctx.save();
  ctx.fillStyle = canvas.dataset.bgColor || "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  shapes.forEach((s, i) => {
    const fig = (i === selectedIndex && tempShape) ? tempShape : s;

    ctx.save();

    // evidențiere figură selectată
    if (i === selectedIndex) {
      ctx.lineWidth = fig.width + 4; // contur mai gros
      ctx.strokeStyle = "#007bff";   // contur albastru
    } else {
      ctx.lineWidth = fig.width;
      ctx.strokeStyle = fig.stroke;
    }

    ctx.fillStyle = fig.fill;

    ctx.beginPath();
    if (fig.type === "line") {
      ctx.moveTo(fig.x1, fig.y1);
      ctx.lineTo(fig.x2, fig.y2);
    } else if (fig.type === "rect") {
      ctx.rect(fig.x1, fig.y1, fig.x2, fig.y2);
    } else if (fig.type === "ellipse") {
      ctx.ellipse(fig.x1, fig.y1, Math.abs(fig.x2), Math.abs(fig.y2), 0, 0, Math.PI * 2);
    }

    if (fig.fill !== "transparent") ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
}

applyEditBtn.addEventListener("click", () => {
  // aplică modificările temporare ca modificări permanente
  if (tempShape && selectedIndex !== null) {
    shapes[selectedIndex] = cloneShape(tempShape);
    redrawAll();
    refreshShapeList();
  }
});

function getPreviewShape() {
  // generează o figură temporară în funcție de instrumentul selectat
  const type = toolSelect.value;
  const stroke = strokeColorInput.value;
  const fill = fillColorInput.value || "transparent";
  const width = parseInt(lineWidthRange.value);

  if (type === "line") {
    return { type, x1: startX, y1: startY, x2: currentX, y2: currentY, stroke, fill, width };
  }

  if (type === "rect") {
    const w = currentX - startX;
    const h = currentY - startY;
    return {
      type,
      x1: Math.min(startX, currentX),
      y1: Math.min(startY, currentY),
      x2: Math.abs(w),
      y2: Math.abs(h),
      stroke,
      fill,
      width
    };
  }

  if (type === "ellipse") {
    const cx = (startX + currentX) / 2; // centru elipsă
    const cy = (startY + currentY) / 2;
    const rx = Math.abs(currentX - startX) / 2; // raza X
    const ry = Math.abs(currentY - startY) / 2; // raza Y
    return { type, x1: cx, y1: cy, x2: rx, y2: ry, stroke, fill, width };
  }

  return null; // fallback
}


function refreshShapeList() {
  shapeList.innerHTML = ""; // golește lista înainte de reconstrucție

  shapes.forEach((s, idx) => {
    const li = document.createElement("li"); // creează un element <li>
    li.className = "list-group-item d-flex justify-content-between align-items-center"; // stil bootstrap

    if (idx === selectedIndex) {
      li.classList.add("selected-figure"); // evidențiază figura selectată
    }

    const text = document.createElement("span"); // textul cu numele figurii
    text.textContent = `${idx}. ${s.type}`;

    const del = document.createElement("button"); // buton ștergere figură
    del.className = "btn btn-sm btn-danger";
    del.textContent = "Șterge";
    del.onclick = (e) => {
      e.stopPropagation(); // previne selectarea figurii când apeși Șterge
      shapes.splice(idx, 1); // șterge figura din array
      selectedIndex = null;  // deselectează orice figură
      tempShape = null;      // elimină preview-ul temporar
      redrawAll();           // redesenează canvasul
      refreshShapeList();    // actualizează lista
    };

    li.onclick = () => {
      selectedIndex = idx;               // setează figura selectată
      tempShape = cloneShape(shapes[idx]); // copie temporară pentru editare live

      // completează formularul cu valorile figurii
      editIndex.value = idx;
      editX1.value = tempShape.x1;
      editY1.value = tempShape.y1;
      editX2.value = tempShape.x2;
      editY2.value = tempShape.y2;
      editStroke.value = tempShape.stroke;
      editFill.value = tempShape.fill;
      editWidth.value = tempShape.width;

      redrawAllWithTemp(); // redesenează cu evidențiere
      refreshShapeList();  // reface lista cu highlight
    };

    li.appendChild(text); // adaugă textul în li
    li.appendChild(del);  // adaugă butonul de ștergere
    shapeList.appendChild(li); // adaugă li în listă
  });
}


editIndex.addEventListener("input", () => {
  const maxIndex = shapes.length - 1; // ultimul index valid
  let raw = editIndex.value;

  // dacă introduce litere → ștergem inputul
  if (!/^\d*$/.test(raw)) {
    editIndex.value = "";
    return;
  }

  let idx = parseInt(raw);

  if (isNaN(idx)) {
    editIndex.value = "";
    return;
  }

  // limitează indexul între 0 și maxIndex
  if (idx > maxIndex) idx = maxIndex;
  if (idx < 0) idx = 0;

  editIndex.value = idx; // rescrie valoarea corectată

  selectedIndex = idx; // selectează figura
  tempShape = cloneShape(shapes[idx]); // copie temporară

  // actualizează formularul
  editX1.value = tempShape.x1;
  editY1.value = tempShape.y1;
  editX2.value = tempShape.x2;
  editY2.value = tempShape.y2;
  editStroke.value = tempShape.stroke;
  editFill.value = tempShape.fill;
  editWidth.value = tempShape.width;

  redrawAllWithTemp(); // redesenează cu highlight
});


/* ----- Evenimente mouse ----- */
canvas.addEventListener("mousedown", (evt) => {
  drawing = true; // începe desenarea
  const pos = getMousePos(canvas, evt); // poziția mouse-ului în coordonate canvas
  startX = pos.x; // punct de start
  startY = pos.y;
  currentX = pos.x; // inițial, punctul curent = punctul de start
  currentY = pos.y;
});

canvas.addEventListener("mousemove", (evt) => {
  if (!drawing) return; // dacă nu desenăm, ieșim
  const pos = getMousePos(canvas, evt);
  currentX = pos.x; // actualizează poziția curentă
  currentY = pos.y;
  redrawAll(true); // redesenează cu preview punctat
});

window.addEventListener("mouseup", () => {
  if (!drawing) return;
  drawing = false; // finalizează desenarea

  const shape = getPreviewShape(); // generează forma finală
  if (shape) {
    shapes.push(shape); // o adaugă în lista de figuri
    redrawAll();        // redesenează canvasul
    refreshShapeList(); // actualizează lista
  }
});


/* ----- UI ----- */
lineWidthRange.addEventListener("input", () => {
  lineWidthValue.textContent = lineWidthRange.value; // actualizează textul grosimii
});

applyBgBtn.addEventListener("click", () => {
  canvas.dataset.bgColor = bgColorInput.value; // salvează culoarea în dataset
  redrawAll(); // redesenează canvasul cu noul background
});

clearBtn.addEventListener("click", () => {
  shapes.length = 0; // șterge toate figurile
  redrawAll();
  refreshShapeList();
});

/* ----- Export PNG/JPEG ----- */
function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement("a"); // creează link de descărcare
  a.href = dataUrl;                      // conținutul imaginii
  a.download = filename;                 // numele fișierului
  a.click();                             // declanșează descărcarea
}

exportPNGBtn.addEventListener("click", () => {
  redrawAll(); // asigură că desenul e final

  let name = prompt("Introduceți numele fișierului (fără extensie):", "desen");
  if (!name) return;

  downloadDataUrl(canvas.toDataURL("image/png"), name + ".png");
});

exportJPEGBtn.addEventListener("click", () => {
  redrawAll();

  let name = prompt("Introduceți numele fișierului (fără extensie):", "desen");
  if (!name) return;

  downloadDataUrl(canvas.toDataURL("image/jpeg", 0.92), name + ".jpg");
});

/* ----- Export SVG ----- */
exportSVGBtn.addEventListener("click", () => {
  let name = prompt("Introduceți numele fișierului (fără extensie):", "desen");
  if (!name) return;

  const bg = canvas.dataset.bgColor || "#ffffff"; // culoare fundal
  const w = canvas.width, h = canvas.height;      // dimensiuni canvas

  let svg = `<?xml version="1.0" encoding="UTF-8"?>`; // header SVG
  svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">`;
  svg += `<rect width="${w}" height="${h}" fill="${bg}"/>`; // fundal

  // exportă fiecare figură în format SVG
  for (const s of shapes) {
    if (s.type === "line") {
      svg += `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="${s.stroke}" stroke-width="${s.width}" />`;
    } else if (s.type === "rect") {
      svg += `<rect x="${s.x1}" y="${s.y1}" width="${s.x2}" height="${s.y2}" stroke="${s.stroke}" stroke-width="${s.width}" fill="${s.fill}" />`;
    } else if (s.type === "ellipse") {
      svg += `<ellipse cx="${s.x1}" cy="${s.y1}" rx="${s.x2}" ry="${s.y2}" stroke="${s.stroke}" stroke-width="${s.width}" fill="${s.fill}" />`;
    }
  }

  svg += `</svg>`;

  const blob = new Blob([svg], { type: "image/svg+xml" }); // creează fișierul
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, name + ".svg"); // descarcă
  setTimeout(() => URL.revokeObjectURL(url), 1000); // curăță memoria
});


editX1.addEventListener("input", updateTempShape);
editY1.addEventListener("input", updateTempShape);
editX2.addEventListener("input", updateTempShape);
editY2.addEventListener("input", updateTempShape);
editStroke.addEventListener("input", updateTempShape);
editFill.addEventListener("input", updateTempShape);
editWidth.addEventListener("input", updateTempShape);

/* ----- Editare figură ----- */
applyEditBtn.addEventListener("click", () => {
  const idx = parseInt(editIndex.value);

  // verificăm dacă indexul este valid
  if (isNaN(idx) || idx < 0 || idx >= shapes.length) {
    alert("Index invalid");
    return;
  }

  const s = shapes[idx]; // figura care va fi modificată

  // actualizăm grosimea doar dacă este validă
  const newWidth = parseInt(editWidth.value);
  if (!isNaN(newWidth) && newWidth >= 1 && newWidth <= 110) {
    s.width = newWidth;
  }

  // actualizăm coordonatele dacă sunt completate
  if (editX1.value !== "") s.x1 = parseInt(editX1.value);
  if (editY1.value !== "") s.y1 = parseInt(editY1.value);
  if (editX2.value !== "") s.x2 = parseInt(editX2.value);
  if (editY2.value !== "") s.y2 = parseInt(editY2.value);

  // actualizăm culorile
  if (editStroke.value) s.stroke = editStroke.value;
  if (editFill.value) s.fill = editFill.value;

  redrawAll();        // redesenează canvasul cu modificările permanente
  refreshShapeList(); // actualizează lista
});

deleteSelectedBtn.addEventListener("click", () => {
  const idx = parseInt(editIndex.value);
  if (isNaN(idx) || idx < 0 || idx >= shapes.length) {
    alert("Index invalid");
    return;
  }
  shapes.splice(idx, 1); // șterge figura
  redrawAll();
  refreshShapeList();
});


/* ----- Init ----- */
(function init() {
  canvas.dataset.bgColor = "#ffffff"; // fundal implicit
  lineWidthValue.textContent = lineWidthRange.value; // afișează grosimea inițială
  redrawAll(); // desenează canvasul gol
})();

