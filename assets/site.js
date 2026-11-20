// Data Dictionary page: search, filters, grouping, glossary hints, and CSV download.
// The page data (entries and glossary) is embedded in dictionary.html by the site build.
(function () {
  "use strict";

  var dataNode = document.getElementById("dictionary-data");
  if (!dataNode || typeof DataTable === "undefined") {
    return;
  }

  var payload = JSON.parse(dataNode.textContent);
  var rows = payload.entries;
  var glossary = payload.glossary || [];

  // Escape text before it is placed inside HTML.
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Value for a CSV cell: the documented text, or "Not documented" when the field applies but is empty.
  function exportValue(row, key) {
    var value = row[key];
    if (value) {
      return value;
    }
    if ((row.applicable || []).indexOf(key) !== -1) {
      return "Not documented";
    }
    return "";
  }

  // A hidden column that only appears in the CSV download.
  function hiddenExport(key, title) {
    return {
      data: key,
      name: key,
      visible: false,
      searchable: false,
      title: title,
      render: function (_data, _type, row) {
        return exportValue(row, key);
      }
    };
  }

  // The short plain-English text shown in the "What it means" column.
  function meaning(row) {
    return row.summary || row.plain_definition || row.definition || "";
  }

  // Shorten long text for the table; the full text is on the entry page.
  function truncate(text) {
    var clean = String(text || "").replace(/\s+/g, " ").trim();
    if (!clean) {
      return "Not documented";
    }
    if (clean.length > 240) {
      return clean.slice(0, 237).trim() + "...";
    }
    return clean;
  }

  // Glossary abbreviations (for example CIN, ECM+, PAM) get a hover hint in the table.
  var hintTerms = glossary.filter(function (item) {
    return /^[A-Z][A-Z0-9+\-]{1,}$/.test(item.term) || (/[0-9]/.test(item.term) && item.term.length <= 8);
  });
  hintTerms.sort(function (a, b) { return b.term.length - a.term.length; });
  var hintMap = {};
  hintTerms.forEach(function (item) { hintMap[item.term] = item.meaning; });
  var hintPattern = hintTerms.length
    ? new RegExp("(^|[^A-Za-z0-9_])(" + hintTerms.map(function (item) {
        return item.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }).join("|") + ")(?![A-Za-z0-9_])", "g")
    : null;

  // Escape the text, then wrap each glossary abbreviation in <abbr title="meaning">.
  function withHints(text) {
    var safe = esc(text);
    if (!hintPattern) {
      return safe;
    }
    return safe.replace(hintPattern, function (_match, before, term) {
      return before + '<abbr title="' + esc(hintMap[term]) + '">' + term + "</abbr>";
    });
  }

  // Fill a dropdown with the sorted list of values.
  function fillSelect(id, values) {
    var select = document.getElementById(id);
    values.sort(function (a, b) { return a.localeCompare(b); }).forEach(function (value) {
      var option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  }

  var areas = [];
  var types = [];
  var anyOwner = false;
  rows.forEach(function (row) {
    if (areas.indexOf(row.subject_area) === -1) areas.push(row.subject_area);
    if (types.indexOf(row.entry_type_label) === -1) types.push(row.entry_type_label);
    if (row.owner) anyOwner = true;
  });
  fillSelect("filter-area", areas);
  fillSelect("filter-type", types);

  var table = new DataTable("#dictionary", {
    data: rows,
    columns: [
      {
        title: "Name",
        data: "name",
        name: "name",
        className: "col-name",
        render: function (data, type, row) {
          if (type === "display") {
            var also = (row.also_documented_in || []).length;
            return '<a href="entries/' + esc(row.entry_id) + '.html">' + esc(row.name) + "</a>"
              + '<span class="topic">' + esc(row.category) + "</span>"
              + (also ? '<span class="also">Same name in ' + also + " other place" + (also === 1 ? "" : "s") + "</span>" : "");
          }
          return row.name;
        }
      },
      {
        title: "What it means",
        data: "summary",
        name: "meaning",
        className: "col-definition",
        render: function (data, type, row) {
          if (type === "display") {
            return withHints(truncate(meaning(row)));
          }
          return meaning(row) || "Not documented";
        }
      },
      { data: "subject_area", name: "subject_area", title: "Subject area", className: "col-category" },
      {
        data: "entry_type_label",
        name: "entry_type_label",
        title: "Type",
        className: "col-type",
        render: function (data, type) {
          if (type === "display") {
            return '<span class="type-pill">' + esc(data) + "</span>";
          }
          return data;
        }
      },
      {
        title: "Owner",
        data: "owner",
        name: "owner",
        visible: anyOwner,
        render: function (data, type, row) {
          return row.owner || "Not documented";
        }
      },
      { data: "search_text", name: "search_text", className: "no-export", visible: false, searchable: true, orderable: false },
      { data: "category", name: "category", visible: false, searchable: false, title: "Source section" },
      { data: "entry_id", name: "entry_id", visible: false, searchable: false, title: "Entry ID" },
      { data: "definition", name: "definition", visible: false, searchable: false, title: "Full business definition" },
      {
        data: "source_file",
        name: "source",
        visible: false,
        searchable: false,
        title: "Source",
        render: function (data, type, row) {
          return row.source_file + ":" + row.source_line;
        }
      },
      hiddenExport("formula", "Calculation/formula"),
      hiddenExport("numerator", "Numerator"),
      hiddenExport("denominator", "Denominator"),
      hiddenExport("inclusion", "Inclusion criteria"),
      hiddenExport("exclusion", "Exclusion criteria"),
      hiddenExport("grain", "Counting grain and deduplication"),
      hiddenExport("period", "Reporting period and date logic"),
      hiddenExport("source_object", "Source table/view/column"),
      hiddenExport("tableau", "Related Tableau calculation or dashboard"),
      hiddenExport("approval_status", "Documented approval status"),
      hiddenExport("effective_date", "Effective date"),
      {
        data: "review_flags",
        name: "review_flags",
        visible: false,
        searchable: true,
        title: "Review flags",
        render: function (data, type, row) {
          return (row.review_flags || []).join("; ");
        }
      },
      { data: "topic", name: "topic", visible: false, searchable: false, title: "Topic" },
      { data: "audience", name: "audience", className: "no-export", visible: false, searchable: false, title: "Audience" }
    ],
    columnDefs: [
      { targets: [0, 1], responsivePriority: 1 },
      { targets: [2, 3], responsivePriority: 2 }
    ],
    order: [[2, "asc"], [0, "asc"]],
    pageLength: 25,
    lengthMenu: [10, 25, 50, 100],
    autoWidth: false,
    deferRender: true,
    responsive: false,
    rowGroup: { dataSrc: "subject_area" },
    layout: {
      topStart: null,
      topEnd: null,
      bottomStart: ["info", "pageLength", "buttons"],
      bottomEnd: "paging"
    },
    buttons: [
      {
        extend: "csvHtml5",
        text: "Download filtered CSV",
        title: "Vayu Health Git Data Hub",
        filename: "vayu-health-git-data-hub",
        exportOptions: {
          modifier: { search: "applied", page: "all" },
          orthogonal: "export",
          columns: ":not(.no-export)",
          format: {
            body: function (data) {
              return data == null ? "" : String(data);
            }
          }
        }
      }
    ],
    language: {
      emptyTable: "No definitions are published.",
      zeroRecords: "No entries match the current search and filters. Try “Show: All entries” or Reset.",
      info: "Showing _START_ to _END_ of _TOTAL_ entries",
      lengthMenu: "Show _MENU_ entries"
    }
  });

  var viewSelect = document.getElementById("filter-view");
  var areaSelect = document.getElementById("filter-area");
  var typeSelect = document.getElementById("filter-type");
  var reviewSelect = document.getElementById("filter-review");
  var groupSelect = document.getElementById("group-by");
  var searchInput = document.getElementById("dictionary-search");

  // "Business definitions" hides tables, columns, Tableau formulas, and undocumented entries.
  DataTable.ext.search.push(function (settings, _data, _index, row) {
    if (settings.nTable.id !== "dictionary") {
      return true;
    }
    return viewSelect.value === "all" || row.audience === "business";
  });

  // Show "N entries" or "N of M entries" above the table.
  function updateCount() {
    var info = table.page.info();
    var node = document.getElementById("result-count");
    if (!node) {
      return;
    }
    if (info.recordsDisplay === info.recordsTotal) {
      node.textContent = info.recordsDisplay + " entries";
    } else {
      node.textContent = info.recordsDisplay + " of " + info.recordsTotal + " entries";
    }
  }

  table.on("draw", updateCount);

  // Match a dropdown value exactly.
  function exact(value) {
    if (!value) {
      return "";
    }
    return "^" + DataTable.util.escapeRegex(value) + "$";
  }

  // Turn row grouping on or off and sort so groups stay together.
  function applyGrouping() {
    var group = groupSelect.value;
    if (group === "none") {
      table.rowGroup().disable();
      table.order([[0, "asc"]]);
      return;
    }
    table.rowGroup().enable();
    table.rowGroup().dataSrc(group);
    var column = group === "category" ? table.column("category:name").index() : 2;
    table.order([[column, "asc"], [0, "asc"]]);
  }

  // Apply every dropdown to the table and redraw it.
  function applyFilters() {
    table.column("subject_area:name").search(exact(areaSelect.value), true, false);
    table.column("entry_type_label:name").search(exact(typeSelect.value), true, false);
    var review = reviewSelect.value;
    var reviewColumn = table.column("review_flags:name");
    if (!review) {
      reviewColumn.search("");
    } else if (review === "any") {
      reviewColumn.search("definition_not_documented|needs_review|possible_conflict|alternate_formula_without_name|duplicate_name_in_section|not_in_workbook_inventory", true, false);
    } else {
      reviewColumn.search(review, false, false);
    }
    applyGrouping();
    table.draw();
  }

  [viewSelect, areaSelect, typeSelect, reviewSelect, groupSelect].forEach(function (select) {
    select.addEventListener("change", applyFilters);
  });

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      table.search(searchInput.value).draw();
    });
  }

  var resetButton = document.getElementById("reset-filters");
  if (resetButton) {
    resetButton.addEventListener("click", function () {
      if (searchInput) {
        searchInput.value = "";
      }
      table.search("");
      viewSelect.value = "business";
      areaSelect.value = "";
      typeSelect.value = "";
      reviewSelect.value = "";
      groupSelect.value = "subject_area";
      applyFilters();
      if (searchInput) {
        searchInput.focus();
      }
    });
  }

  // Links such as dictionary.html?q=pathway open the page with that search filled in.
  var params = new URLSearchParams(window.location.search);
  if (params.get("view") === "all") viewSelect.value = "all";
  if (params.get("area")) areaSelect.value = params.get("area");
  if (params.get("type")) typeSelect.value = params.get("type");
  if (params.get("review")) reviewSelect.value = params.get("review");
  if (params.get("q") && searchInput) {
    searchInput.value = params.get("q");
    table.search(params.get("q"));
  }
  applyFilters();
  updateCount();
})();
