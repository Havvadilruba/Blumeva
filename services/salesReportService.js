
import {
  getSalesReportData,
  getOrderTransations,
  getOrderTransactionsTotal,
  getStatusCounts
} from "../repositories/orderRepository.js";

import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";


const getDateRange = (reportType, startDate, endDate) => {
  const now = new Date();

  switch (reportType) {
    case "daily": {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    case "weekly": {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }

    case "monthly":
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: now
      };

    case "yearly":
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: now
      };

    case "custom": {
      if (!startDate || !endDate) return null;
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    default:
      return null;
  }
};


const buildBasePipeline = (statusFilter, dateRange) => {
  const pipeline = [
    { $unwind: "$orderedItems" }
  ];

  if (statusFilter) {
    pipeline.push({
      $match: { "orderedItems.itemStatus": statusFilter }
    });
  }

  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user"
      }
    },
    { $unwind: "$user" },
    {
      $lookup: {
        from: "products",
        localField: "orderedItems.productId",
        foreignField: "_id",
        as: "product"
      }
    },
    { $unwind: "$product" },
    {
      $lookup: {
        from: "variants",
        localField: "orderedItems.variantId",
        foreignField: "_id",
        as: "variant"
      }
    },
    { $unwind: "$variant" },
    {
      $addFields: {
        itemOfferDiscount: {
          $multiply: ["$orderedItems.discountAmount", "$orderedItems.quantity"]
        },
        itemCouponShare: "$orderedItems.couponShare",
        itemTotalDiscount: {
          $add: [
            { $multiply: ["$orderedItems.discountAmount", "$orderedItems.quantity"] },
            "$orderedItems.couponShare"
          ]
        },
        itemNetTotal: {
          $subtract: [
            { $multiply: ["$orderedItems.salePrice", "$orderedItems.quantity"] },
            {
              $add: [
                { $multiply: ["$orderedItems.discountAmount", "$orderedItems.quantity"] },
                "$orderedItems.couponShare"
              ]
            }
          ]
        },
        actualRevenue: {
          $cond: [
            {
              $or: [
                {
                  $and: [
                    { $in: ["$paymentMethod", ["razorpay", "wallet"]] },
                    { $not: { $in: ["$orderedItems.itemStatus", ["Cancelled", "Returned"]] } }
                  ]
                },
                {
                  $and: [
                    { $eq: ["$paymentMethod", "cod"] },
                    { $eq: ["$orderedItems.itemStatus", "Delivered"] }
                  ]
                }
              ]
            },
            {
              $subtract: [
                { $multiply: ["$orderedItems.salePrice", "$orderedItems.quantity"] },
                {
                  $add: [
                    { $multiply: ["$orderedItems.discountAmount", "$orderedItems.quantity"] },
                    "$orderedItems.couponShare"
                  ]
                }
              ]
            },
            0
          ]
        },
        statusDate: {
          $switch: {
            branches: [
              { case: { $eq: ["$orderedItems.itemStatus", "Delivered"] }, then: "$orderedItems.itemTimeline.deliveredAt" },
              { case: { $eq: ["$orderedItems.itemStatus", "Cancelled"] }, then: "$orderedItems.itemTimeline.cancelledAt" },
              { case: { $eq: ["$orderedItems.itemStatus", "Returned"] }, then: "$orderedItems.itemTimeline.returnedAt" }
            ],
            default: "$createdAt"
          }
        }
      }
    }
  );

  if (dateRange) {
    pipeline.push({
      $match: {
        statusDate: {
          $gte: dateRange.start,
          $lte: dateRange.end
        }
      }
    });
  }

  return pipeline;
};


const getReportProjection = () => ({
  orderId: 1,
  userName: "$user.name",
  userEmail: "$user.email",
  itemName: "$product.name",
  variantInfo: {
    $concat: [
      { $toString: "$variant.quantityValue" },
      " ",
      "$variant.quantityType"
    ]
  },
  quantity: "$orderedItems.quantity",
  regularPrice: "$orderedItems.regularPrice",
  salePrice: "$orderedItems.salePrice",
  itemOfferDiscount: 1,
  itemCouponShare: 1,
  itemTotalDiscount: 1,
  itemNetTotal: 1,
  actualRevenue: 1,
  paymentMethod: 1,
  itemStatus: "$orderedItems.itemStatus",
  statusDate: 1,
  createdAt: 1
});


