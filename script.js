// Training Day — 3 Dias (Segunda, Quarta, Sexta)
// Adições: campo "Séries" + modal de Timer de descanso
const SEED = window.__SEED__;
const DAYS = ["Segunda", "Quarta", "Sexta"];
const STORAGE_KEY = "training_day_v1";

let state = loadState();
let currentDay = DAYS[0];

// ======= Estado & helpers =======
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { logs: {}, prs: {} };
  } catch (e) {
    console.warn("Falha ao ler localStorage:", e);
    return { logs: {}, prs: {} };
  }
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Cálculos
const volume = (load, reps) => (Number(load) || 0) * (Number(reps) || 0);
const targetFor = (pr) => Math.max(pr * 1.1, pr + 5, 20);
const progressPct = (vol, pr) => {
  const target = targetFor(pr);
  if (pr <= 0) return Math.min(100, Math.round((vol / target) * 100));
  return Math.min(100, Math.round((vol / target) * 100));
};

// ======= UI inicial =======
const nav = document.querySelector("nav");
DAYS.forEach((d) => {
  const btn = document.createElement("button");
  btn.className =
    "glass rounded-xl px-3 py-2 text-sm hover:bg-gray-800 border border-gray-700";
  btn.textContent = d;
  btn.dataset.day = d;
  btn.onclick = () => setDay(d);
  nav.appendChild(btn);
});
setDay(currentDay);

function setDay(day) {
  currentDay = day;
  document.querySelectorAll("nav button").forEach((b) => {
    if (b.dataset.day === day) b.classList.add("tab-active");
    else b.classList.remove("tab-active");
  });

  document.getElementById("dayTitle").textContent = day;
  renderCards(day);
  updateDayXP();
}

function key(day, name) {
  return day + "::" + name;
}
function lastLog(id) {
  const logs = state.logs[id] || [];
  return logs.length ? logs[logs.length - 1] : null;
}

// ======= Render =======
function renderCards(day) {
  const cont = document.getElementById("cards");
  cont.innerHTML = "";
  const list = SEED[day] || [];
  document.getElementById(
    "exerciseCount"
  ).textContent = `${list.length} exercícios`;

  list.forEach((name) => {
    const id = key(day, name);
    const last = lastLog(id);
    const pr = state.prs[id] || 0;
    const vol = last ? last.volume : 0;
    const pct = progressPct(vol, pr);

    const card = document.createElement("div");
    card.className = "card p-4 rounded-2xl";
    card.innerHTML = `
      <div class="flex items-start justify-between gap-2">
        <div>
          <h3 class="font-semibold text-lg">${name}</h3>
          <p class="text-xs text-gray-400">PR: <span data-pr="value">${Math.round(
            pr
          )}</span> volume</p>
        </div>
        <span class="badge px-2 py-1 rounded-md text-[10px] uppercase tracking-wide">${day}</span>
      </div>

      <!-- AQUI: grid passou a 3 colunas para incluir "Séries" -->
      <div class="grid grid-cols-3 gap-3 mt-4">
        <label class="flex flex-col text-sm">
          <span class="text-gray-400">Carga (kg)</span>
          <input type="number" step="0.5" min="0" class="mt-1 rounded-lg bg-[#0b1220] border border-gray-700 px-3 py-2"
            value="${
              last ? last.load ?? "" : ""
            }" data-id="${id}" data-field="load"/>
        </label>
        <label class="flex flex-col text-sm">
          <span class="text-gray-400">Repetições</span>
          <input type="number" step="1" min="0" class="mt-1 rounded-lg bg-[#0b1220] border border-gray-700 px-3 py-2"
            value="${
              last ? last.reps ?? "" : ""
            }" data-id="${id}" data-field="reps"/>
        </label>
        <label class="flex flex-col text-sm">
          <span class="text-gray-400">Séries</span>
          <input type="number" step="1" min="0" class="mt-1 rounded-lg bg-[#0b1220] border border-gray-700 px-3 py-2"
            value="${
              last ? last.sets ?? "" : ""
            }" data-id="${id}" data-field="sets"/>
        </label>
      </div>

      <div class="mt-4">
        <div class="flex items-center justify-between text-xs mb-1 text-gray-400">
          <span>XP do exercício</span>
          <span data-pct="label">${pct}%</span>
        </div>
        <div class="xpbar"><div class="xpfill" data-pct="bar" style="width:${pct}%"></div></div>
        <p class="text-xs text-gray-500 mt-2">Volume: <span data-vol="value">${Math.round(
          vol
        )}</span> • Meta: <span data-target="value">${Math.round(
      targetFor(pr)
    )}</span></p>
      </div>

      <div class="mt-4 flex flex-wrap gap-2 justify-end">
        <button class="px-3 py-2 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800" onclick="openTimer('${name}')">⏱️ Timer</button>
        <button class="px-3 py-2 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800" onclick="resetExercise('${id}')">Resetar</button>
        <button class="px-3 py-2 rounded-2xl btn-primary font-semibold" onclick="saveExercise('${id}','${name}','${day}')">Salvar</button>
      </div>
    `;
    cont.appendChild(card);
  });

  cont
    .querySelectorAll("input")
    .forEach((inp) => inp.addEventListener("input", onLiveChange));
}

