const state = {
  data: null,
  revealed: false,
};

const SVG_NS = "http://www.w3.org/2000/svg";

async function init() {
  try {
    const res = await fetch("data.json");
    if (!res.ok) throw new Error("Failed to load data.json");
    state.data = await res.json();
    renderCards(state.data.women);
    wireControls();
  } catch (err) {
    console.error(err);
    document.getElementById("cards").innerHTML =
      '<p style="color:#ff5470;text-align:center">Could not load data.json. Make sure all files are in the same folder.</p>';
  }
}

function renderCards(women) {
  const wrap = document.getElementById("cards");
  wrap.innerHTML = "";

  women.forEach((w) => {
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.id = w.id;
    card.setAttribute("aria-label", `${w.name}, BMI ${w.bmi}`);

    card.innerHTML = `
      <span class="bmi-badge">BMI ${w.bmi}</span>
      ${buildFigure(w)}
      <p class="name">${w.name}</p>
      <p class="caption">${w.shortCaption}</p>
    `;

    wrap.appendChild(card);
  });
}

/* Builds a stylized torso silhouette with layered muscle / subcutaneous / visceral shapes.
   Values come from data.json (0-100). */
function buildFigure(w) {
  const muscle = w.composition.muscle;
  const visceral = w.composition.visceralFat;
  const subcut = w.composition.subcutaneousFat;

  // Map values to visual sizes (kept subtle & illustrative)
  const muscleWidth = 20 + muscle * 0.28;          // wider = more muscle shading
  const viscWidth = 10 + visceral * 0.22;           // inner organ-area blob
  const subcutWidth = 26 + subcut * 0.18;           // outer soft-tissue ring

  return `
  <svg class="fig" viewBox="0 0 200 300" role="img" aria-label="${w.name} body composition figure">
    <!-- body outline -->
    <g class="layer l-body">
      <path d="M100 22
               c16 0 28 12 28 28
               c0 14 -8 24 -14 30
               c12 4 22 12 26 26
               l12 44
               c3 12 -4 22 -16 22
               l-6 0
               l-4 60
               c0 6 -4 10 -10 10
               l-12 0
               l0 -54
               l-8 0
               l0 54
               l-12 0
               c-6 0 -10 -4 -10 -10
               l-4 -60
               l-6 0
               c-12 0 -19 -10 -16 -22
               l12 -44
               c4 -14 14 -22 26 -26
               c-6 -6 -14 -16 -14 -30
               c0 -16 12 -28 28 -28 z"
            fill="#5d6b9e"/>
    </g>

    <!-- subcutaneous fat ring (outer soft tissue) -->
    <g class="layer l-subcut">
      <ellipse cx="100" cy="150" rx="${subcutWidth}" ry="62" fill="var(--subcut)"/>
      <ellipse cx="100" cy="228" rx="${subcutWidth * 0.55}" ry="34" fill="var(--subcut)"/>
    </g>

    <!-- muscle shading -->
    <g class="layer l-muscle">
      <ellipse cx="78" cy="150" rx="${muscleWidth * 0.45}" ry="54" fill="var(--muscle)"/>
      <ellipse cx="122" cy="150" rx="${muscleWidth * 0.45}" ry="54" fill="var(--muscle)"/>
      <ellipse cx="100" cy="222" rx="${muscleWidth * 0.5}" ry="30" fill="var(--muscle)"/>
      <ellipse cx="100" cy="60" rx="${muscleWidth * 0.32}" ry="22" fill="var(--muscle)"/>
    </g>

    <!-- visceral fat (deep abdominal blob) -->
    <g class="layer l-visceral">
      <ellipse cx="100" cy="152" rx="${viscWidth}" ry="${viscWidth * 0.85}" fill="var(--visceral)"/>
    </g>
  </svg>`;
}

function wireControls() {
  const revealBtn = document.getElementById("revealBtn");
  const resetBtn = document.getElementById("resetBtn");
  const hint = document.getElementById("hint");

  revealBtn.addEventListener("click", () => {
    if (state.revealed) return;
    state.revealed = true;
    document.querySelectorAll(".card").forEach((c, i) => {
      setTimeout(() => c.classList.add("revealed"), i * 180);
    });
    revealBtn.hidden = true;
    resetBtn.hidden = false;
    hint.textContent = "Now tap a woman to see her metabolic risk profile.";
    attachCardClicks();
  });

  resetBtn.addEventListener("click", () => {
    state.revealed = false;
    document.querySelectorAll(".card").forEach((c) => {
      c.classList.remove("revealed", "clickable");
    });
    revealBtn.hidden = false;
    resetBtn.hidden = true;
    hint.textContent = "Tap a woman after revealing to see her metabolic risk profile.";
    closeModal();
  });

  document.getElementById("modalClose").addEventListener("click", closeModal);
  document.getElementById("modal").addEventListener("click", (e) => {
    if (e.target.id === "modal") closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

function attachCardClicks() {
  document.querySelectorAll(".card").forEach((card) => {
    card.classList.add("clickable");
    card.onclick = () => openModal(card.dataset.id);
  });
}

function openModal(id) {
  const w = state.data.women.find((x) => x.id === id);
  if (!w) return;

  document.getElementById("modalTitle").textContent = w.name;
  document.getElementById("modalBmi").textContent = `BMI ${w.bmi}`;
  document.getElementById("modalNote").textContent = w.note;

  const meters = document.getElementById("modalMeters");
  meters.innerHTML = "";
  const rows = [
    { key: "muscle", label: "Muscle mass", cls: "muscle" },
    { key: "visceralFat", label: "Visceral fat", cls: "visceral" },
    { key: "subcutaneousFat", label: "Subcutaneous fat", cls: "subcut" },
  ];
  rows.forEach((r) => {
    const val = w.composition[r.key];
    const row = document.createElement("div");
    row.className = "meter-row";
    row.innerHTML = `
      <span>${r.label}</span>
      <div class="meter-track"><div class="meter-fill ${r.cls}" data-w="${val}"></div></div>
      <span class="meter-val">${val}</span>
    `;
    meters.appendChild(row);
  });

  const risk = document.getElementById("modalRisk");
  risk.className = `risk ${w.risk.level}`;
  risk.textContent = `Metabolic risk profile: ${w.risk.label}`;

  const modal = document.getElementById("modal");
  modal.hidden = false;

  // animate bars after paint
  requestAnimationFrame(() => {
    modal.querySelectorAll(".meter-fill").forEach((el) => {
      el.style.width = `${el.dataset.w}%`;
    });
  });
}

function closeModal() {
  const modal = document.getElementById("modal");
  modal.hidden = true;
  modal.querySelectorAll(".meter-fill").forEach((el) => (el.style.width = "0%"));
}

init();
