const urlParams = new URLSearchParams(window.location.search);
window.CURRENT_REPORT_TYPE = urlParams.get('reportType') || 'all';
window.CURRENT_START_DATE = urlParams.get('startDate') || '';
window.CURRENT_END_DATE = urlParams.get('endDate') || '';
window.CURRENT_STATUS = urlParams.get('status') || '';
window.CURRENT_PAGE = parseInt(urlParams.get('page')) || 1;

// Toast notification function
function showToast(message, type = 'info') {
  const backgroundColors = {
    success: '#4caf50',
    error: '#f44336',
    info: '#2196f3',
    warning: '#ff9800'
  };

  Toastify({
    text: message,
    duration: 3000,
    gravity: "top",
    position: "right",
    backgroundColor: backgroundColors[type] || backgroundColors.info,
    stopOnFocus: true
  }).showToast();
}

// Toggle custom date range visibility
document.getElementById('reportType').addEventListener('change', function() {
  const isCustom = this.value === 'custom';
  document.getElementById('customDateRange').style.display = isCustom ? '' : 'none';
  document.getElementById('customDateRange2').style.display = isCustom ? '' : 'none';
  
  // Auto-apply when changing report type
  applyFilters();
});

// Auto-apply filters when selections change (NO TOAST)
async function applyFilters() {
  const reportType = document.getElementById('reportType').value;
  const statusFilter = document.getElementById('statusFilter')?.value || '';
  const startDate = document.getElementById('startDate')?.value || '';
  const endDate = document.getElementById('endDate')?.value || '';
  const page = 1;

  // Validate custom date range
  if (reportType === 'custom') {
    if (!startDate || !endDate) {
      showToast('Please select both start and end dates for custom range', 'warning');
      return;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end < start) {
      showToast('End date cannot be before start date', 'error');
      return;
    }
  }

  // Update global variables
  window.CURRENT_REPORT_TYPE = reportType;
  window.CURRENT_START_DATE = startDate;
  window.CURRENT_END_DATE = endDate;
  window.CURRENT_STATUS = statusFilter;
  window.CURRENT_PAGE = page;

  await fetchReportData(reportType, statusFilter, startDate, endDate, page);
}

// Change page with AJAX
async function changePage(page) {
  window.CURRENT_PAGE = page;
  // Removed toast notification here
  await fetchReportData(
    window.CURRENT_REPORT_TYPE,
    window.CURRENT_STATUS,
    window.CURRENT_START_DATE,
    window.CURRENT_END_DATE,
    page
  );
}

// Fetch report data via AXIOS
async function fetchReportData(reportType, statusFilter, startDate, endDate, page) {
  try {
    showLoading();

    const params = {
      reportType,
      page,
      _: Date.now() // prevent cache
    };

    if (statusFilter) params.status = statusFilter;
    if (reportType === 'custom' && startDate && endDate) {
      params.startDate = startDate;
      params.endDate = endDate;
    }

    const response = await axios.get('/admin/salesReport', {
      params,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json'
      }
    });

    const data = response.data;

    if (!data || !data.success) {
      throw new Error(data?.message || 'Failed to load report data');
    }

    // Update UI
    updateReportContent(data);

    // Update URL without reload
    const newUrl =
      `/admin/sales-report?reportType=${reportType}&page=${page}` +
      (statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : '') +
      (reportType === 'custom' && startDate && endDate
        ? `&startDate=${startDate}&endDate=${endDate}`
        : '');

    window.history.pushState({}, '', newUrl);

    hideLoading();

    // Only show success toast for pagination, not filter changes
    if (page > 1) {
      showToast(`Loaded page ${page}`, 'success');
    }

  } catch (error) {
    console.error('Axios error:', error);

    const message =
      error.response?.data?.message ||
      error.message ||
      'Failed to load report data';

    showToast(message, 'error');
    hideLoading();
  }
}


// Update report content on page
function updateReportContent(data) {
  // Update summary cards
  updateSummaryCards(data.summary);
  
  // Update table
  updateTable(data.report);
  
  // Update pagination
  updatePagination(data.currentPage, data.totalPages);
  
  // Update total orders for PDF modal
  window.TOTAL_ORDERS = data.totalTransactions || 0;
}

