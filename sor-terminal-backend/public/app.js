const normalize = s => s.trim().toLowerCase();

const loginBtn = document.getElementById("login-btn");
const scanSection = document.getElementById("scan-section");
const gtInput = document.getElementById("gt-input");
const scanBtn = document.getElementById("scan-btn");

const statusDiv = document.getElementById("status");
const friendsListEl = document.getElementById("friends-list");
const kosListEl = document.getElementById("kos-list");
const ddosListEl = document.getElementById("ddos-list");

// Quick link buttons
const openXboxProfileBtn = document.getElementById("open-xbox-profile");
const openXboxFriendsBtn = document.getElementById("open-xbox-friends");
const openLeafAppBtn = document.getElementById("open-leafapp");
const openHaloQueryBtn = document.getElementById("open-haloquery");

// On load, check if authenticated
window.addEventListener("load", async () => {
  try {
    const resp = await fetch("/api/friends");
    if (resp.ok) {
      scanSection.classList.remove("hidden");
      statusDiv.textContent = "Authenticated. Ready to scan.";
    } else {
      statusDiv.textContent = "Not authenticated. Please sign in with Microsoft.";
    }
  } catch {
    statusDiv.textContent = "Not authenticated. Please sign in with Microsoft.";
  }
});

// Real login: redirect to backend auth start
loginBtn.addEventListener("click", () => {
  window.location.href = "/auth/start";
});

// Scan button: fetch friends from backend, then scan against KOS/DDOS
scanBtn.addEventListener("click", async () => {
  const targetGT = gtInput.value.trim();
  if (!targetGT) {
    statusDiv.textContent = "Please enter a target gamertag.";
    return;
  }

  statusDiv.textContent = "Fetching friends from Xbox API...";
  friendsListEl.innerHTML = "";
  kosListEl.innerHTML = "";
  ddosListEl.innerHTML = "";

  try {
    const friendsResp = await fetch("/api/friends");
    if (!friendsResp.ok) {
      throw new Error("Failed to fetch friends from backend.");
    }
    const friendsData = await friendsResp.json();
    const friends = friendsData.friends || [];

    const scanResp = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gamertag: targetGT, friends })
    });

    if (!scanResp.ok) {
      throw new Error("Scan request failed.");
    }

    const scanData = await scanResp.json();

    statusDiv.textContent = `Scan complete for ${scanData.gamertag}.`;

    renderList(friendsListEl, scanData.friends);
    renderList(kosListEl, scanData.generalKOS);
    renderList(ddosListEl, scanData.ddosers);

    await fetch("/api/logScan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scanData)
    });

  } catch (err) {
    console.error(err);
    statusDiv.textContent = "Error: " + err.message;
  }
});

function renderList(el, items) {
  el.innerHTML = "";
  if (!items || items.length === 0) {
    const li = document.createElement("li");
    li.textContent = "None";
    el.appendChild(li);
    return;
  }
  items.forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    el.appendChild(li);
  });
}

// Quick link handlers
openXboxProfileBtn.addEventListener("click", () => {
  const gt = gtInput.value.trim();
  if (!gt) return alert("Enter a gamertag first.");
  window.open(
    `https://account.xbox.com/en-us/Profile?gamertag=${encodeURIComponent(gt)}`,
    "_blank"
  );
});

openXboxFriendsBtn.addEventListener("click", () => {
  const gt = gtInput.value.trim();
  if (!gt) return alert("Enter a gamertag first.");
  window.open(
    `https://www.xbox.com/en-US/play/user/${encodeURIComponent(gt)}/friends`,
    "_blank"
  );
});

openLeafAppBtn.addEventListener("click", () => {
  const gt = gtInput.value.trim();
  if (!gt) return alert("Enter a gamertag first.");
  window.open(
    `https://leafapp.co/xbox/user/${encodeURIComponent(gt)}`,
    "_blank"
  );
});

openHaloQueryBtn.addEventListener("click", () => {
  const gt = gtInput.value.trim();
  if (!gt) return alert("Enter a gamertag first.");
  window.open(
    `https://haloquery.com/player/${encodeURIComponent(gt)}`,
    "_blank"
  );
});
