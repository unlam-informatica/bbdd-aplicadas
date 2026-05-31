(function () {
  'use strict';

  function buildToc() {
    var content = document.querySelector('.main-content');
    if (!content) return;

    var headings = content.querySelectorAll('h2, h3');
    if (headings.length < 2) return;

    // Build TOC nav
    var nav = document.createElement('nav');
    nav.className = 'page-toc';
    nav.setAttribute('aria-label', 'Tabla de contenidos');

    var title = document.createElement('p');
    title.className = 'page-toc-title';
    title.textContent = 'En esta página';
    nav.appendChild(title);

    var ul = document.createElement('ul');
    var hasItems = false;

    headings.forEach(function (h) {
      if (!h.id) return;
      var li = document.createElement('li');
      li.className = 'toc-' + h.tagName.toLowerCase();
      var a = document.createElement('a');
      a.href = '#' + h.id;
      // heading_anchors inyecta un <a> de ancla dentro del heading:
      // tomamos solo el primer text node para evitar capturar el símbolo #
      var text = '';
      h.childNodes.forEach(function (node) {
        if (node.nodeType === Node.TEXT_NODE) text += node.textContent;
      });
      a.textContent = text.trim() || h.textContent.trim();
      li.appendChild(a);
      ul.appendChild(li);
      hasItems = true;
    });

    if (!hasItems) return;
    nav.appendChild(ul);

    // Envolver .main-content y el TOC en un flex row
    var wrapper = document.createElement('div');
    wrapper.className = 'main-content-toc-wrap';
    content.parentNode.insertBefore(wrapper, content);
    wrapper.appendChild(content);
    wrapper.appendChild(nav);

    // Resaltar la sección activa mientras se scrollea
    if ('IntersectionObserver' in window) {
      var links = ul.querySelectorAll('a');

      function setActive(id) {
        links.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
        });
      }

      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      }, { rootMargin: '0px 0px -55% 0px', threshold: 0 });

      headings.forEach(function (h) { if (h.id) io.observe(h); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildToc);
  } else {
    buildToc();
  }
})();
