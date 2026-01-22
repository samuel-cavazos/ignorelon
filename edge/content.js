const DEFAULT_REPLACEMENTS = [
  { from: "Elon Musk", to: "The Antichrist" },
  { from: "Elon", to: "The Antichrist" },
  { from: "Musk's", to: "Antichrist's" },
  { from: "Musk", to: "Antichrist" },
];

const STORAGE_KEY = "replacements";

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "TEXTAREA",
  "INPUT",
  "NOSCRIPT",
]);

let replacementMap = buildReplacementMap(DEFAULT_REPLACEMENTS);
let replacementRegex = buildRegex(replacementMap);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildReplacementMap(entries) {
  const map = {};
  for (const entry of entries || []) {
    if (!entry) {
      continue;
    }
    const from = String(entry.from || "").trim();
    if (!from) {
      continue;
    }
    map[from] = String(entry.to ?? "");
  }
  return map;
}

function buildRegex(map) {
  const terms = Object.keys(map);
  if (!terms.length) {
    return null;
  }
  const pattern = terms
    .slice()
    .sort((a, b) => b.length - a.length)
    .map((word) => `\\b${escapeRegExp(word)}\\b`)
    .join("|");
  return new RegExp(pattern, "g");
}

function shouldSkipNode(node) {
  const parent = node.parentNode;
  if (!parent || parent.nodeType !== Node.ELEMENT_NODE) {
    return true;
  }
  return SKIP_TAGS.has(parent.nodeName);
}

function hasMatch(text) {
  if (!replacementRegex) {
    return false;
  }
  replacementRegex.lastIndex = 0;
  return replacementRegex.test(text);
}

function replaceInTextNode(node) {
  if (!node.nodeValue || !replacementRegex) {
    return;
  }
  replacementRegex.lastIndex = 0;
  const updated = node.nodeValue.replace(replacementRegex, (match) => (
    Object.prototype.hasOwnProperty.call(replacementMap, match)
      ? replacementMap[match]
      : match
  ));
  if (updated !== node.nodeValue) {
    node.nodeValue = updated;
  }
}

function scanAndReplace(root) {
  if (!root || !replacementRegex) {
    return;
  }
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (shouldSkipNode(node)) {
          return NodeFilter.FILTER_REJECT;
        }
        return hasMatch(node.nodeValue)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    }
  );

  const nodes = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }

  for (const node of nodes) {
    replaceInTextNode(node);
  }
}

function observeChanges() {
  if (!document.body) {
    return;
  }
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          if (!shouldSkipNode(node)) {
            replaceInTextNode(node);
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          scanAndReplace(node);
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

function applySettings(entries) {
  replacementMap = buildReplacementMap(entries || []);
  replacementRegex = buildRegex(replacementMap);
}

function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULT_REPLACEMENTS }, (result) => {
      resolve(result[STORAGE_KEY]);
    });
  });
}

function init() {
  loadSettings().then((entries) => {
    applySettings(entries);
    scanAndReplace(document.body);
    observeChanges();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync" || !changes[STORAGE_KEY]) {
      return;
    }
    applySettings(changes[STORAGE_KEY].newValue || []);
    scanAndReplace(document.body);
  });
}

init();
