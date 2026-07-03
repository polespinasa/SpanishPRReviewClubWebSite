(function () {
  var STORAGE_KEY = "theme";
  var root = document.documentElement;
  var btn = document.getElementById("theme-toggle");
  if (!btn) return;

  btn.addEventListener("click", function () {
    var current = root.getAttribute("data-theme");
    var isLight = current
      ? current === "light"
      : window.matchMedia("(prefers-color-scheme: light)").matches;
    var next = isLight ? "dark" : "light";
    root.setAttribute("data-theme", next);
    localStorage.setItem(STORAGE_KEY, next);
  });
})();
