document.getElementById("searchForm").addEventListener("submit", function (e) {
  const input = this.querySelector("input[name='search']").value.trim();
  if (!input) e.preventDefault(); // prevent reload if search empty
});
