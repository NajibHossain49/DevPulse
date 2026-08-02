document.addEventListener("DOMContentLoaded", async () => {
  try {
    const settings = await chrome.storage.sync.get(["apiUrl", "token"]);
    const apiUrl = (settings.apiUrl as string) || "http://localhost:3001";
    const token = (settings.token as string) || "";

    const response = await fetch(`${apiUrl}/analytics/quick-stats`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error("failed");

    const json = (await response.json()) as
      | { success: boolean; data: { commitsToday?: number; openPRs?: number } }
      | { commitsToday?: number; openPRs?: number };

    const stats =
      json && typeof json === "object" && "data" in json
        ? json.data
        : (json as { commitsToday?: number; openPRs?: number });

    document.getElementById("commits")!.textContent = String(
      stats.commitsToday ?? 0,
    );
    document.getElementById("prs")!.textContent = String(stats.openPRs ?? 0);
  } catch {
    document.getElementById("commits")!.textContent = "?";
    document.getElementById("prs")!.textContent = "?";
  }

  const saveBtn = document.getElementById("save");
  const tokenInput = document.getElementById("token") as HTMLInputElement | null;
  const apiInput = document.getElementById("apiUrl") as HTMLInputElement | null;

  const current = await chrome.storage.sync.get(["apiUrl", "token"]);
  if (tokenInput) tokenInput.value = (current.token as string) || "";
  if (apiInput) apiInput.value = (current.apiUrl as string) || "http://localhost:3001";

  saveBtn?.addEventListener("click", async () => {
    await chrome.storage.sync.set({
      token: tokenInput?.value.trim() || "",
      apiUrl: apiInput?.value.trim() || "http://localhost:3001",
    });
    const status = document.getElementById("status");
    if (status) status.textContent = "Saved";
  });
});
