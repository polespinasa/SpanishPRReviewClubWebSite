// Client-side filtering of the session list by PR author, host and tag.
(function () {
  var bar = document.querySelector("[data-session-filters]");
  var list = document.querySelector(".session-list");
  if (!bar || !list) return;

  var cards = Array.prototype.slice.call(list.querySelectorAll(".session-card"));
  var selects = Array.prototype.slice.call(bar.querySelectorAll("select[data-filter]"));
  var tagSelect = bar.querySelector('select[data-filter="tags"]');
  var reset = bar.querySelector("[data-filter-reset]");
  var count = bar.querySelector("[data-filter-count]");
  var empty = document.querySelector("[data-session-empty]");

  function matches(card) {
    return selects.every(function (select) {
      if (!select.value) return true;
      var raw = card.getAttribute("data-" + select.dataset.filter) || "";
      return raw.split("|").indexOf(select.value) !== -1;
    });
  }

  function apply() {
    var visible = 0;
    cards.forEach(function (card) {
      var ok = matches(card);
      card.hidden = !ok;
      if (ok) visible++;
    });

    var filtering = selects.some(function (select) { return select.value !== ""; });
    reset.hidden = !filtering;
    count.textContent = filtering ? visible + " de " + cards.length + " sesiones" : "";
    if (empty) empty.hidden = visible !== 0;

    var activeTag = tagSelect ? tagSelect.value : "";
    list.querySelectorAll(".session-tag").forEach(function (chip) {
      chip.setAttribute("aria-pressed", String(chip.dataset.tag === activeTag));
    });
  }

  selects.forEach(function (select) { select.addEventListener("change", apply); });

  reset.addEventListener("click", function () {
    selects.forEach(function (select) { select.value = ""; });
    apply();
  });

  // Tag chips are a shortcut to the tag select; clicking the active one clears it.
  if (tagSelect) {
    list.addEventListener("click", function (event) {
      var chip = event.target.closest(".session-tag");
      if (!chip) return;
      tagSelect.value = tagSelect.value === chip.dataset.tag ? "" : chip.dataset.tag;
      apply();
    });
  }

  bar.hidden = false;
  apply();
})();
