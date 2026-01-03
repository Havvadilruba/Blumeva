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

  const sheet = workbook.addWorksheet("Delivered Sales", {
    views: [{ state: "frozen", ySplit: 5 }],
  });

  /* =====================================================
     TITLE
  ===================================================== */
  sheet.mergeCells("A1:H1");
  const title = sheet.getCell("A1");
  title.value = "Delivered Sales Report";
  title.font = { size: 18, bold: true };
  title.alignment = { horizontal: "center", vertical: "middle" };

  sheet.mergeCells("A2:H2");
  const subTitle = sheet.getCell("A2");
  let info = `Report Type: ${reportType.toUpperCase()}`;
  if (reportType === "custom" && startDate && endDate) {
    info += ` | ${startDate} → ${endDate}`;
  }
  subTitle.value = info;
  subTitle.font = { italic: true };
  subTitle.alignment = { horizontal: "center" };

  sheet.addRow([]);
  sheet.addRow([]);

  /* =====================================================
     TABLE HEADER
  ===================================================== */
  const headerRow = sheet.addRow([
    "Date",
    "Order ID",
    "Email",
    "Items",
    "Amount",
    "Discount",
    "Payment Method",
  ]);

  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF305496" },
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
    { key: "date", width: 15 },
    { key: "orderId", width: 22 },
    { key: "email", width: 30 },
    { key: "items", width: 10 },
    { key: "amount", width: 15 },
    { key: "discount", width: 15 },
    { key: "payment", width: 20 },
  ];

  /* =====================================================
     DATA ROWS
  ===================================================== */
  if (salesData.transactions?.length) {
    salesData.transactions.forEach((t) => {
      const row = sheet.addRow({
        date: new Date(t.createdAt).toLocaleDateString("en-IN"),
        orderId: t.orderId,
        email: t.customerEmail,
        items: t.itemCount,
        amount: t.totalAmount,
        discount: t.discount,
        payment: t.paymentMethod || "N/A",
      });

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });
  } else {
    sheet.addRow(["No data available for this period"]);
  }

  /* =====================================================
     NUMBER FORMATTING
  ===================================================== */
  sheet.getColumn(6).numFmt = "₹#,##0.00"; // Amount
  sheet.getColumn(7).numFmt = "₹#,##0.00"; // Discount

  /* =====================================================
     TOTAL ROW (OPTIONAL – MATCHES YOUR SCREENSHOT)
  ===================================================== */
  sheet.addRow([]);

  const totalRow = sheet.addRow([
    "",
    "",
    "",
    "TOTAL",
    "",
    salesData.totalSales || 0,
    salesData.totalDiscounts || 0,
    "",
  ]);

  totalRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE7E6E6" },
    };
  });

  totalRow.getCell(6).numFmt = "₹#,##0.00";
  totalRow.getCell(7).numFmt = "₹#,##0.00";

  /* =====================================================
     FILTERS
  ===================================================== */
  sheet.autoFilter = {
    from: `A${headerRow.number}`,
    to: `H${headerRow.number}`,
  };

  /* =====================================================
     RESPONSE
  ===================================================== */
  const fileName = `delivered-sales-report-${reportType}-${Date.now()}.xlsx`;

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
