/* Shows the path the visitor asked for in the 404 terminal line. */
(function () {
  var path = decodeURIComponent(location.pathname || '/that-page');
  if (path.length > 48) path = path.slice(0, 47) + '…';
  var nodes = document.querySelectorAll('[data-path]');
  for (var i = 0; i < nodes.length; i++) nodes[i].textContent = path;
})();
