/* ---------------- APPLY FILTERS ---------------- */
function applyFilters() {
  const reportType = document.getElementById("reportType").value;
  const startDate = document.getElementById("startDate")?.value || "";
  const endDate = document.getElementById("endDate")?.value || "";

  const customRange1 = document.getElementById("customDateRange");
  const customRange2 = document.getElementById("customDateRange2");

  if (reportType === "custom") {
    customRange1.style.display = "";
    customRange2.style.display = "";
  } else {
    customRange1.style.display = "none";
    customRange2.style.display = "none";
  }

  const params = new URLSearchParams();
  params.set("reportType", reportType);

  if (reportType === "custom") {
    params.set("startDate", startDate);
    params.set("endDate", endDate);
  }

  window.location.href = "/admin/salesReport?" + params.toString();
}

/* ---------------- CLEAR FILTERS ---------------- */
function clearFilters() {
  window.location.href = "/admin/salesReport";
}

/* ---------------- PAGINATION ---------------- */
function changePage(page) {
  const params = new URLSearchParams(window.location.search);
  params.set("page", page);
  window.location.href = "/admin/salesReport?" + params.toString();
}

/* =================================================
   PDF DOWNLOAD WITH MODAL
================================================= */

/* 🔹 Open modal instead of direct download */
function downloadPDF() {
  openPdfModal();
}

/* 🔹 Open modal */
function openPdfModal() {
  buildPdfLimitOptions();
  document.getElementById("pdfModal").classList.remove("hidden");
  document.getElementById("pdfModal").style.display = "flex";
}

/* 🔹 Close modal */
function closePdfModal() {
  document.getElementById("pdfModal").classList.add("hidden");
  document.getElementById("pdfModal").style.display = "none";
}

/* 🔹 Show warning for large limits */
document.addEventListener("DOMContentLoaded", () => {
  const limitSelect = document.getElementById("pdfLimit");
  if (limitSelect) {
    limitSelect.addEventListener("change", (e) => {
      const limit = Number(e.target.value);
      const warning = document.getElementById("pdfWarning");

      if (limit >= 10000) {
        warning.classList.remove("hidden");
        warning.style.display = "block";
      } else {
        warning.classList.add("hidden");
        warning.style.display = "none";
      }
    });
  }
});

/* 🔹 Confirm & download PDF */
function confirmPdfDownload() {
  const limit = document.getElementById("pdfLimit").value;

  const params = new URLSearchParams(window.location.search);
  params.set("limit", limit);

  closePdfModal();

  // Open in new tab
  window.open(`/admin/sales-report/pdf?${params.toString()}`, "_blank");
}

/* ---------------- BUILD PDF LIMIT OPTIONS ---------------- */
function buildPdfLimitOptions() {
  const select = document.getElementById("pdfLimit");
  const warning = document.getElementById("pdfWarning");

  if (!select) return;

  select.innerHTML = "";

  const total = Number(window.TOTAL_ORDERS || 0);

  // Edge case: no orders
  if (total === 0) {
    const opt = document.createElement("option");
    opt.value = 0;
    opt.textContent = "No orders available";
    select.appendChild(opt);
    select.disabled = true;
    return;
  }

  const limits = [100, 500, 1000, 5000, 10000, 50000, 100000];

  const validLimits = limits.filter(l => l <= total);

  validLimits.forEach(l => {
    const opt = document.createElement("option");
    opt.value = l;
    opt.textContent =
      l >= 10000
        ? `${l.toLocaleString()} orders ⚠️`
        : `${l.toLocaleString()} orders`;

    select.appendChild(opt);
  });

  // If total < 100, add "All" option
  if (total < 100) {
    const opt = document.createElement("option");
    opt.value = total;
    opt.textContent = `${total} orders (All)`;
    select.appendChild(opt);
    select.value = total;
  } else if (validLimits.length > 0) {
    // Select first valid limit
    select.value = validLimits[0];
  }

  // If total < smallest valid limit, add it
  if (validLimits.length === 0 || total < validLimits[0]) {
    const opt = document.createElement("option");
    opt.value = total;
    opt.textContent = `${total} orders (All)`;
    select.appendChild(opt);
    select.value = total;
  }

  warning.classList.add("hidden");
  warning.style.display = "none";
  select.disabled = false;
}

/* =================================================
   EXCEL DOWNLOAD (DIRECT - DOWNLOADS FILE)
================================================= */
function downloadExcel() {
  const params = new URLSearchParams(window.location.search);
  // This will download the .xlsx file directly to user's computer
  window.location.href = "/admin/sales-report/excel?" + params.toString();
}