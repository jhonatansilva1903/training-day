// Training Day — edição de exercícios e dias
// Mantém: carga, reps, séries, PR, XP por exercício/dia e Timer
// Novidades: combobox para nome do exercício, adicionar/excluir cards, gerenciar dias

const SEED = window.__SEED__;
const STORAGE_KEY = "training_day_v1";
const PLAN_KEY = "training_day_plan_v1"; // estrutura de dias + lista de exercícios

// Sugestões — aparelhos e exercícios comuns (pode estender à vontade)
const EXERCISE_OPTIONS = [
  // Peito
  "Supino reto barra",
  "Supino inclinado barra",
  "Supino declinado barra",
  "Supino reto halteres",
  "Supino inclinado halteres",
  "Crucifixo halteres",
  "Voador máquina",
  "Cross-over cabo alto",
  "Cross-over cabo baixo",
  // Costas
  "Puxada frente barra",
  "Puxada aberta",
  "Puxada neutra",
  "Remada curvada",
  "Remada baixa",
  "Remada cavalinho",
  "Remada unilateral halter",
  "Pull-over",
  // Pernas
  "Agachamento livre",
  "Agachamento smith",
  "Hack squat",
  "Leg press",
  "Cadeira extensora",
  "Mesa flexora",
  "Stiff com halteres",
  "Stiff barra",
  "Panturrilha em pé",
  "Panturrilha sentado",
  // Ombro
  "Desenvolvimento halteres",
  "Desenvolvimento barra",
  "Elevação lateral",
  "Elevação frontal",
  "Remada alta",
  "Arnold press",
  // Bíceps
  "Rosca direta barra",
  "Rosca alternada",
  "Rosca martelo",
  "Rosca scott",
  "Rosca concentrada",
  "Cable Curl",
  // Tríceps
  "Tríceps testa",
  "Tríceps corda (pushdown)",
  "Mergulho paralelas",
  "Overhead triceps",
  "Kickback",
  // Core
  "Abdominal crunch",
  "Abs Cable Crunch",
  "Prancha",
  "Elevação de pernas",
  // Extras já usados
  "Puxador alto",
  "Bar cable row",
  "Reverse grip pull down",
  "Hack",
  "Extensora",
  "Mesa flexora",
  "Cadeira extensora",
  "Panturrilha em pé",
  "Remada curvada",
  "Abs Cable Crunch",
  "Rosca alternada",
];

// ===== Estado persistente =====
let state = loadState();
let plan = loadPlan(); // { [day]: [exerciseName, ...] }
ensureExerciseOptions();

let currentDay = Object.keys(plan)[0] || "Segunda";

// ======= Helpers persistência =======
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

function loadPlan() {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Falha ao ler plano:", e);
  }
  // se não existir, parte do SEED
  return structuredClone(SEED);
}
function savePlan() {
  localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
}

function ensureExerciseOptions() {
  const dl = document.getElementById("exerciseOptions");
  dl.innerHTML = "";
  EXERCISE_OPTIONS.forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt;
    dl.appendChild(o);
  });
}

// ======= Cálculos XP/PR =======
const volume = (load, reps) => (Number(load) || 0) * (Number(reps) || 0);
const targetFor = (pr) => Math.max(pr * 1.1, pr + 5, 20);
const progressPct = (vol, pr) => {
  const target = targetFor(pr);
  if (pr <= 0) return Math.min(100, Math.round((vol / target) * 100));
  return Math.min(100, Math.round((vol / target) * 100));
};
const key = (day, name) => day + "::" + name;
const lastLog = (id) => {
  const logs = state.logs[id] || [];
  return logs.length ? logs[logs.length - 1] : null;
};

// ======= UI inicial =======
const nav = document.querySelector("nav");
function renderTabs() {
  nav.innerHTML = "";
  Object.keys(plan).forEach((d) => {
    const btn = document.createElement("button");
    btn.className =
      "glass rounded-xl px-3 py-2 text-sm hover:bg-gray-800 border border-gray-700";
    btn.textContent = d;
    btn.dataset.day = d;
    btn.onclick = () => setDay(d);
    if (d === currentDay) btn.classList.add("tab-active");
    nav.appendChild(btn);
  });
}
renderTabs();
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