// ======= Live change (não muda XP pela série) =======
function onLiveChange(e) {
  const id = e.target.dataset.id;
  const card = e.target.closest(".card");
  const load = Number(
    card.querySelector('input[data-field="load"][data-id="' + id + '"]')
      .value || 0
  );
  const reps = Number(
    card.querySelector('input[data-field="reps"][data-id="' + id + '"]')
      .value || 0
  );
  const vol = volume(load, reps);
  const pr = state.prs[id] || 0;
  const pct = progressPct(vol, pr);

  card.querySelector('[data-vol="value"]').textContent = Math.round(vol);
  card.querySelector('[data-target="value"]').textContent = Math.round(
    targetFor(pr)
  );
  card.querySelector('[data-pct="label"]').textContent = pct + "%";
  card.querySelector('[data-pct="bar"]').style.width = pct + "%";

  updateDayXP();
}

// ======= Persistência =======
function saveExercise(id, name, day) {
  const card = Array.from(document.querySelectorAll(".card")).find(
    (c) => c.querySelector("h3")?.textContent === name
  );
  if (!card) return;
  const load = Number(
    card.querySelector('input[data-field="load"]').value || 0
  );
  const reps = Number(
    card.querySelector('input[data-field="reps"]').value || 0
  );
  const sets = Number(
    card.querySelector('input[data-field="sets"]').value || 0
  );
  const vol = volume(load, reps); // XP continua baseado em carga × reps

  if (!state.logs[id]) state.logs[id] = [];
  state.logs[id].push({
    date: new Date().toISOString().slice(0, 10),
    load,
    reps,
    sets,
    volume: vol,
  });

  state.prs[id] = Math.max(state.prs[id] || 0, vol);
  saveState();

  const pr = state.prs[id];
  const pct = progressPct(vol, pr);
  card.querySelector('[data-pr="value"]').textContent = Math.round(pr);
  card.querySelector('[data-vol="value"]').textContent = Math.round(vol);
  card.querySelector('[data-target="value"]').textContent = Math.round(
    targetFor(pr)
  );
  card.querySelector('[data-pct="label"]').textContent = pct + "%";
  card.querySelector('[data-pct="bar"]').style.width = pct + "%";

  updateDayXP();
}

function resetExercise(id) {
  delete state.logs[id];
  delete state.prs[id];
  saveState();
  setDay(currentDay);
}

function updateDayXP() {
  const cards = document.querySelectorAll("#cards .card");
  let sum = 0,
    n = 0;
  cards.forEach((card) => {
    const pct =
      parseInt(card.querySelector('[data-pct="label"]').textContent) || 0;
    sum += pct;
    n += 1;
  });
  const avg = n ? Math.round(sum / n) : 0;
  document.getElementById("dayXP").style.width = avg + "%";
  document.getElementById("dayXPLabel").textContent = avg + "%";
}

