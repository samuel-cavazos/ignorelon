const DEFAULT_REPLACEMENTS = [
  { from: "Elon Musk", to: "The Antichrist" },
  { from: "Elon", to: "The Antichrist" },
  { from: "Musk's", to: "Antichrist's" },
  { from: "Musk", to: "Antichrist" },
];

const STORAGE_KEY = "replacements";

const rowsEl = document.getElementById("rows");
const statusEl = document.getElementById("status");
const addButton = document.getElementById("add");
const saveButton = document.getElementById("save");
const restoreButton = document.getElementById("restore");

function createInput(labelText, value) {
  const wrapper = document.createElement("div");
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.type = "text";
  input.value = value || "";
  wrapper.appendChild(label);
  wrapper.appendChild(input);
  return { wrapper, input };
}

function createRow(from, to) {
  const row = document.createElement("div");
  row.className = "row";

  const fromField = createInput("Replace", from);
  const toField = createInput("With", to);

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.textContent = "Remove";
  removeButton.className = "remove";
  removeButton.addEventListener("click", () => row.remove());

  row.appendChild(fromField.wrapper);
  row.appendChild(toField.wrapper);
  row.appendChild(removeButton);

  row.dataset.fromId = "from";
  row.dataset.toId = "to";
  row.fromInput = fromField.input;
  row.toInput = toField.input;

  return row;
}

function renderRows(entries) {
  rowsEl.innerHTML = "";
  for (const entry of entries) {
    rowsEl.appendChild(createRow(entry.from, entry.to));
  }
  if (!entries.length) {
    rowsEl.appendChild(createRow("", ""));
  }
}

function setStatus(message) {
  statusEl.textContent = message;
  if (!message) {
    return;
  }
  window.setTimeout(() => {
    statusEl.textContent = "";
  }, 2000);
}

function collectEntries() {
  const entries = [];
  const rows = rowsEl.querySelectorAll(".row");
  rows.forEach((row) => {
    const from = row.fromInput.value.trim();
    const to = row.toInput.value.trim();
    if (from) {
      entries.push({ from, to });
    }
  });
  return entries;
}

function loadSettings() {
  chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULT_REPLACEMENTS }, (result) => {
    renderRows(result[STORAGE_KEY] || []);
  });
}

addButton.addEventListener("click", () => {
  rowsEl.appendChild(createRow("", ""));
});

saveButton.addEventListener("click", () => {
  const entries = collectEntries();
  chrome.storage.sync.set({ [STORAGE_KEY]: entries }, () => {
    setStatus("Saved!");
  });
});

restoreButton.addEventListener("click", () => {
  chrome.storage.sync.set({ [STORAGE_KEY]: DEFAULT_REPLACEMENTS }, () => {
    renderRows(DEFAULT_REPLACEMENTS);
    setStatus("Defaults restored.");
  });
});

loadSettings();
