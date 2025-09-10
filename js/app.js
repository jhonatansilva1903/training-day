// Training Day — script.js (com seleção de treino para exportar)
// Mantém DnD, renomear treinos, combobox, séries, timer, PR/XP, responsivo.
// Exportar treino abre modal para escolher QUAL treino e gera PDF com os cards como no site.

(function () {
  "use strict";

  // ===== Utils / Compat =====
  function deepClone(obj) {
    try {
      if (typeof structuredClone === "function") return structuredClone(obj);
    } catch (_) {}
    // Fallback simples (suficiente para o SEED e estado)
    return JSON.parse(JSON.stringify(obj));
  }

  function mmFromPx(px) {
    return (px / 96) * 25.4;
  }

  // ===== Constantes =====
  const SEED =
    window.__SEED__ || {
      "Treino A": [
        "Supino reto com barra",
        "Supino inclinado com halteres",
        "Desenvolvimento militar",
        "Elevação lateral",
        "Tríceps testa",
        "Prancha",
      ],
      "Treino B": [
        "Remada curvada",
        "Puxada na frente (pulldown)",
        "Rosca direta",
        "Abdominal crunch",
      ],
      "Treino C": [
        "Agachamento livre",
        "Leg press",
        "Cadeira extensora",
        "Cadeira flexora",
        "Panturrilha em pé",
      ],
    };
  const STORAGE_KEY = "training_day_state_v1";
  const PLAN_KEY = "training_day_plan_v3";

  const jsPDFRef = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : null;

  // ===== Combobox =====
  const EXERCISE_OPTIONS = [
    "Supino reto com barra",
    "Supino inclinado com barra",
    "Supino declinado com barra",
    "Supino reto com halteres",
    "Supino inclinado com halteres",
    "Crucifixo halteres",
    "Voador máquina",
    "Cross-over cabo alto",
    "Cross-over cabo baixo",
    "Puxada na frente (pulldown)",
    "Puxada aberta",
    "Puxada neutra",
    "Remada curvada",
    "Remada baixa",
    "Remada cavalinho",
    "Remada unilateral halter",
    "Pull-over",
    "Agachamento livre",
    "Agachamento smith",
    "Hack squat",
    "Leg press",
    "Cadeira extensora",
    "Cadeira flexora",
    "Stiff com halteres",
    "Stiff barra",
    "Panturrilha em pé",
    "Panturrilha sentado",
    "Desenvolvimento militar",
    "Desenvolvimento barra",
    "Elevação lateral",
    "Elevação frontal",
    "Remada alta",
    "Arnold press",
    "Rosca direta",
    "Rosca alternada",
    "Rosca martelo",
    "Rosca scott",
    "Rosca concentrada",
    "Cable Curl",
    "Tríceps testa",
    "Tríceps corda (pushdown)",
    "Mergulho paralelas",
    "Overhead triceps",
    "Kickback",
    "Abdominal crunch",
    "Abs Cable Crunch",
    "Prancha",
    "Elevação de pernas",
    "Puxador alto",
    "Bar cable row",
    "Reverse grip pull down",
    "Novo exercício"
  ];

  const DEFAULT_META = {
    "Supino reto com barra": { defaultSets: 3, defaultReps: "8-10", defaultLoadKg: 20 },
    "Supino inclinado com halteres": { defaultSets: 3, defaultReps: "8-10", defaultLoadKg: 20 },
    "Desenvolvimento militar": { defaultSets: 3, defaultReps: "8-10", defaultLoadKg: 10 },
    "Elevação lateral": { defaultSets: 3, defaultReps: "12-15", defaultLoadKg: 5 },
    "Tríceps testa": { defaultSets: 3, defaultReps: "12", defaultLoadKg: 15 },
    "Remada curvada": { defaultSets: 3, defaultReps: "8-10", defaultLoadKg: 30 },
    "Puxada na frente (pulldown)": { defaultSets: 3, defaultReps: "8-10", defaultLoadKg: 30 },
    "Rosca direta": { defaultSets: 3, defaultReps: "12", defaultLoadKg: 20 },
    "Prancha": { defaultSets: 3, defaultReps: "30", defaultLoadKg: 0 },
    "Abdominal crunch": { defaultSets: 3, defaultReps: "15", defaultLoadKg: 0 },
    "Agachamento livre": { defaultSets: 3, defaultReps: "8", defaultLoadKg: 20 },
    "Leg press": { defaultSets: 3, defaultReps: "10", defaultLoadKg: 60 },
    "Cadeira extensora": { defaultSets: 3, defaultReps: "12", defaultLoadKg: 20 },
    "Cadeira flexora": { defaultSets: 3, defaultReps: "12", defaultLoadKg: 20 },
    "Panturrilha em pé": { defaultSets: 4, defaultReps: "15-20", defaultLoadKg: 25 },
  };

  (function ensureExerciseOptions() {
    const dl = document.getElementById("exerciseOptions");
    if (!dl) return;
    dl.innerHTML = "";
    EXERCISE_OPTIONS.forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt;
      dl.appendChild(o);
    });
  })();

  // ===== Estado/Persistência =====
  let state = loadState();
  let plan = loadPlan();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : { logs: {}, prs: {} };
    } catch {
      return { logs: {}, prs: {} };
    }
  }
  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadPlan() {
    try {
      const raw = localStorage.getItem(PLAN_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { __order: Object.keys(SEED), days: deepClone(SEED) };
  }
  function savePlan() {
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  }
  function getDayOrder() {
    const order = plan.__order && Array.isArray(plan.__order) ? plan.__order : Object.keys(plan.days);
    return order.filter((d) => d && plan.days[d]);
  }

  // ===== Cálculos =====
  const volume = (load, reps) => (Number(load) || 0) * (Number(reps) || 0);
  const targetFor = (pr) => Math.max(pr * 1.1, pr + 5, 20);
  const progressPct = (vol, pr) => {
    const target = targetFor(pr);
    return Math.min(100, Math.round(target ? (vol / target) * 100 : 0));
  };
  const keyOf = (day, name) => `${day}::${name}`;
  const lastLog = (id) => (state.logs[id] || []).slice(-1)[0] || null;

  function seedDefaults() {
    if (localStorage.getItem(STORAGE_KEY) || localStorage.getItem(PLAN_KEY)) return;
    Object.keys(plan.days).forEach((day) => {
      plan.days[day].forEach((name) => {
        const meta = DEFAULT_META[name];
        if (!meta) return;
        const id = keyOf(day, name);
        const firstReps = parseInt(String(meta.defaultReps).split(/[^0-9]/)[0], 10) || 0;
        const vol = volume(meta.defaultLoadKg, firstReps);
        if (!state.logs[id]) state.logs[id] = [];
        state.logs[id].push({
          date: new Date().toISOString().slice(0, 10),
          load: meta.defaultLoadKg,
          reps: firstReps,
          sets: meta.defaultSets,
          volume: vol,
        });
        state.prs[id] = vol;
      });
    });
    saveState();
    localStorage.setItem('td:schemaVersion', '2');
    localStorage.setItem('td:data:v2', JSON.stringify(plan));
    savePlan();
  }

  seedDefaults();

  // ===== Seletores =====
  const tabs = document.getElementById("daysTabs");
  const cardsBox = document.getElementById("cards");
  const addBtn = document.getElementById("addExerciseBtn");
  const saveBtn = document.getElementById("saveDay");
  const resetBtn = document.getElementById("resetWeek");
  const exportBtn = document.getElementById("exportPdfBtn");
  const manageBtn = document.getElementById("manageTrainingsBtn");

  // Export modal
  const exportModal = document.getElementById("exportModal");
  const exportClose = document.getElementById("exportClose");
  const exportSelect = document.getElementById("exportSelect");
  const exportConfirm = document.getElementById("exportConfirm");

  let currentDay = getDayOrder()[0] || "Treino A";
  let editingCardId = null;

  // ===== Abas (DnD) =====
  function renderTabs() {
    tabs.innerHTML = "";
    getDayOrder().forEach((d) => {
      const btn = document.createElement("button");
      btn.className =
        "glass rounded-xl px-3 py-2 text-sm hover:bg-gray-800 border border-gray-700";
      btn.textContent = d;
      btn.dataset.day = d;
      btn.draggable = true;
      btn.addEventListener("click", () => setDay(d));
      btn.addEventListener("dragstart", onDayDragStart);
      btn.addEventListener("dragover", onDayDragOver);
      btn.addEventListener("drop", onDayDrop);
      if (d === currentDay) btn.classList.add("tab-active");
      tabs.appendChild(btn);
    });
  }
  let draggedDay = null;
  function onDayDragStart(e) {
    draggedDay = e.currentTarget.dataset.day;
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.classList.add("dragging");
  }
  function onDayDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }
  function onDayDrop(e) {
    e.preventDefault();
    const targetDay = e.currentTarget.dataset.day;
    if (!draggedDay || draggedDay === targetDay) return;
    const order = getDayOrder();
    const from = order.indexOf(draggedDay);
    const to = order.indexOf(targetDay);
    order.splice(to, 0, order.splice(from, 1)[0]);
    plan.__order = order;
    savePlan();
    renderTabs();
    setDay(draggedDay);
  }
  tabs.addEventListener("dragend", () => {
    tabs.querySelectorAll("button").forEach((b) => b.classList.remove("dragging"));
  });

  // ===== Render treino atual =====
  function setDay(day) {
    currentDay = day;
    editingCardId = null;
    document.getElementById("dayTitle").textContent = day;
    document.querySelectorAll("#daysTabs button").forEach((b) => {
      if (b.dataset.day === day) b.classList.add("tab-active");
      else b.classList.remove("tab-active");
    });
    renderCards(day);
    updateDayXP();
  }

  function renderCards(day) {
    cardsBox.innerHTML = "";
    const list = plan.days[day] || [];
    document.getElementById("exerciseCount").textContent = `${list.length} exercícios`;

    list.forEach((name, index) => {
      const id = keyOf(day, name);
      const last = lastLog(id);
      const pr = state.prs[id] || 0;
      const vol = last ? last.volume : 0;
      const pct = progressPct(vol, pr);

      const card = document.createElement("div");
      card.className = "card p-4 rounded-2xl";
      card.setAttribute("draggable", "true");
      card.dataset.name = name;
      card.dataset.index = index;

      // DnD card
      card.addEventListener("dragstart", onCardDragStart);
      card.addEventListener("dragover", onCardDragOver);
      card.addEventListener("drop", onCardDrop);
      card.addEventListener("dragenter", () => card.classList.add("drop-target"));
      card.addEventListener("dragleave", () => card.classList.remove("drop-target"));
      card.addEventListener("dragend", () => card.classList.remove("drop-target", "dragging"));

      const isEditing = editingCardId === id;
      if (isEditing) {
        card.innerHTML = `
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <label class="text-xs text-gray-400">Exercício</label>
            <div class="flex items-center gap-2">
              <span class="cursor-grab select-none text-gray-500" title="Arraste para mover">≡</span>
              <input list="exerciseOptions" value="${name}" class="w-full rounded-lg bg-[#0b1220] border border-gray-700 px-3 py-2"
                     data-id="${id}" data-oldname="${name}" data-field="exerciseName" />
            </div>
            <p class="text-[11px] text-gray-500 mt-1">
              PR: <span data-pr="value">${Math.round(pr)}</span> • Volume atual:
              <span data-vol="value">${Math.round(vol)}</span>
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button title="Timer" class="px-2 py-2 rounded-xl btn-primary" onclick="openTimer('${name}')">⏱️</button>
            <button title="Excluir" class="px-2 py-2 rounded-xl btn-danger" onclick="deleteExercise('${day}','${name}')">🗑️</button>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3 mt-4">
          <label class="flex flex-col text-sm">
            <span class="text-gray-400">Carga (kg)</span>
            <span class="badge-metric mt-1" data-badge="load">${last ? (last.load ?? 0) : 0}</span>
            <input type="number" step="0.5" min="0" class="mt-1 rounded-lg bg-[#0b1220] border border-gray-700 px-3 py-2"
              value="${last ? (last.load ?? "") : ""}" data-id="${id}" data-field="load"/>
          </label>
          <label class="flex flex-col text-sm">
            <span class="text-gray-400">Repetições</span>
            <span class="badge-metric mt-1" data-badge="reps">${last ? (last.reps ?? 0) : 0}</span>
            <input type="number" step="1" min="0" class="mt-1 rounded-lg bg-[#0b1220] border border-gray-700 px-3 py-2"
              value="${last ? (last.reps ?? "") : ""}" data-id="${id}" data-field="reps"/>
          </label>
          <label class="flex flex-col text-sm">
            <span class="text-gray-400">Séries</span>
            <span class="badge-metric mt-1" data-badge="sets">${last ? (last.sets ?? 0) : 0}</span>
            <input type="number" step="1" min="0" class="mt-1 rounded-lg bg-[#0b1220] border border-gray-700 px-3 py-2"
              value="${last ? (last.sets ?? "") : ""}" data-id="${id}" data-field="sets"/>
          </label>
        </div>

        <div class="mt-4">
          <div class="flex items-center justify-between text-xs mb-1 text-gray-400">
            <span>XP do exercício</span>
            <span data-pct="label">${pct}%</span>
          </div>
          <div class="xpbar"><div class="xpfill" data-pct="bar" style="width:${pct}%"></div></div>
          <p class="text-xs text-gray-500 mt-2">Meta: <span data-target="value">${Math.round(targetFor(pr))}</span></p>
        </div>

        <div class="mt-4 flex flex-wrap gap-2 justify-end">
          <button class="px-3 py-2 rounded-xl glass border border-gray-700 hover:bg-gray-800" onclick="cancelEdit()">Cancelar</button>
          <button class="px-3 py-2 rounded-xl glass border border-gray-700 hover:bg-gray-800" onclick="resetExercise('${id}')">Resetar</button>
          <button class="px-3 py-2 rounded-2xl btn-primary font-semibold" onclick="saveExercise('${id}', this)">Salvar</button>
        </div>
      `;
      } else {
        card.innerHTML = `
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="cursor-grab select-none text-gray-500" title="Arraste para mover">≡</span>
              <span class="font-semibold">${name}</span>
            </div>
            <p class="text-[11px] text-gray-500 mt-1">
              PR: <span data-pr="value">${Math.round(pr)}</span> • Volume atual:
              <span data-vol="value">${Math.round(vol)}</span>
            </p>
            <div class="mt-2">
              ${last
                ? `<div class="flex flex-wrap gap-2">
                    <span class="badge-metric" data-badge="load">${last.load || 0}</span>
                    <span class="badge-metric" data-badge="reps">${last.reps || 0}</span>
                    <span class="badge-metric" data-badge="sets">${last.sets || 0}</span>
                  </div>`
                : `<span class="text-sm text-gray-500">Sem dados</span>`}
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button title="Editar" class="text-gray-500 hover:text-gray-200 px-1" onclick="startEdit('${id}')">✏️</button>
            <button title="Timer" class="px-2 py-2 rounded-xl btn-primary" onclick="openTimer('${name}')">⏱️</button>
            <button title="Excluir" class="px-2 py-2 rounded-xl btn-danger" onclick="deleteExercise('${day}','${name}')">🗑️</button>
          </div>
        </div>

        <div class="mt-4">
          <div class="flex items-center justify-between text-xs mb-1 text-gray-400">
            <span>XP do exercício</span>
            <span data-pct="label">${pct}%</span>
          </div>
          <div class="xpbar"><div class="xpfill" data-pct="bar" style="width:${pct}%"></div></div>
          <p class="text-xs text-gray-500 mt-2">Meta: <span data-target="value">${Math.round(targetFor(pr))}</span></p>
        </div>
      `;
      }
      cardsBox.appendChild(card);
    });

    // Inputs
    cardsBox.querySelectorAll("input").forEach((inp) => {
      if (inp.dataset.field === "exerciseName") inp.addEventListener("change", onRenameExercise);
      else inp.addEventListener("input", onLiveChange);
    });
  }

  let draggedCardIndex = null;
  function onCardDragStart(e) {
    const card = e.currentTarget;
    draggedCardIndex = Number(card.dataset.index);
    e.dataTransfer.effectAllowed = "move";
    card.classList.add("dragging");
  }
  function onCardDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }
  function onCardDrop(e) {
    e.preventDefault();
    const targetIndex = Number(e.currentTarget.dataset.index);
    if (draggedCardIndex === targetIndex) return;
    const arr = plan.days[currentDay];
    arr.splice(targetIndex, 0, arr.splice(draggedCardIndex, 1)[0]);
    savePlan();
    renderCards(currentDay);
    updateDayXP();
  }

  // ===== CRUD Exercícios =====
  addBtn.onclick = () => addExercise(currentDay);

  function addExercise(day) {
    plan.days[day] = plan.days[day] || [];
    let base = "Novo exercício";
    let name = base;
    let i = 2;
    while (plan.days[day].includes(name)) name = `${base} ${i++}`;
    plan.days[day].push(name);
    savePlan();
    renderCards(day);
  }

  function deleteExercise(day, name) {
    plan.days[day] = (plan.days[day] || []).filter((n) => n !== name);
    savePlan();
    const id = keyOf(day, name);
    if (state.logs && state.logs[id]) delete state.logs[id];
    if (state.prs && state.prs[id]) delete state.prs[id];
    saveState();
    renderCards(day);
    updateDayXP();
  }

  function onRenameExercise(e) {
    const input = e.target;
    const oldId = input.dataset.id;
    const oldName = input.dataset.oldname;
    const newName = (input.value || "").trim() || oldName;
    if (newName === oldName) return;

    const [day] = oldId.split("::");
    const arr = plan.days[day] || [];
    const idx = arr.indexOf(oldName);
    if (idx >= 0) arr[idx] = newName;

    const newId = keyOf(day, newName);
    if (!state.logs) state.logs = {};
    if (!state.prs) state.prs = {};
    state.logs[newId] = state.logs[oldId] || [];
    state.prs[newId] = state.prs[oldId] || 0;
    if (state.logs[oldId]) delete state.logs[oldId];
    if (state.prs[oldId]) delete state.prs[oldId];

    savePlan();
    saveState();
    renderCards(day);
  }

  // ===== Live + Salvar =====
  function onLiveChange(e) {
    const id = e.target.dataset.id;
    const card = e.target.closest(".card");
    const load = Number(card.querySelector('input[data-field="load"][data-id="' + id + '"]').value || 0);
    const reps = Number(card.querySelector('input[data-field="reps"][data-id="' + id + '"]').value || 0);
    const setsVal = Number(card.querySelector('input[data-field="sets"][data-id="' + id + '"]').value || 0);
    const vol = volume(load, reps);
    const pr = state.prs[id] || 0;
    const pct = progressPct(vol, pr);
      card.querySelector('[data-vol="value"]').textContent = Math.round(vol);
      card.querySelector('[data-target="value"]').textContent = Math.round(targetFor(pr));
      card.querySelector('[data-pct="label"]').textContent = pct + "%";
      card.querySelector('[data-pct="bar"]').style.width = pct + "%";
      const lb = card.querySelector('[data-badge="load"]');
      const rb = card.querySelector('[data-badge="reps"]');
      const sb = card.querySelector('[data-badge="sets"]');
      if (lb) lb.textContent = load || 0;
      if (rb) rb.textContent = reps || 0;
      if (sb) sb.textContent = setsVal || 0;
      updateDayXP();
  }

  function saveExercise(id, btnEl) {
    const card = btnEl.closest(".card");
    const titleInput = card.querySelector('input[data-field="exerciseName"]');
    const [day] = id.split("::");
    const name = titleInput.value.trim();
    const newId = keyOf(day, name);

    const load = Number(card.querySelector('input[data-field="load"]').value || 0);
    const reps = Number(card.querySelector('input[data-field="reps"]').value || 0);
    const sets = Number(card.querySelector('input[data-field="sets"]').value || 0);
    const vol = volume(load, reps);

    if (newId !== id) {
      // migração caso renomeado antes de salvar
      state.logs[newId] = state.logs[id] || [];
      state.prs[newId] = state.prs[id] || 0;
      if (state.logs[id]) delete state.logs[id];
      if (state.prs[id]) delete state.prs[id];
    }

    if (!state.logs[newId]) state.logs[newId] = [];
    state.logs[newId].push({
      date: new Date().toISOString().slice(0, 10),
      load,
      reps,
      sets,
      volume: vol
    });
    state.prs[newId] = Math.max(state.prs[newId] || 0, vol);
    saveState();

    const pr = state.prs[newId];
    const pct = progressPct(vol, pr);
    card.querySelector('[data-pr="value"]').textContent = Math.round(pr);
    card.querySelector('[data-vol="value"]').textContent = Math.round(vol);
    card.querySelector('[data-target="value"]').textContent = Math.round(targetFor(pr));
    card.querySelector('[data-pct="label"]').textContent = pct + "%";
    card.querySelector('[data-pct="bar"]').style.width = pct + "%";
    editingCardId = null;
    renderCards(currentDay);
    updateDayXP();
  }

  function resetExercise(id) {
    if (state.logs && state.logs[id]) delete state.logs[id];
    if (state.prs && state.prs[id]) delete state.prs[id];
    saveState();
    setDay(currentDay);
  }

  function startEdit(id) {
    editingCardId = id;
    renderCards(currentDay);
  }

  function cancelEdit() {
    editingCardId = null;
    renderCards(currentDay);
  }

  function updateDayXP() {
    const cards = document.querySelectorAll("#cards .card");
    let sum = 0, n = 0;
    cards.forEach((card) => {
      const val = parseInt(card.querySelector('[data-pct="label"]').textContent) || 0;
      sum += val;
      n++;
    });
    const avg = n ? Math.round(sum / n) : 0;
    document.getElementById("dayXP").style.width = avg + "%";
    document.getElementById("dayXPLabel").textContent = avg + "%";
  }

  // ===== Timer =====
  let timerRef = null, remaining = 0, timerLoop = 0;
  const timerModal = document.getElementById("timerModal");
  const timerExercise = document.getElementById("timerExercise");
  const timerDisplay = document.getElementById("timerDisplay");
  const timerStatus = document.getElementById("timerStatus");
  const timerMin = document.getElementById("timerMin");
  const timerSec = document.getElementById("timerSec");
  const timerLoopSel = document.getElementById("timerLoop");
  document.getElementById("timerStart").addEventListener("click", startTimer);
  document.getElementById("timerStop").addEventListener("click", stopTimer);
  document.getElementById("timerClose").addEventListener("click", closeTimer);
  timerModal.addEventListener("click", (e) => {
    if (e.target === timerModal) closeTimer();
  });

  function openTimer(name) {
    timerExercise.textContent = `Exercício: ${name}`;
    timerStatus.textContent = "Pronto";
    updateTimerDisplay(0);
    timerModal.classList.remove("hidden");
    timerModal.classList.add("flex");
  }
  function closeTimer() {
    stopTimer();
    timerModal.classList.add("hidden");
    timerModal.classList.remove("flex");
  }
  function startTimer() {
    const mins = Math.max(0, parseInt(timerMin.value || "0", 10));
    const secs = Math.max(0, Math.min(59, parseInt(timerSec.value || "0", 10)));
    timerLoop = parseInt(timerLoopSel.value || "0", 10);
    remaining = mins * 60 + secs || 60;
    timerStatus.textContent = "Contando...";
    clearInterval(timerRef);
    updateTimerDisplay(remaining);
    timerRef = setInterval(() => {
      remaining -= 1;
      updateTimerDisplay(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef);
        timerRef = null;
        timerStatus.textContent = timerLoop ? "Ciclo concluído — reiniciando" : "Concluído!";
        alert("Descanso finalizado!");
        if (timerLoop) startTimer();
      }
    }, 1000);
  }
  function stopTimer() {
    clearInterval(timerRef);
    timerRef = null;
    timerStatus.textContent = "Parado";
  }
  function updateTimerDisplay(total) {
    const mm = String(Math.max(0, Math.floor(total / 60))).padStart(2, "0");
    const ss = String(Math.max(0, total % 60)).padStart(2, "0");
    timerDisplay.textContent = `${mm}:${ss}`;
  }

  // Expor funções usadas inline
  window.openTimer = openTimer;
  window.resetExercise = resetExercise;
  window.deleteExercise = deleteExercise;
  window.saveExercise = saveExercise;
  window.startEdit = startEdit;
  window.cancelEdit = cancelEdit;

  // ===== Gerenciar treinos =====
  const daysModal = document.getElementById("daysModal");
  const daysClose = document.getElementById("daysClose");
  const newDayInput = document.getElementById("newDayInput");
  const addDayBtn = document.getElementById("addDayBtn");
  const daysList = document.getElementById("daysList");

  manageBtn.onclick = () => {
    renderDaysList();
    daysModal.classList.remove("hidden");
    daysModal.classList.add("flex");
  };
  daysClose.onclick = () => {
    daysModal.classList.add("hidden");
    daysModal.classList.remove("flex");
  };
  daysModal.addEventListener("click", (e) => {
    if (e.target === daysModal) daysClose.click();
  });

  addDayBtn.onclick = () => {
    const day = (newDayInput.value || "").trim();
    if (!day) return;
    if (plan.days[day]) {
      alert("Esse treino já existe.");
      return;
    }
    plan.days[day] = [];
    const order = getDayOrder();
    order.push(day);
    plan.__order = order;
    savePlan();
    renderTabs();
    setDay(day);
    renderDaysList();
    newDayInput.value = "";
  };

  function renderDaysList() {
    daysList.innerHTML = "";
    getDayOrder().forEach((d) => {
      const li = document.createElement("li");
      li.className = "flex items-center justify-between gap-2 glass rounded-xl border border-gray-700 px-3 py-2";
      li.innerHTML = `
        <input type="text" value="${d}" class="flex-1 rounded-lg bg-[#0b1220] border border-gray-700 px-3 py-2"/>
        <div class="flex items-center gap-2">
          <button class="px-3 py-1 rounded-lg glass border border-gray-700 hover:bg-gray-800">Renomear</button>
          <button class="px-3 py-1 rounded-lg glass border border-gray-700 hover:bg-gray-800">Excluir</button>
        </div>
      `;
      const input = li.querySelector("input");
      const [renameBtn, delBtn] = li.querySelectorAll("button");

      renameBtn.onclick = () => {
        const newName = (input.value || "").trim();
        if (!newName || newName === d) return;
        if (plan.days[newName]) {
          alert("Já existe um treino com esse nome.");
          return;
        }

        // migrar plano
        plan.days[newName] = plan.days[d] || [];
        delete plan.days[d];
        plan.__order = getDayOrder().map((x) => (x === d ? newName : x));

        // migrar dados de estado
        const newLogs = {};
        const newPrs = {};
        Object.keys(state.logs || {}).forEach((key) => {
          if (key.indexOf(d + "::") === 0)
            newLogs[newName + "::" + key.slice(d.length + 2)] = state.logs[key];
          else newLogs[key] = state.logs[key];
        });
        Object.keys(state.prs || {}).forEach((key) => {
          if (key.indexOf(d + "::") === 0)
            newPrs[newName + "::" + key.slice(d.length + 2)] = state.prs[key];
          else newPrs[key] = state.prs[key];
        });
        state.logs = newLogs;
        state.prs = newPrs;

        savePlan();
        saveState();
        if (currentDay === d) currentDay = newName;
        renderTabs();
        setDay(currentDay);
        renderDaysList();
      };

      delBtn.onclick = () => {
        const order = getDayOrder();
        if (order.length <= 1) {
          alert("Não é possível excluir o único treino.");
          return;
        }
        if (!confirm(`Excluir o treino "${d}"?`)) return;

        delete plan.days[d];
        plan.__order = order.filter((x) => x !== d);

        Object.keys(state.logs || {}).forEach((k) => {
          if (k.indexOf(d + "::") === 0) delete state.logs[k];
        });
        Object.keys(state.prs || {}).forEach((k) => {
          if (k.indexOf(d + "::") === 0) delete state.prs[k];
        });
        saveState();
        savePlan();

        if (currentDay === d) currentDay = getDayOrder()[0];
        renderTabs();
        setDay(currentDay);
        renderDaysList();
      };

      daysList.appendChild(li);
    });
  }

  // ===== Ações globais =====
  resetBtn.onclick = () => {
    if (confirm("Tem certeza que deseja limpar todos os dados (PR e histórico)?")) {
      state = { logs: {}, prs: {} };
      saveState();
      setDay(currentDay);
    }
  };

  saveBtn.onclick = () => {
    const list = plan.days[currentDay] || [];
    list.forEach((name) => {
      const id = keyOf(currentDay, name);
      const card = Array.from(document.querySelectorAll("#cards .card")).find(
        (c) => c.querySelector('input[data-field="exerciseName"]').value === name
      );
      if (!card) return;
      const load = Number(card.querySelector('input[data-field="load"]').value || 0);
      const reps = Number(card.querySelector('input[data-field="reps"]').value || 0);
      const sets = Number(card.querySelector('input[data-field="sets"]').value || 0);
      const vol = volume(load, reps);
      if (!state.logs[id]) state.logs[id] = [];
      state.logs[id].push({
        date: new Date().toISOString().slice(0, 10),
        load, reps, sets, volume: vol
      });
      state.prs[id] = Math.max(state.prs[id] || 0, vol);
    });
    saveState();
    setDay(currentDay);
    alert("Treino salvo!");
  };

  // ===== Exportar treino – seleção + PDF =====
  exportBtn.onclick = () => {
    // popular select
    exportSelect.innerHTML = "";
    getDayOrder().forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      exportSelect.appendChild(opt);
    });
    exportSelect.value = currentDay;
    exportModal.classList.remove("hidden");
    exportModal.classList.add("flex");
  };
  exportClose.onclick = () => {
    exportModal.classList.add("hidden");
    exportModal.classList.remove("flex");
  };
  exportModal.addEventListener("click", (e) => {
    if (e.target === exportModal) exportClose.click();
  });

  exportConfirm.onclick = async () => {
    const day = exportSelect.value;
    exportModal.classList.add("hidden");
    exportModal.classList.remove("flex");
    await exportTrainingPDF(day);
  };

  async function exportTrainingPDF(day) {
    if (!jsPDFRef) {
      alert("Biblioteca jsPDF não carregou.");
      return;
    }
    saveState();
    savePlan();

    // construir uma área temporária que clona o layout real (cards com o tema)
    const shadow = document.createElement("div");
    shadow.style.position = "fixed";
    shadow.style.left = "-10000px";
    shadow.style.top = "0";
    shadow.style.width = "900px";
    shadow.className = "print-sheet";

    const title = document.createElement("div");
    title.className = "print-title";
    title.textContent = `Training Day — ${day}`;
    shadow.appendChild(title);

    const grid = document.createElement("section");
    grid.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6";
    shadow.appendChild(grid);

    const list = plan.days[day] || [];
    list.forEach((name) => {
      const id = keyOf(day, name);
      const last = lastLog(id);
      const pr = state.prs[id] || 0;
      const vol = last ? last.volume : 0;
      const pct = progressPct(vol, pr);

      const card = document.createElement("div");
      card.className = "card p-4 rounded-2xl";
      card.innerHTML = `
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <label class="text-xs text-gray-400">Exercício</label>
            <div class="flex items-center gap-2">
              <span class="text-gray-500">≡</span>
              <div class="w-full rounded-lg bg-[#0b1220] border border-gray-700 px-3 py-2">${name}</div>
            </div>
            <p class="text-[11px] text-gray-500 mt-1">
              PR: <span>${Math.round(pr)}</span> • Volume atual: <span>${Math.round(vol)}</span>
            </p>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3 mt-4">
          <label class="flex flex-col text-sm">
            <span class="text-gray-400">Carga (kg)</span>
            <div class="mt-1 rounded-lg bg-[#0b1220] border border-gray-700 px-3 py-2">${last ? (last.load ?? "") : ""}</div>
          </label>
          <label class="flex flex-col text-sm">
            <span class="text-gray-400">Repetições</span>
            <div class="mt-1 rounded-lg bg-[#0b1220] border border-gray-700 px-3 py-2">${last ? (last.reps ?? "") : ""}</div>
          </label>
          <label class="flex flex-col text-sm">
            <span class="text-gray-400">Séries</span>
            <div class="mt-1 rounded-lg bg-[#0b1220] border border-gray-700 px-3 py-2">${last ? (last.sets ?? "") : ""}</div>
          </label>
        </div>

        <div class="mt-4">
          <div class="flex items-center justify-between text-xs mb-1 text-gray-400">
            <span>XP do exercício</span>
            <span>${pct}%</span>
          </div>
          <div class="xpbar"><div class="xpfill" style="width:${pct}%"></div></div>
          <p class="text-xs text-gray-500 mt-2">Meta: <span>${Math.round(targetFor(pr))}</span></p>
        </div>
      `;
      grid.appendChild(card);
    });

    document.body.appendChild(shadow);

    const canvas = await html2canvas(shadow, { backgroundColor: "#0b0f1a", scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDFRef("p", "mm", "a4");
    const pageW = 210, pageH = 297, margin = 8;
    const imgWmm = mmFromPx(canvas.width);
    const imgHmm = mmFromPx(canvas.height);
    const maxW = pageW - margin * 2, maxH = pageH - margin * 2;
    const ratio = Math.min(maxW / imgWmm, maxH / imgHmm);
    const w = imgWmm * ratio, h = imgHmm * ratio;
    const x = (pageW - w) / 2, y = (pageH - h) / 2;

    pdf.addImage(imgData, "PNG", x, y, w, h, undefined, "FAST");
    pdf.save(`training_day_${day.replace(/\s+/g, "_").toLowerCase()}.pdf`);

    document.body.removeChild(shadow);
  }

  // ===== Inicialização =====
  renderTabs();
  setDay(currentDay);
})();