// Update summary cards
function updateSummaryCards(summary) {
  const cards = document.querySelectorAll('.summary-card .card-content h3');
  if (cards.length >= 4) {
    cards[0].textContent = summary?.totalOrders || 0;
    cards[1].textContent = `₹${summary.netSales.toFixed(2)}`;
    cards[2].textContent = `₹${(summary.totalDiscounts || 0).toFixed(2)}`;
    cards[3].textContent = summary.productsSold;
  }
}

// Update table with new data
function updateTable(report) {
  const tbody = document.querySelector('.sales-table tbody');
  
  if (!report || report.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="12" class="text-center" style="padding: 3rem; color: #9ca3af; font-style: italic;">
          <i class="fas fa-inbox" style="font-size: 2rem; display: block; margin-bottom: 0.75rem; opacity: 0.3;"></i>
          No transactions found for the selected period
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = report.map(row => `
    <tr>
      <td>
        <span class="font-semibold text-sm">#${row.orderId}</span>
      </td>
      <td>
        <div class="customer-info">
          <strong>${row.userName}</strong>
          <small>${row.userEmail}</small>
        </div>
      </td>
      <td>${row.itemName}</td>
      <td>${row.variantInfo}</td>
      <td class="text-center">
        <span class="font-semibold">${row.quantity}</span>
      </td>
      <td class="text-right">₹${row.salePrice.toFixed(2)}</td>
      <td class="text-right discount">₹${row.itemOfferDiscount.toFixed(2)}</td>
      <td class="text-right discount">₹${row.itemCouponShare.toFixed(2)}</td>
      <td class="text-right net-amount">₹${row.itemNetTotal.toFixed(2)}</td>
      <td>
        <span class="payment-badge ${row.paymentMethod}">
          ${row.paymentMethod.toUpperCase()}
        </span>
      </td>
      <td>
        <span class="status-badge ${row.itemStatus.toLowerCase().replace(/ /g, '-')}">
          ${row.itemStatus}
        </span>
      </td>
      <td>
        ${row.statusDate ? new Date(row.statusDate).toLocaleDateString("en-IN") : "—"}
      </td>
    </tr>
  `).join('');
}

// Update pagination
function updatePagination(currentPage, totalPages) {
  const paginationContainer = document.querySelector('.pagination');
  
  if (!paginationContainer) return;
  
  if (totalPages <= 1) {
    paginationContainer.style.display = 'none';
    return;
  }
  
  paginationContainer.style.display = 'flex';
  
  let paginationHTML = '';
  
  // Previous button
  if (currentPage > 1) {
    paginationHTML += `
      <button onclick="changePage(${currentPage - 1})" class="page-btn">
        <i class="fas fa-chevron-left"></i>
        <span>Previous</span>
      </button>
    `;
  }
  
  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
      paginationHTML += `
        <button 
          onclick="changePage(${i})" 
          class="page-btn ${i === currentPage ? 'active' : ''}"
        >
          ${i}
        </button>
      `;
    } else if (i === currentPage - 3 || i === currentPage + 3) {
      paginationHTML += '<span class="page-dots">...</span>';
    }
  }
  
  // Next button
  if (currentPage < totalPages) {
    paginationHTML += `
      <button onclick="changePage(${currentPage + 1})" class="page-btn">
        <span>Next</span>
        <i class="fas fa-chevron-right"></i>
      </button>
    `;
  }
  
  paginationContainer.innerHTML = paginationHTML;
}

// Show loading state
function showLoading() {
  const tableContainer = document.querySelector('.table-container');
  const loadingIndicator = document.getElementById('loadingIndicator');
  
  if (!loadingIndicator) {
    // Create loading indicator
    const indicator = document.createElement('div');
    indicator.id = 'loadingIndicator';
    indicator.className = 'loading-indicator';
    document.body.appendChild(indicator);
  }
  
  if (tableContainer) {
    tableContainer.style.opacity = '0.7';
    tableContainer.style.pointerEvents = 'none';
  }
}

// Hide loading state
function hideLoading() {
  const tableContainer = document.querySelector('.table-container');
  const loadingIndicator = document.getElementById('loadingIndicator');
  
  if (loadingIndicator) {
    loadingIndicator.remove();
  }
  
  if (tableContainer) {
    tableContainer.style.opacity = '1';
    tableContainer.style.pointerEvents = 'auto';
  }
}