// ======= Render Cards =======
function renderCards(day) {
  const cont = document.getElementById("cards");
  cont.innerHTML = "";
  const list = plan[day] || [];
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
        <div class="flex-1">
          <!-- Nome do exercício: COMBOBOX (datalist) + texto livre -->
          <label class="text-xs text-gray-400">Exercício</label>
          <input list="exerciseOptions" value="${name}" class="w-full mt-1 rounded-lg bg-[#0b1220] border border-gray-700 px-3 py-2"
                 data-id="${id}" data-oldname="${name}" data-field="exerciseName" />
          <p class="text-[11px] text-gray-500 mt-1">PR: <span data-pr="value">${Math.round(
            pr
          )}</span> • Volume atual: <span data-vol="value">${Math.round(
      vol
    )}</span></p>
        </div>
        <div class="flex items-center gap-2">
          <button title="Timer" class="px-2 py-2 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800" onclick="openTimer('${name}')">⏱️</button>
          <button title="Excluir" class="px-2 py-2 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800" onclick="deleteExercise('${day}','${name}')">🗑️</button>
        </div>
      </div>

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
        <p class="text-xs text-gray-500 mt-2">Meta: <span data-target="value">${Math.round(
          targetFor(pr)
        )}</span></p>
      </div>

      <div class="mt-4 flex flex-wrap gap-2 justify-end">
        <button class="px-3 py-2 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800" onclick="resetExercise('${id}')">Resetar</button>
        <button class="px-3 py-2 rounded-2xl btn-primary font-semibold" onclick="saveExercise('${id}', this)">Salvar</button>
      </div>
    `;
    cont.appendChild(card);
  });

  // Eventos: live update e rename por combobox
  cont.querySelectorAll("input").forEach((inp) => {
    if (inp.dataset.field === "exerciseName") {
      inp.addEventListener("change", onRenameExercise);
    } else {
      inp.addEventListener("input", onLiveChange);
    }
  });
}

// ======= Adicionar/Excluir Exercícios =======
document.getElementById("addExerciseBtn").onclick = () =>
  addExercise(currentDay);

function addExercise(day) {
  plan[day] = plan[day] || [];
  // cria um nome único temporário
  let base = "Novo exercício";
  let name = base,
    i = 2;
  while (plan[day].includes(name)) {
    name = `${base} ${i++}`;
  }
  plan[day].push(name);
  savePlan();
  renderCards(day);
}

function deleteExercise(day, name) {
  plan[day] = (plan[day] || []).filter((n) => n !== name);
  savePlan();
  // apaga só os dados de PR/logs daquele exercício (opcional; aqui mantemos limpeza)
  const id = key(day, name);
  delete state.logs?.[id];
  delete state.prs?.[id];
  saveState();
  renderCards(day);
  updateDayXP();
}

// ======= Rename (combobox) =======
function onRenameExercise(e) {
  const input = e.target;
  const oldId = input.dataset.id;
  const oldName = input.dataset.oldname;
  const newName = (input.value || "").trim() || oldName;
  if (newName === oldName) return;

  // atualiza plan
  const [day] = oldId.split("::");
  const arr = plan[day] || [];
  const idx = arr.indexOf(oldName);
  if (idx >= 0) arr[idx] = newName;

  // migra logs/prs para a nova chave
  const newId = key(day, newName);
  state.logs = state.logs || {};
  state.prs = state.prs || {};
  state.logs[newId] = state.logs[oldId] || [];
  state.prs[newId] = state.prs[oldId] || 0;
  delete state.logs[oldId];
  delete state.prs[oldId];

  savePlan();
  saveState();
  // re-render para atualizar data-id/data-oldname dos inputs
  renderCards(day);
}

// ======= Live change =======
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
function saveExercise(id, btnEl) {
  const card = btnEl.closest(".card");
  const titleInput = card.querySelector('input[data-field="exerciseName"]');
  const [day] = id.split("::");
  const name = titleInput.value.trim();
  const newId = key(day, name);

  const load = Number(
    card.querySelector('input[data-field="load"]').value || 0
  );
  const reps = Number(
    card.querySelector('input[data-field="reps"]').value || 0
  );
  const sets = Number(
    card.querySelector('input[data-field="sets"]').value || 0
  );
  const vol = volume(load, reps);

  // se id antigo != novo, migra (caso o usuário tenha alterado o nome e clicado salvar)
  if (newId !== id) {
    state.logs[newId] = state.logs[id] || [];
    state.prs[newId] = state.prs[id] || 0;
    delete state.logs[id];
    delete state.prs[id];
  }

  if (!state.logs[newId]) state.logs[newId] = [];
  state.logs[newId].push({
    date: new Date().toISOString().slice(0, 10),
    load,
    reps,
    sets,
    volume: vol,
  });
  state.prs[newId] = Math.max(state.prs[newId] || 0, vol);
  saveState();

  const pr = state.prs[newId];
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

// Salvar dia todo (igual de antes)
document.getElementById("saveDay").onclick = () => {
  const list = plan[currentDay] || [];
  list.forEach((name) => {
    const id = key(currentDay, name);
    const cont = Array.from(document.querySelectorAll("#cards .card")).find(
      (c) => c.querySelector('input[data-field="exerciseName"]').value === name
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

// ======= Timer de descanso (igual, reaproveitado) =======
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
  }
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
      alert("Descanso finalizado!");
      if (timerLoop) {
        startTimer();
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

// ======= Gerenciar dias =======
const manageDaysBtn = document.getElementById("manageDaysBtn");
const daysModal = document.getElementById("daysModal");
const daysClose = document.getElementById("daysClose");
const newDaySelect = document.getElementById("newDaySelect");
const addDayBtn = document.getElementById("addDayBtn");
const daysList = document.getElementById("daysList");

manageDaysBtn.onclick = () => {
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
  const day = newDaySelect.value;
  if (plan[day]) {
    alert("Esse dia já existe.");
    return;
  }
  plan[day] = [];
  savePlan();
  renderTabs();
  setDay(day);
  renderDaysList();
};

function renderDaysList() {
  daysList.innerHTML = "";
  Object.keys(plan).forEach((d) => {
    const li = document.createElement("li");
    li.className =
      "flex items-center justify-between glass rounded-xl border border-gray-700 px-3 py-2";
    li.innerHTML = `
      <span>${d}</span>
      <button class="px-3 py-1 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800">Excluir</button>
    `;
    const delBtn = li.querySelector("button");
    delBtn.onclick = () => {
      const keys = Object.keys(plan);
      if (keys.length <= 1) {
        alert("Não é possível excluir o único dia.");
        return;
      }
      delete plan[d];
      savePlan();
      // limpa dados relacionados àquele dia
      Object.keys(state.logs || {}).forEach((k) => {
        if (k.startsWith(d + "::")) delete state.logs[k];
      });
      Object.keys(state.prs || {}).forEach((k) => {
        if (k.startsWith(d + "::")) delete state.prs[k];
      });
      saveState();

      // se excluiu o dia atual, muda para o primeiro disponível
      if (currentDay === d) {
        currentDay = Object.keys(plan)[0];
      }
      renderTabs();
      setDay(currentDay);
      renderDaysList();
    };
    daysList.appendChild(li);
  });
}

// ======= Ações globais =======
document.getElementById("resetWeek").onclick = () => {
  if (
    confirm("Tem certeza que deseja limpar todos os dados (PR e histórico)?")
  ) {
    state = { logs: {}, prs: {} };
    saveState();
    setDay(currentDay);
  }
};

document.getElementById("exportBtn").onclick = (e) => {
  e.preventDefault();
  const payload = { state, plan };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "training_day_export.json";
  a.click();
  URL.revokeObjectURL(url);
};
