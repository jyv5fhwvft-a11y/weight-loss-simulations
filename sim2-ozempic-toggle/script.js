const state = {
  data: null,
};

const svg = document.getElementById("figure");
const lossSlider = document.getElementById("lossSlider");
const lossVal = document.getElementById("lossVal");
const protectToggle = document.getElementById("protectToggle");
const toggleLabel = document.getElementById("toggleLabel");
const verdict = document.getElementById("verdict");

async function init() {
  try {
    const res = await fetch("data.json");
    if (!res.ok) throw new Error("Failed to load data.json");
    state.data = await res.json();

    buildFigure();
    wireControls();
    render();
  } catch (err) {
    console.error(err);
    verdict.textContent = "Could not load data.json. Make sure all files are in the same folder.";
    verdict.className = "verdict danger";
  }
}

function buildFigure() {
  svg.innerHTML = `
    <g id="bodyGroup">
      <ellipse id="fatRing" cx="120" cy="210" rx="80" ry="110" fill="var(--fat)" opacity="0.35"/>
      <path id="bodyPath"
        d="M120 40
           c22 0 38 16 38 38
           c0 20 -12 34 -20 42
           c18 6 32 18 38 38
           l14 60
           c4 16 -6 28 -22 28
           l-10 0
           l-6 82
           c0 8 -6 14 -14 14
           l-16 0
           l0 -76
           l-12 0
           l0 76
           l-16 0
           c-8 0 -14 -6 -14 -14
           l-6 -82
           l-10 0
           c-16 0 -26 -12 -22 -28
           l14 -60
           c6 -20 20 -32 38 -38
           c-8 -8 -20 -22 -20 -42
           c0 -22 16 -38 38 -38 z"
        fill="#5d6b9e"/>
      <ellipse id="muscleCore" cx="120" cy="200" rx="46" ry="80" fill="var(--muscle)" opacity="0.55"/>
    </g>
  `;
}

function wireControls() {
  lossSlider.addEventListener("input", render);
  protectToggle.addEventListener("change", render);
}

function render() {
  if (!state.data) return;

  const lossPct = Number(lossSlider.value);
  const protect = protectToggle.checked;
  const sim = state.data.simulation;

  lossVal.textContent = `${lossPct}%`;
  toggleLabel.textContent = protect
    ? "Protein + resistance training: ON"
    : "Add protein + resistance training";

  // Split of weight lost between fat and muscle, per data.json
  const split = protect ? sim.withProtection : sim.withoutProtection;
  const fatLossPct = (lossPct * split.fatShare) / 100;
  const muscleLossPct = (lossPct * split.muscleShare) / 100;

  // Current composition (start values from data.json baseline)
  const base = sim.baseline;
  const weight = base.weight * (1 - lossPct / 100);
  const fat = base.fatMass * (1 - fatLossPct / 100);
  const muscle = base.muscleMass * (1 - muscleLossPct / 100);

  // Update meters (as % of starting values for a fair visual comparison)
  setMeter("mWeight", "vWeight", (weight / base.weight) * 100, `${weight.toFixed(1)} kg`);
  setMeter("mFat", "vFat", (fat / base.fatMass) * 100, `${fat.toFixed(1)} kg`);
  setMeter("mMuscle", "vMuscle", (muscle / base.muscleMass) * 100, `${muscle.toFixed(1)} kg`);

  // Update figure scale + color feedback
  updateFigure(lossPct, fatLossPct, muscleLossPct);

  // Verdict
  updateVerdict(lossPct, protect, muscleLossPct);
}

function setMeter(barId, valId, pct, label) {
  document.getElementById(barId).style.width = `${Math.max(0, Math.min(100, pct))}%`;
  document.getElementById(valId).textContent = label;
}

function updateFigure(lossPct, fatLossPct, muscleLossPct) {
  const bodyGroup = document.getElementById("bodyGroup");
  const fatRing = document.getElementById("fatRing");
  const muscleCore = document.getElementById("muscleCore");

  // Whole body shrinks with weight loss
  const scale = 1 - lossPct * 0.006; // subtle: max ~12% smaller
  bodyGroup.setAttribute("transform", `translate(120 180) scale(${scale}) translate(-120 -180)`);

  // Fat ring shrinks with fat loss
  const fatScale = 1 - fatLossPct * 0.012;
  fatRing.setAttribute("rx", 80 * fatScale);
  fatRing.setAttribute("ry", 110 * fatScale);

  // Muscle core opacity/size reflects muscle preservation
  const muscleScale = 1 - muscleLossPct * 0.010;
  muscleCore.setAttribute("rx", 46 * muscleScale);
  muscleCore.setAttribute("ry", 80 * muscleScale);
  muscleCore.setAttribute("opacity", muscleLossPct > 8 ? 0.25 : 0.55);
}

function updateVerdict(lossPct, protect, muscleLossPct) {
  verdict.className = "verdict";

  if (lossPct === 0) {
    verdict.textContent = "Move the slider to begin.";
    return;
  }

  if (!protect && lossPct >= 15) {
    verdict.className = "verdict danger";
    verdict.textContent = `⚠ ${muscleLossPct.toFixed(1)}% of starting weight lost as muscle — this is the frailty risk.`;
  } else if (!protect && lossPct >= 8) {
    verdict.className = "verdict warn";
    verdict.textContent = `Heads up: ${muscleLossPct.toFixed(1)}% of starting weight is going from muscle.`;
  } else if (protect && lossPct >= 15) {
    verdict.className = "verdict ok";
    verdict.textContent = `✓ Muscle mostly preserved (${muscleLossPct.toFixed(1)}% loss). This is the goal.`;
  } else if (protect) {
    verdict.className = "verdict ok";
    verdict.textContent = `Muscle preserved: only ${muscleLossPct.toFixed(1)}% loss.`;
  } else {
    verdict.className = "verdict warn";
    verdict.textContent = `Muscle loss: ${muscleLossPct.toFixed(1)}%. Try toggling protection on.`;
  }
}

init();
