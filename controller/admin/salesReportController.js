import {
  getSalesReportService,
  generatePDFReportService,
  generateExcelReportService,
} from "../../services/salesReportService.js";


const getSalesReport = async (req, res) => {
  try {
    const {
      reportType = "all",
      startDate = "",
      endDate = "",
      status = "",
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    const reportData = await getSalesReportService({
      reportType,
      startDate,
      endDate,
      statusFilter: status,
      page: pageNum,
      limit: limitNum,
    });


    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({
        success: true,
        ...reportData,
        currentPage: pageNum,
        reportType,
        startDate,
        endDate,
        statusFilter: status,
        limit: limitNum,
      });
    }

    res.render("admin/salesReport", {
      layout: "layouts/admin",
      title: "Sales Report | Admin",
      pageCSS: "salesReport",
      activePage: "salesReport",
      ...reportData,
      currentPage: pageNum,
      reportType,
      startDate,
      endDate,
      statusFilter: status,
      limit: limitNum,
    });
  } catch (err) {
    console.error("Load sales report error:", err);
    
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(500).json({
        success: false,
        message: "Failed to load sales report data"

       
      });
       console.error("dvdvdjvd")
    }
    
    res.status(500).render("admin/page-404", {
      layout: "layouts/admin",
      title: "Error | Admin",
      pageCSS: "common",
      activePage: "salesReport",
      message: "Failed to load sales report",
    });
    console.error("dvdvdjggggggggvd")
  }
};

const loadSalesReportPDF = async (req, res) => {
  try {
    const { 
      reportType = "all", 
      startDate = "", 
      endDate = "", 
      status = "",
      limit = 100 
    } = req.query;

    const pdfBuffer = await generatePDFReportService({
      reportType,
      startDate,
      endDate,
      statusFilter: status,
      limit: parseInt(limit) || 100,
    });

    const filename = `sales_report_${reportType}_${status || "all"}_${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("PDF generation error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to generate PDF report",
    });
  }
};


const loadSalesReportDownload = async (req, res) => {
  try {
    const { 
      reportType = "all", 
      startDate = "", 
      endDate = "",
      status = ""
    } = req.query;

    const excelBuffer = await generateExcelReportService({
      reportType,
      startDate,
      endDate,
      statusFilter: status,
    });

    const filename = `sales_report_${reportType}_${status || "all"}_${Date.now()}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(excelBuffer);
  } catch (err) {
    console.error("Excel generation error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to generate Excel report",
    });
  }
};

export default {
  getSalesReport,
  loadSalesReportPDF,
  loadSalesReportDownload,
};