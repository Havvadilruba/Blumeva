import {
  getOrderListService,
  getOrderDetailService,
  updateOrderStatusService,
  handleReturnRequestService,
  markItemReturnedService
} from "../../services/orderService.js";

const loadOrders = async (req, res) => {
  try {
    const { search = "", status = "", payment = "" } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;

    const { orders, totalOrders, totalPages } = await getOrderListService(
      search,
      status,
      payment,
      page,
      limit
    );

    res.render("admin/orders", {
      layout: "layouts/admin",
      title: "Orders | Admin",
      pageCSS: "orders",
      activePage: "orders",
      orders,
      currentPage: page,
      totalPages,
      totalOrders,
      search,
      statusFilter: status,
      paymentFilter: payment,
      limit,
    });
  } catch (err) {
    console.error("Load orders error:", err);
    res.redirect("/admin/pageNotFound");
  }
};

const loadOrderDetail = async (req, res) => {
  try {
    const order = await getOrderDetailService(req.params.id);
    if (!order) return res.redirect("/admin/pageNotFound");

    res.render("admin/orderDetails", {
      layout: "layouts/admin",
      title: `Order ${order.orderId} | Admin`,
      pageCSS: "orderDetail",
      activePage: "orders",
      order,
    });
  } catch (err) {
    console.error("Load order detail error:", err);
    res.redirect("/admin/pageNotFound");
  }
};

const updateOrderStatus = async (req, res) => {
  const result = await updateOrderStatusService(req.params.id, req.body.status);
  res.status(result.success ? 200 : 400).json(result);
};

const handleReturnRequest = async (req, res) => {
  const { itemId, action, adminNote } = req.body;
  const result = await handleReturnRequestService(req.params.id, itemId, action, adminNote);
  res.status(result.success ? 200 : 400).json(result);
};

const markItemReturned = async (req, res) => {
  const result = await markItemReturnedService(req.params.id, req.body
   .itemId);
  res.status(result.success ? 200 : 400).json(result);
};

export default {
  loadOrders,
  loadOrderDetail,
  updateOrderStatus,
  handleReturnRequest,
  markItemReturned,
};
