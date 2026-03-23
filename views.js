let sessionId = sessionStorage.getItem("sessionId");

if (!sessionId) {
  sessionId = Date.now() + "_" + Math.random();
  sessionStorage.setItem("sessionId", sessionId);
}

function getPageName() {
  let path = window.location.pathname.split("/").pop().toLowerCase();

  if (!path || path === "" || path === "index.html") {
    return "home";
  }

  return path.replace(".html", "");
}

async function track(type, name) {
  try {
    await fetch("https://admin.workfromanywhere-sa.workers.dev/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type,
        name,
        sessionId
      })
    });
  } catch (err) {
    console.error("Tracking failed:", err);
  }
}

/* -------- TRACK PAGE -------- */
const pageName = getPageName();
track("page", pageName);

/* -------- TRACK FOLDER -------- */
const params = new URLSearchParams(window.location.search);
const folder = params.get("folder");

if (folder) {
  track("folder", folder);
}
