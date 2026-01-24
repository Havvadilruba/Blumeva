// FILE: utils/salesReportExcel.js
import ExcelJS from "exceljs";

export const generateSalesReportExcel = async (
  res,
  salesData,
  reportType = "daily",
  startDate,
  endDate
) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Admin Panel";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Sales Report", {
    views: [{ state: "frozen", ySplit: 8 }],
  });

  /* =====================================================
     TITLE SECTION
  ===================================================== */
  sheet.mergeCells("A1:J1");
  const title = sheet.getCell("A1");
  title.value = "SALES REPORT";
  title.font = { size: 20, bold: true, color: { argb: "FF1F2937" } };
  title.alignment = { horizontal: "center", vertical: "middle" };
  title.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF3F4F6" },
  };
  sheet.getRow(1).height = 30;

  sheet.mergeCells("A2:J2");
  const subTitle = sheet.getCell("A2");
  let info = `Report Type: ${reportType.toUpperCase()}`;
  if (reportType === "custom" && startDate && endDate) {
    info += ` | From: ${startDate} To: ${endDate}`;
  }
  info += ` | Generated: ${new Date().toLocaleString("en-IN")}`;
  subTitle.value = info;
  subTitle.font = { italic: true, color: { argb: "FF6B7280" } };
  subTitle.alignment = { horizontal: "center" };

  sheet.addRow([]);

  /* =====================================================
     SUMMARY SECTION
  ===================================================== */
  const summaryStartRow = 4;
  
  sheet.mergeCells(`A${summaryStartRow}:J${summaryStartRow}`);
  const summaryTitle = sheet.getCell(`A${summaryStartRow}`);
  summaryTitle.value = "SUMMARY";
  summaryTitle.font = { size: 14, bold: true };
  summaryTitle.alignment = { horizontal: "center" };
  summaryTitle.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE5E7EB" },
  };

  const summaryRow = sheet.addRow([
    "Total Sales",
    `₹${(salesData.summary.totalSales || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    "",
    "Total Orders",
    salesData.summary.totalOrders || 0,
    "",
    "Total Discounts",
    `₹${(salesData.summary.totalDiscounts || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    "",
    ""
  ]);

  summaryRow.eachCell((cell, colNumber) => {
    if (colNumber % 3 === 1) {
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF9FAFB" },
      };
    } else if (colNumber % 3 === 2) {
      cell.font = { bold: true, color: { argb: "FF059669" } };
    }
  });

  const summaryRow2 = sheet.addRow([
    "Total Refunds",
    `₹${(salesData.summary.totalRefunds || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    "",
    "Products Sold",
    salesData.summary.productsSold || 0,
    "",
    "Avg Order Value",
    `₹${(salesData.summary.averageOrderValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    "",
    ""
  ]);

  summaryRow2.eachCell((cell, colNumber) => {
    if (colNumber % 3 === 1) {
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF9FAFB" },
      };
    } else if (colNumber % 3 === 2) {
      cell.font = { bold: true, color: { argb: "FF059669" } };
    }
  });

  sheet.addRow([]);
  sheet.addRow([]);

  /* =====================================================
     TABLE HEADER
  ===================================================== */
  const headerRow = sheet.addRow([
    "Date",
    "Order ID",
    "Customer Name",
    "Customer Email",
    "Items",
    "Net Amount",
    "Discount",
    "Refund",
    "Delivery",
    "Total",
    "Payment",
    "Status"
  ]);

  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" },
    };
    cell.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });

  /* =====================================================
     COLUMN CONFIG
  ===================================================== */
  sheet.columns = [
    { key: "date", width: 12 },
    { key: "orderId", width: 20 },
    { key: "customerName", width: 20 },
    { key: "email", width: 28 },
    { key: "items", width: 8 },
    { key: "netAmount", width: 14 },
    { key: "discount", width: 14 },
    { key: "refund", width: 14 },
    { key: "delivery", width: 12 },
    { key: "total", width: 14 },
    { key: "payment", width: 12 },
    { key: "status", width: 16 }
  ];

  /* =====================================================
     DATA ROWS
  ===================================================== */
  if (salesData.transactions?.length) {
    salesData.transactions.forEach((t) => {
      const row = sheet.addRow({
        date: new Date(t.createdAt).toLocaleDateString("en-IN"),
        orderId: t.orderId,
        customerName: t.customerName || "N/A",
        email: t.customerEmail,
        items: t.itemCount,
        netAmount: t.totalAmount,
        discount: t.discount,
        refund: t.refundAmount || 0,
        delivery: t.deliveryCharge,
        total: t.finalOrderAmount,
        payment: t.paymentMethod?.toUpperCase() || "N/A",
        status: t.orderStatus || "N/A"
      });

      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };

        // Color code refunds
        if (colNumber === 8 && (t.refundAmount || 0) > 0) {
          cell.font = { color: { argb: "FFDC2626" } };
        }

        // Color code status
        if (colNumber === 12) {
          if (t.orderStatus === "Delivered") {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFD1FAE5" },
            };
            cell.font = { color: { argb: "FF065F46" } };
          } else if (t.orderStatus?.includes("Cancelled")) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFEE2E2" },
            };
            cell.font = { color: { argb: "FF991B1B" } };
          } else if (t.orderStatus?.includes("Returned")) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFEF3C7" },
            };
            cell.font = { color: { argb: "FF92400E" } };
          }
        }
      });

      // Center align certain columns
      row.getCell(5).alignment = { horizontal: "center" };
      row.getCell(11).alignment = { horizontal: "center" };
      row.getCell(12).alignment = { horizontal: "center" };
    });
  } else {
    const emptyRow = sheet.addRow(["No data available for this period"]);
    sheet.mergeCells(`A${emptyRow.number}:L${emptyRow.number}`);
    emptyRow.getCell(1).alignment = { horizontal: "center" };
    emptyRow.getCell(1).font = { italic: true, color: { argb: "FF6B7280" } };
  }

  /* =====================================================
     NUMBER FORMATTING
  ===================================================== */
  sheet.getColumn(6).numFmt = "₹#,##0.00"; // Net Amount
  sheet.getColumn(7).numFmt = "₹#,##0.00"; // Discount
  sheet.getColumn(8).numFmt = "₹#,##0.00"; // Refund
  sheet.getColumn(9).numFmt = "₹#,##0.00"; // Delivery
  sheet.getColumn(10).numFmt = "₹#,##0.00"; // Total

  /* =====================================================
     TOTAL ROW
  ===================================================== */
  sheet.addRow([]);

  const totalRow = sheet.addRow([
    "",
    "",
    "",
    "",
    "TOTAL",
    salesData.summary.totalSales || 0,
    salesData.summary.totalDiscounts || 0,
    salesData.summary.totalRefunds || 0,
    salesData.summary.deliveryCharges || 0,
    (salesData.summary.totalSales || 0) + (salesData.summary.deliveryCharges || 0),
    "",
    ""
  ]);

  totalRow.eachCell((cell, colNumber) => {
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5E7EB" },
    };
    cell.border = {
      top: { style: "medium" },
      bottom: { style: "medium" },
    };
  });

  totalRow.getCell(6).numFmt = "₹#,##0.00";
  totalRow.getCell(7).numFmt = "₹#,##0.00";
  totalRow.getCell(8).numFmt = "₹#,##0.00";
  totalRow.getCell(9).numFmt = "₹#,##0.00";
  totalRow.getCell(10).numFmt = "₹#,##0.00";

  /* =====================================================
     FILTERS
  ===================================================== */
  sheet.autoFilter = {
    from: `A${headerRow.number}`,
    to: `L${headerRow.number}`,
  };

  /* =====================================================
     RESPONSE
  ===================================================== */
  const fileName = `sales-report-${reportType}-${Date.now()}.xlsx`;

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${fileName}"`
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  await workbook.xlsx.write(res);
  res.end();
};