// PDF Download with modal
function downloadPDF() {
  openPdfModal();
}

function openPdfModal() {
  const modal = document.getElementById('pdfModal');
  const limitSelect = document.getElementById('pdfLimit');
  const warning = document.getElementById('pdfWarning');
  
  limitSelect.innerHTML = '';
  const limits = [50, 100, 200, 500, 1000, window.TOTAL_ORDERS];
  const uniqueLimits = [...new Set(limits)].filter(l => l > 0).sort((a, b) => a - b);
  
  uniqueLimits.forEach(limit => {
    const option = document.createElement('option');
    option.value = limit;
    option.textContent = limit === window.TOTAL_ORDERS 
      ? `All (${limit} orders)` 
      : `${limit} orders`;
    limitSelect.appendChild(option);
  });
  
  if (window.TOTAL_ORDERS > 100) {
    warning.classList.remove('hidden');
  } else {
    warning.classList.add('hidden');
  }
  
  modal.classList.remove('hidden');
}

function closePdfModal() {
  document.getElementById('pdfModal').classList.add('hidden');
}

function confirmPdfDownload() {
  const limit = document.getElementById('pdfLimit').value;
  const reportType = window.CURRENT_REPORT_TYPE;
  const startDate = window.CURRENT_START_DATE;
  const endDate = window.CURRENT_END_DATE;
  const status = window.CURRENT_STATUS;
  
  let url = `/admin/sales-report/pdf?reportType=${reportType}&limit=${limit}`;
  
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;
  if (status) url += `&status=${encodeURIComponent(status)}`;
  
  closePdfModal();
  showToast('Generating PDF report...', 'info');
  window.open(url, '_blank');
}

// Excel Download
function downloadExcel() {
  const reportType = window.CURRENT_REPORT_TYPE;
  const startDate = window.CURRENT_START_DATE;
  const endDate = window.CURRENT_END_DATE;
  const status = window.CURRENT_STATUS;
  
  let url = `/admin/sales-report/excel?reportType=${reportType}`;
  
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;
  if (status) url += `&status=${encodeURIComponent(status)}`;
  
  showToast('Generating Excel report...', 'info');
  window.open(url, '_blank');
}

// Handle browser back/forward buttons
window.addEventListener('popstate', function(event) {
  const urlParams = new URLSearchParams(window.location.search);
  const reportType = urlParams.get('reportType') || 'all';
  const startDate = urlParams.get('startDate') || '';
  const endDate = urlParams.get('endDate') || '';
  const status = urlParams.get('status') || '';
  const page = parseInt(urlParams.get('page')) || 1;
  
  // Update UI elements
  document.getElementById('reportType').value = reportType;
  document.getElementById('statusFilter').value = status;
  
  if (reportType === 'custom') {
    document.getElementById('customDateRange').style.display = '';
    document.getElementById('customDateRange2').style.display = '';
    if (startDate) document.getElementById('startDate').value = startDate;
    if (endDate) document.getElementById('endDate').value = endDate;
  } else {
    document.getElementById('customDateRange').style.display = 'none';
    document.getElementById('customDateRange2').style.display = 'none';
  }
  
  // Fetch data
  fetchReportData(reportType, status, startDate, endDate, page);
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closePdfModal();
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  const today = new Date().toISOString().split('T')[0];
  const dateInputs = document.querySelectorAll('input[type="date"]');
  dateInputs.forEach(input => {
    input.max = today;
    input.min = '2020-01-01';
  });
  
  const reportTypeSelect = document.getElementById('reportType');
  if (reportTypeSelect.value === 'custom') {
    document.getElementById('customDateRange').style.display = '';
    document.getElementById('customDateRange2').style.display = '';
  }
  
  // Auto-apply when date inputs change (for custom range)
  document.getElementById('startDate')?.addEventListener('change', applyFilters);
  document.getElementById('endDate')?.addEventListener('change', applyFilters);
});

// Add CSS for loading indicator
const style = document.createElement('style');
style.textContent = `
  .loading-indicator {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
    background: linear-gradient(90deg, #4299e1, #3182ce);
    z-index: 9999;
    animation: loading 1.5s infinite;
    transform-origin: left;
  }
  
  @keyframes loading {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  
  .toastify {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    font-size: 14px;
    border-radius: 6px;
    padding: 12px 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
`;
document.head.appendChild(style);