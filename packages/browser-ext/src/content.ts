interface PRAnalysis {
  score: number;
  summary: string;
  suggestions: string[];
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

async function injectDevPulseWidget() {
  if (document.getElementById("devpulse-widget")) return;

  const match = window.location.pathname.match(
    /\/([^/]+)\/([^/]+)\/pull\/(\d+)/,
  );
  if (!match) return;

  const [, owner, repo, prNumber] = match;

  const widget = document.createElement("div");
  widget.id = "devpulse-widget";
  widget.className = "devpulse-widget";

  try {
    const { apiUrl, token } = await getSettings();
    const response = await fetch(
      `${apiUrl}/ai/analyze-pr?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&pr=${encodeURIComponent(prNumber)}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = (await response.json()) as Envelope<PRAnalysis> | PRAnalysis;
    const analysis =
      json && typeof json === "object" && "data" in json
        ? (json as Envelope<PRAnalysis>).data
        : (json as PRAnalysis);

    const scoreColor =
      analysis.score >= 80
        ? "#22c55e"
        : analysis.score >= 60
          ? "#eab308"
          : "#ef4444";

    widget.innerHTML = `
      <div class="devpulse-header">
        <span class="devpulse-logo">DevPulse</span>
        <span class="devpulse-score" style="color: ${scoreColor}">${analysis.score}/100</span>
      </div>
      <div class="devpulse-content">
        <p class="devpulse-summary">${escapeHtml(analysis.summary)}</p>
        ${
          analysis.suggestions?.length
            ? `<ul class="devpulse-suggestions">${analysis.suggestions
                .map((s) => `<li>${escapeHtml(s)}</li>`)
                .join("")}</ul>`
            : ""
        }
      </div>
    `;
  } catch {
    widget.innerHTML = `
      <div class="devpulse-header">
        <span class="devpulse-logo">DevPulse</span>
      </div>
      <div class="devpulse-content">
        <p>Sign in to DevPulse to see AI analysis</p>
        <a href="http://localhost:3000/login" target="_blank" rel="noreferrer">Sign In</a>
      </div>
    `;
  }

  const prTitle = document.querySelector(".gh-header-title");
  if (prTitle?.parentElement) {
    prTitle.parentElement.insertBefore(widget, prTitle.nextSibling);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function getSettings(): Promise<{ apiUrl: string; token: string }> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["apiUrl", "token"], (result) => {
      resolve({
        apiUrl: (result.apiUrl as string) || "http://localhost:3001",
        token: (result.token as string) || "",
      });
    });
  });
}

injectDevPulseWidget();

let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    const existing = document.getElementById("devpulse-widget");
    existing?.remove();
    setTimeout(injectDevPulseWidget, 1000);
  }
}).observe(document, { subtree: true, childList: true });