export const getSalesReportService = async ({
  reportType,
  startDate,
  endDate,
  statusFilter,
  page,
  limit
}) => {
  const dateRange = getDateRange(reportType, startDate, endDate);
  const validPage = parseInt(page) || 1;
  const validLimit = parseInt(limit) || 10;
  const skip = (validPage - 1) * validLimit;

  const basePipeline = buildBasePipeline(statusFilter, dateRange);

  const dataPipeline = [
    ...basePipeline,
    { $project: getReportProjection() },
    { $sort: { statusDate: -1, createdAt: -1 } }
  ];

  const transactions = await getOrderTransations(
    dataPipeline,
    skip,
    validLimit
  );

  const totals = await getOrderTransactionsTotal(basePipeline);

  const statusMatch = dateRange
    ? { statusDate: { $gte: dateRange.start, $lte: dateRange.end } }
    : {};

  const statusCounts = await getStatusCounts(statusMatch);

  return {
    report: transactions,
    summary: {
      totalOrders: totals?.totalOrders || 0,
      grossSales: totals?.grossSales || 0,
      netSales: totals?.netSales || 0,
      totalDiscounts: totals?.totalDiscounts || 0,
      productsSold: totals?.productsSold || 0,
      statusCounts
    },
    totalTransactions: totals?.totalOrders || 0,
    totalPages: Math.ceil((totals?.totalOrders || 0) / validLimit)
  };
};


export const generatePDFReportService = async ({
  reportType,
  startDate,
  endDate,
  statusFilter,
  limit
}) => {
  const dateRange = getDateRange(reportType, startDate, endDate);
  const basePipeline = buildBasePipeline(statusFilter, dateRange);

  
  const totals = await getOrderTransactionsTotal(basePipeline);


  const pipeline = [
    ...basePipeline,
    { $project: getReportProjection() },
    { $sort: { statusDate: -1, createdAt: -1 } },
    { $limit: parseInt(limit) || 100 }
  ];

  const transactions = await getSalesReportData(pipeline);

  const doc = new PDFDocument({ 
    margin: 30, 
    size: "A4",
    layout: 'landscape' 
  });
  
  const chunks = [];

  return new Promise((resolve, reject) => {
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Title
    doc.fontSize(18).font('Helvetica-Bold').text("SALES REPORT", { align: "center" });
    doc.moveDown(0.5);
    
    // Metadata
    doc.fontSize(10).font('Helvetica');
    doc.text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
    doc.text(`Report Type: ${reportType.toUpperCase()}${statusFilter ? ` | Status: ${statusFilter}` : ''}`, { align: "center" });
    if (dateRange) {
      doc.text(`Period: ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`, { align: "center" });
    }
    doc.text(`Showing ${transactions.length} of ${totals?.totalOrders || 0} transactions`, { align: "center" });
    doc.moveDown(1.5);

    // Summary Cards
    const boxY = doc.y;
    const boxWidth = 130;
    const boxHeight = 45;
    const gap = 20;
    const startX = 80;

    // card styl 
    const drawCard = (x, y, title, value) => {
      
      doc.rect(x, y, boxWidth, boxHeight).stroke();
      
      
      doc.fontSize(8).font('Helvetica')
         .text(title, x + 8, y + 10, { width: boxWidth - 16 });
   
      doc.fontSize(14).font('Helvetica-Bold')
         .text(value, x + 8, y + 24, { width: boxWidth - 16 });
    };

    //  1
    drawCard(startX, boxY, 'Total Orders', 
             (totals?.totalOrders || 0).toString());
    
    drawCard(startX + boxWidth + gap, boxY, 'Total Sales', 
             `₹${(totals?.netSales || 0).toFixed(2)}`);
    
    drawCard(startX + (boxWidth + gap) * 2, boxY, 'Total Coupon Discounts', 
             `₹${(totals?.totalDiscounts || 0).toFixed(2)}`);
    
    drawCard(startX + (boxWidth + gap) * 3, boxY, 'Products Sold', 
             (totals?.productsSold || 0).toString());

    doc.y = boxY + boxHeight + 20;

    // table header
    const tableTop = doc.y;
    const colWidths = [45, 90, 100, 35, 50, 55, 55, 60, 55, 60, 70];
    let xPos = 30;

    doc.fontSize(8).font('Helvetica-Bold');
    const headers = ['Order', 'Customer', 'Item', 'Qty', 'Price', 'Offer', 'Coupon', 'Net Amt', 'Payment', 'Status', 'Date'];
    
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' });
      xPos += colWidths[i];
    });

    doc.moveTo(30, tableTop + 15).lineTo(800, tableTop + 15).stroke();

    // table rows
    let yPos = tableTop + 20;
    doc.font('Helvetica').fontSize(7);

    transactions.forEach((t, index) => {
      if (yPos > 550) {  
        doc.addPage();
        yPos = 50;
        
        xPos = 30;
        doc.fontSize(8).font('Helvetica-Bold');
        headers.forEach((header, i) => {
          doc.text(header, xPos, yPos, { width: colWidths[i], align: 'left' });
          xPos += colWidths[i];
        });
        doc.moveTo(30, yPos + 15).lineTo(800, yPos + 15).stroke();
        yPos += 20;
        doc.font('Helvetica').fontSize(7);
      }

      xPos = 30;
      const rowData = [
        `#${t.orderId}`,
        t.userEmail || 'N/A',
        t.itemName || 'N/A',
        t.quantity.toString(),
        `₹${t.salePrice?.toFixed(2) || '0.00'}`,
        `₹${t.itemOfferDiscount?.toFixed(2) || '0.00'}`,
        `₹${t.itemCouponShare?.toFixed(2) || '0.00'}`,
        `₹${t.itemNetTotal?.toFixed(2) || '0.00'}`,
        (t.paymentMethod || 'N/A').toUpperCase(),
        t.itemStatus || 'N/A',
        t.statusDate ? new Date(t.statusDate).toLocaleDateString('en-IN') : '—'
      ];

      rowData.forEach((data, i) => {
        doc.text(data, xPos, yPos, { width: colWidths[i], align: 'left' });
        xPos += colWidths[i];
      });

      yPos += 18;
      
      // Subtle row separator
      if (index < transactions.length - 1) {
        doc.strokeColor('#eeeeee').moveTo(30, yPos - 2).lineTo(800, yPos - 2).stroke();
        doc.strokeColor('#000000');
      }
    });

    doc.end();
  });
};


