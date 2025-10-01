const toggleBtn = document.getElementById("theme-toggle");
const html = document.documentElement;

toggleBtn?.addEventListener("click", () => {
  if (html.getAttribute("data-theme") === "dark") {
    html.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
  } else {
    html.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
  }
});

// Load saved preference
const saved = localStorage.getItem("theme");
if (saved) {
  html.setAttribute("data-theme", saved);
}