// Salvar dia todo
document.getElementById("saveDay").onclick = () => {
  const list = SEED[currentDay] || [];
  list.forEach((name) => {
    const id = key(currentDay, name);
    const cont = Array.from(document.querySelectorAll("#cards .card")).find(
      (c) => c.querySelector("h3").textContent === name
    );
    if (!cont) return;
    const load = Number(
      cont.querySelector('input[data-field="load"]').value || 0
    );
    const reps = Number(
      cont.querySelector('input[data-field="reps"]').value || 0
    );
    const sets = Number(
      cont.querySelector('input[data-field="sets"]').value || 0
    );
    const vol = volume(load, reps);
    if (!state.logs[id]) state.logs[id] = [];
    state.logs[id].push({
      date: new Date().toISOString().slice(0, 10),
      load,
      reps,
      sets,
      volume: vol,
    });
    state.prs[id] = Math.max(state.prs[id] || 0, vol);
  });
  saveState();
  setDay(currentDay);
  alert("Treino salvo!");
};

// ======= Timer de descanso (modal) =======
let timerRef = null;
let remaining = 0;
let timerLoop = 0;

const timerModal = document.getElementById("timerModal");
const timerExercise = document.getElementById("timerExercise");
const timerDisplay = document.getElementById("timerDisplay");
const timerStatus = document.getElementById("timerStatus");
const timerMin = document.getElementById("timerMin");
const timerSec = document.getElementById("timerSec");
const timerLoopSel = document.getElementById("timerLoop");
const timerStart = document.getElementById("timerStart");
const timerStop = document.getElementById("timerStop");
const timerClose = document.getElementById("timerClose");

function openTimer(exerciseName) {
  timerExercise.textContent = `Exercício: ${exerciseName}`;
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
  remaining = mins * 60 + secs;
  if (remaining <= 0) {
    remaining = 60;
  } // default 1 min se 0
  timerStatus.textContent = "Contando...";
  if (timerRef) clearInterval(timerRef);
  updateTimerDisplay(remaining);
  timerRef = setInterval(() => {
    remaining -= 1;
    updateTimerDisplay(remaining);
    if (remaining <= 0) {
      clearInterval(timerRef);
      timerRef = null;
      timerStatus.textContent = timerLoop
        ? "Ciclo concluído — reiniciando"
        : "Concluído!";
      try {
        new AudioContext();
      } catch (_) {}
      // sinal simples
      alert("Descanso finalizado!");
      if (timerLoop) {
        startTimer(); // reinicia com os mesmos valores
      }
    }
  }, 1000);
}
function stopTimer() {
  if (timerRef) clearInterval(timerRef);
  timerRef = null;
  timerStatus.textContent = "Parado";
}
function updateTimerDisplay(totalSeconds) {
  const mm = String(Math.max(0, Math.floor(totalSeconds / 60))).padStart(
    2,
    "0"
  );
  const ss = String(Math.max(0, totalSeconds % 60)).padStart(2, "0");
  timerDisplay.textContent = `${mm}:${ss}`;
}

timerStart.addEventListener("click", startTimer);
timerStop.addEventListener("click", stopTimer);
timerClose.addEventListener("click", closeTimer);
timerModal.addEventListener("click", (e) => {
  if (e.target === timerModal) closeTimer();
});

// ======= Ações globais =======
document.getElementById("resetWeek").onclick = () => {
  if (confirm("Tem certeza que deseja limpar todos os dados?")) {
    state = { logs: {}, prs: {} };
    saveState();
    setDay(currentDay);
  }
};

document.getElementById("exportBtn").onclick = (e) => {
  e.preventDefault();
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "progresso_training_day.json";
  a.click();
  URL.revokeObjectURL(url);
};
