(function () {
  "use strict";

  var dataNode = document.getElementById("dictionary-data");
  if (!dataNode || typeof DataTable === "undefined") {
    return;
  }

  var payload = JSON.parse(dataNode.textContent);
  var rows = payload.entries;

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

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

  function hiddenExport(key, title) {
    return {
      data: key,
      visible: false,
      searchable: false,
      title: title,
      render: function (_data, _type, row) {
        return exportValue(row, key);
      }
    };
  }

  function truncate(text) {
    var clean = String(text || "").replace(/\s+/g, " ").trim();
    if (!clean) {
      return "Not documented";
    }
    if (clean.length > 220) {
      return clean.slice(0, 217).trim() + "...";
    }
    return clean;
  }

  function fillSelect(id, values) {
    var select = document.getElementById(id);
    values.sort(function (a, b) { return a.localeCompare(b); }).forEach(function (value) {
      var option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  }

  var categories = [];
  var types = [];
  rows.forEach(function (row) {
    if (categories.indexOf(row.category) === -1) categories.push(row.category);
    if (types.indexOf(row.entry_type_label) === -1) types.push(row.entry_type_label);
  });
  fillSelect("filter-category", categories);
  fillSelect("filter-type", types);

  var table = new DataTable("#dictionary", {
    data: rows,
    columns: [
      {
        title: "Name",
        data: "name",
        className: "col-name",
        render: function (data, type, row) {
          if (type === "display") {
            return '<a href="entries/' + esc(row.entry_id) + '.html">' + esc(row.name) + "</a>"
              + '<span class="topic">' + esc(row.topic) + "</span>";
          }
          return row.name;
        }
      },
      { data: "category", title: "Category", className: "col-category" },
      {
        data: "entry_type_label",
        title: "Entry type",
        className: "col-type",
        render: function (data, type) {
          if (type === "display") {
            return '<span class="type-pill">' + esc(data) + "</span>";
          }
          return data;
        }
      },
      {
        title: "Definition",
        data: "definition",
        className: "col-definition",
        render: function (data, type, row) {
          if (type === "display") {
            return esc(truncate(row.definition));
          }
          return row.definition || "Not documented";
        }
      },
      {
        title: "Source",
        data: "source_file",
        className: "col-source",
        render: function (data, type, row) {
          if (type === "display") {
            return esc(row.source_file)
              + '<span class="topic">line ' + esc(row.source_line) + "</span>";
          }
          return row.source_file + ":" + row.source_line;
        }
      },
      {
        title: "Owner",
        data: "owner",
        render: function (data, type, row) {
          return row.owner || "Not documented";
        }
      },
      { data: "search_text", visible: false, searchable: true, orderable: false },
      { data: "entry_id", visible: false, searchable: false, title: "Entry ID" },
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
        visible: false,
        searchable: false,
        title: "Review flags",
        render: function (data, type, row) {
          return (row.review_flags || []).join("; ");
        }
      },
      { data: "topic", visible: false, searchable: false, title: "Topic" },
      { data: "provenance", visible: false, searchable: false, title: "Provenance" }
    ],
    columnDefs: [
      { targets: [0, 3], responsivePriority: 1 },
      { targets: [1, 2], responsivePriority: 2 },
      { targets: [4, 5], responsivePriority: 3 }
    ],
    order: [[1, "asc"], [0, "asc"]],
    pageLength: 25,
    lengthMenu: [10, 25, 50, 100],
    autoWidth: false,
    deferRender: true,
    responsive: false,
    rowGroup: { dataSrc: "category" },
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
          columns: [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
          format: {
            body: function (data, rowIndex, columnIndex) {
              return data == null ? "" : String(data);
            }
          }
        }
      }
    ],
    language: {
      emptyTable: "No definitions are published.",
      zeroRecords: "No entries match the current search and filters.",
      info: "Showing _START_ to _END_ of _TOTAL_ entries",
      lengthMenu: "Show _MENU_ entries"
    }
  });

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
  updateCount();

  var categorySelect = document.getElementById("filter-category");
  var typeSelect = document.getElementById("filter-type");
  var reviewSelect = document.getElementById("filter-review");
  var groupSelect = document.getElementById("group-by");

  function exact(value) {
    if (!value) {
      return "";
    }
    return "^" + DataTable.util.escapeRegex(value) + "$";
  }

  function applyFilters() {
    table.column(1).search(exact(categorySelect.value), true, false);
    table.column(2).search(exact(typeSelect.value), true, false);
    var review = reviewSelect.value;
    if (!review) {
      table.column(19).search("");
    } else if (review === "any") {
      table.column(19).search("definition_not_documented|needs_review|possible_conflict|alternate_formula_without_name|duplicate_name_in_section|not_in_workbook_inventory", true, false);
    } else {
      table.column(19).search(review, false, false);
    }
    table.draw();
  }

  categorySelect.addEventListener("change", applyFilters);
  typeSelect.addEventListener("change", applyFilters);
  reviewSelect.addEventListener("change", applyFilters);
  groupSelect.addEventListener("change", function () {
    if (groupSelect.value === "category") {
      table.rowGroup().enable();
      table.order([[1, "asc"], [0, "asc"]]).draw();
    } else {
      table.rowGroup().disable().draw();
    }
  });

  var searchInput = document.getElementById("dictionary-search");
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
      categorySelect.value = "";
      typeSelect.value = "";
      reviewSelect.value = "";
      groupSelect.value = "category";
      table.rowGroup().enable();
      table.order([[1, "asc"], [0, "asc"]]);
      applyFilters();
      if (searchInput) {
        searchInput.focus();
      }
    });
  }

  var params = new URLSearchParams(window.location.search);
  if (params.get("category")) categorySelect.value = params.get("category");
  if (params.get("type")) typeSelect.value = params.get("type");
  if (params.get("review")) reviewSelect.value = params.get("review");
  if (params.get("q") && searchInput) {
    searchInput.value = params.get("q");
    table.search(params.get("q"));
  }
  applyFilters();

  // Keep CSV cells as plain documented text, including explicit missing labels.
  table.on("buttons-action", function () {});
  rows.forEach(function (row) {
    ["owner", "approval_status", "effective_date", "formula", "numerator", "denominator",
      "inclusion", "exclusion", "grain", "period", "source_object", "tableau"].forEach(function (key) {
      if (!row[key]) {
        row["export_" + key] = exportValue(row, key);
      }
    });
  });
})();
