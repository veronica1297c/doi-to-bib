const form = document.querySelector("#citationForm");
const input = document.querySelector("#citationInput");
const output = document.querySelector("#bibtexOutput");
const statusText = document.querySelector("#statusText");
const copyButton = document.querySelector("#copyButton");
const downloadButton = document.querySelector("#downloadButton");
const clearButton = document.querySelector("#clearButton");
const themeToggle = document.querySelector("#themeToggle");
const themeIcon = document.querySelector("#themeIcon");

const storageKey = "doi-to-bibtex-theme";

function setStatus(message) {
  statusText.textContent = message;
}

function setBusy(isBusy) {
  form.querySelector(".primary").disabled = isBusy;
  copyButton.disabled = isBusy || !output.value.trim();
  downloadButton.disabled = isBusy || !output.value.trim();
}

function parseRows(value) {
  return value
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), index: index + 1 }))
    .filter((row) => row.line.length > 0)
    .map((row) => {
      const separator = row.line.indexOf("|");
      if (separator === -1) {
        throw new Error(`Line ${row.index}: use citation-key | doi`);
      }

      const key = row.line.slice(0, separator).trim();
      const doi = normalizeDoi(row.line.slice(separator + 1).trim());

      if (!key || !doi) {
        throw new Error(`Line ${row.index}: citation key and DOI are required`);
      }

      return { key, doi };
    });
}

function normalizeDoi(value) {
  return value
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .trim();
}

function replaceBibtexKey(bibtex, key) {
  return bibtex.replace(/^(@\w+\s*\{\s*)[^,\s]+/i, `$1${key}`).trim();
}

function splitTopLevelFields(value) {
  const fields = [];
  let depth = 0;
  let current = "";

  for (const character of value) {
    if (character === "{" || character === "(") depth += 1;
    if (character === "}" || character === ")") depth -= 1;

    if (character === "," && depth === 0) {
      if (current.trim()) fields.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  if (current.trim()) fields.push(current.trim());
  return fields;
}

function prettyPrintBibtex(bibtex) {
  const trimmed = bibtex.trim();
  const header = trimmed.match(/^@(\w+)\s*\{\s*([^,]+)\s*,/);
  if (!header) return trimmed;

  const type = header[1];
  const key = header[2].trim();
  const start = header[0].length;
  const end = trimmed.lastIndexOf("}");
  if (end === -1 || end <= start) return trimmed;

  const fields = splitTopLevelFields(trimmed.slice(start, end)).map((field) => {
    const separator = field.indexOf("=");
    if (separator === -1) return field;

    const name = field.slice(0, separator).trim();
    let value = field.slice(separator + 1).trim();
    if (name.toLowerCase() === "pages") {
      value = value.replace(/[–—-]+/g, "--");
    }

    return `    ${name.padEnd(9, " ")} = ${value}`;
  });

  return `@${type}{${key},\n${fields.join(",\n")}\n}`;
}

async function fetchBibtex({ key, doi }) {
  const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}/transform/application/x-bibtex`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/x-bibtex"
    }
  });

  if (!response.ok) {
    throw new Error(`${key}: DOI lookup failed (${response.status})`);
  }

  const bibtex = await response.text();
  if (!bibtex.trim().startsWith("@")) {
    throw new Error(`${key}: Crossref did not return BibTeX`);
  }

  return prettyPrintBibtex(replaceBibtexKey(bibtex, key));
}

async function generateBibtex(event) {
  event.preventDefault();

  let rows;
  try {
    rows = parseRows(input.value);
  } catch (error) {
    setStatus(error.message);
    return;
  }

  if (!rows.length) {
    output.value = "";
    setStatus("");
    setBusy(false);
    return;
  }

  setBusy(true);
  setStatus(`Fetching ${rows.length} reference${rows.length === 1 ? "" : "s"}...`);

  try {
    const entries = await Promise.all(rows.map(fetchBibtex));
    output.value = entries.join("\n\n");
    setStatus(`Ready: ${entries.length} reference${entries.length === 1 ? "" : "s"}.`);
  } catch (error) {
    setStatus(error.message);
  } finally {
    setBusy(false);
  }
}

async function copyBibtex() {
  const text = output.value.trim();
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    output.select();
    document.execCommand("copy");
    output.setSelectionRange(0, 0);
  }

  setStatus("Copied.");
}

function downloadBibtex() {
  const text = output.value.trim();
  if (!text) return;

  const blob = new Blob([`${text}\n`], { type: "application/x-bibtex;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "references.bib";
  link.click();
  URL.revokeObjectURL(link.href);
  setStatus("Downloaded references.bib.");
}

function clearAll() {
  input.value = "";
  output.value = "";
  setStatus("");
  setBusy(false);
  input.focus();
}

function applyTheme(theme) {
  const isNight = theme === "night";
  document.body.classList.toggle("night", isNight);
  themeIcon.textContent = isNight ? "☀" : "☾";
  themeToggle.setAttribute("aria-label", isNight ? "Switch to day mode" : "Switch to night mode");
  themeToggle.setAttribute("title", isNight ? "Switch to day mode" : "Switch to night mode");
  localStorage.setItem(storageKey, theme);
}

function toggleTheme() {
  applyTheme(document.body.classList.contains("night") ? "day" : "night");
}

form.addEventListener("submit", generateBibtex);
copyButton.addEventListener("click", copyBibtex);
downloadButton.addEventListener("click", downloadBibtex);
clearButton.addEventListener("click", clearAll);
themeToggle.addEventListener("click", toggleTheme);

applyTheme(localStorage.getItem(storageKey) || "day");
setBusy(false);