export const generateExcelReportService = async ({
  reportType,
  startDate,
  endDate,
  statusFilter
}) => {
  const dateRange = getDateRange(reportType, startDate, endDate);

  const pipeline = [
    ...buildBasePipeline(statusFilter, dateRange),
    { $project: getReportProjection() },
    { $sort: { statusDate: -1, createdAt: -1 } }
  ];

  const transactions = await getSalesReportData(pipeline);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sales Report");

  worksheet.columns = [
    { header: "Order ID", key: "orderId", width: 15 },
    { header: "Customer Email", key: "userEmail", width: 30 },
    { header: "Item Name", key: "itemName", width: 30 },
    { header: "Variant", key: "variantInfo", width: 15 },
    { header: "Quantity", key: "quantity", width: 10 },
    { header: "Sale Price", key: "salePrice", width: 12 },
    { header: "Offer Discount", key: "itemOfferDiscount", width: 15 },
    { header: "Coupon Discount", key: "itemCouponShare", width: 15 },
    { header: "Net Amount", key: "itemNetTotal", width: 15 },
    { header: "Payment Method", key: "paymentMethod", width: 15 },
    { header: "Status", key: "itemStatus", width: 15 },
    { header: "Status Date", key: "statusDate", width: 15 }
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Add data rows
  transactions.forEach(row => {
    worksheet.addRow({
      orderId: row.orderId,
      userEmail: row.userEmail,
      itemName: row.itemName,
      variantInfo: row.variantInfo,
      quantity: row.quantity,
      salePrice: row.salePrice,
      itemOfferDiscount: row.itemOfferDiscount,
      itemCouponShare: row.itemCouponShare,
      itemNetTotal: row.itemNetTotal,
      paymentMethod: row.paymentMethod?.toUpperCase(),
      itemStatus: row.itemStatus,
      statusDate: row.statusDate ? new Date(row.statusDate).toLocaleDateString('en-IN') : '—'
    });
  });

  // Add borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  return workbook.xlsx.writeBuffer();
};