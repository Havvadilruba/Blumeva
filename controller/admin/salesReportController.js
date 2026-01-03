import { getDeliveredSalesReportService } from "../../services/salesReportService.js";
import { generateSalesReportExcel } from "../../utils/salesReportExcel.js";
import puppeteer from "puppeteer";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const loadSalesReport = async (req, res, next) => {
  try {
    const {
      reportType = "daily",
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = req.query;

    const data = await getDeliveredSalesReportService({
      reportType,
      startDate,
      endDate,
      page: Number(page),
      limit: Number(limit),
    });

    res.render("admin/salesReport", {
      layout: "layouts/admin",
      title: "Sales Report",
      pageCSS: "SalesReport",
      activePage: "SalesReport",
      ...data,
      reportType,
      startDate,
      endDate,
    });
  } catch (error) {
    next(error);
  }
};

export const loadSalesReportDownload = async (req, res, next) => {
  try {
    const { reportType = "daily", startDate, endDate } = req.query;

    const MAX_EXCEL_LIMIT = 200000;

    const data = await getDeliveredSalesReportService({
      reportType,
      startDate,
      endDate,
      page: 1,
      limit: MAX_EXCEL_LIMIT,
    });

    return generateSalesReportExcel(res, data.salesData, reportType, startDate, endDate);
  } catch (error) {
    console.error("Excel generation error:", error);
    next(error);
  }
};

export const loadSalesReportPDF = async (req, res, next) => {
  try {
    const { 
      reportType = "daily", 
      startDate, 
      endDate,
      limit = 1000 // Default safe limit from modal
    } = req.query;

    // Safety check for maximum limit
    const pdfLimit = Number(limit);
    if (pdfLimit > 100000) {
      return res.status(400).json({ 
        error: "Maximum PDF download limit is 100,000 records" 
      });
    }

    const data = await getDeliveredSalesReportService({
      reportType,
      startDate,
      endDate,
      page: 1,
      limit: pdfLimit,
    });

    // Render EJS template to HTML string
    const templatePath = path.join(__dirname, "../../views/admin/sales-report-pdf.ejs");
    const html = await ejs.renderFile(templatePath, {
      salesData: data.salesData,
      reportType,
      startDate,
      endDate,
    });

    // Generate PDF using puppeteer
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true, // Better for tables
      printBackground: true,
      margin: {
        top: "15mm",
        right: "12mm",
        bottom: "15mm",
        left: "12mm",
      },
    });

    await browser.close();

    // Send PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=sales-report-${reportType}-${Date.now()}.pdf`
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("PDF generation error:", err);
    next(err);
  }
};

export default {
  loadSalesReport,
  loadSalesReportPDF,
  loadSalesReportDownload,
};