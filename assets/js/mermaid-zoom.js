(function () {
  'use strict';

  var modal = null;
  var stage = null;
  var lastFocus = null;
  var observer = null;
  var observerTimeout = null;
  var delegatedEventsBound = false;

  function createModal() {
    if (modal) return modal;

    modal = document.createElement('div');
    modal.className = 'mermaid-modal';
    modal.hidden = true;
    modal.innerHTML = [
      '<div class="mermaid-modal__backdrop" data-mermaid-close aria-hidden="true"></div>',
      '<div class="mermaid-modal__panel" role="dialog" aria-modal="true" aria-label="Diagrama Mermaid ampliado">',
      '  <button type="button" class="mermaid-modal__close" data-mermaid-close aria-label="Cerrar diagrama" title="Cerrar">×</button>',
      '  <div class="mermaid-modal__stage"></div>',
      '</div>'
    ].join('');

    document.body.appendChild(modal);
    stage = modal.querySelector('.mermaid-modal__stage');

    modal.addEventListener('click', function (event) {
      if (event.target && event.target.hasAttribute('data-mermaid-close')) {
        closeModal();
      }
    });

    return modal;
  }

  function makeSvgFocusable(svg) {
    if (!svg.hasAttribute('tabindex')) svg.setAttribute('tabindex', '0');
    if (!svg.hasAttribute('role')) svg.setAttribute('role', 'button');
    if (!svg.hasAttribute('aria-label')) svg.setAttribute('aria-label', 'Ampliar diagrama Mermaid');
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    if (stage) stage.innerHTML = '';
    document.body.classList.remove('mermaid-modal-open');
    if (lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus();
    }
  }

  function getSvgBaseSize(svg) {
    var viewBox = svg.viewBox && svg.viewBox.baseVal;

    if (viewBox && viewBox.width && viewBox.height) {
      return {
        width: viewBox.width,
        height: viewBox.height
      };
    }

    var rect = svg.getBoundingClientRect();
    if (rect && rect.width && rect.height) {
      return {
        width: rect.width,
        height: rect.height
      };
    }

    return {
      width: 900,
      height: 600
    };
  }

  function getStageFitWidth(svg) {
    var size = getSvgBaseSize(svg);
    var aspectRatio = size.width / size.height;
    var panelWidth = Math.min(window.innerWidth * 0.96, 1180);
    var panelHeight = Math.min(window.innerHeight * 0.92, 900);
    var availableWidth = Math.max(panelWidth - 32, 320);
    var availableHeight = Math.max(panelHeight - 64, 240);

    return Math.floor(Math.min(availableWidth, availableHeight * aspectRatio));
  }

  function openModal(svg) {
    createModal();

    var clone = svg.cloneNode(true);
    var width = getStageFitWidth(svg);

    clone.removeAttribute('height');
    clone.style.width = width + 'px';
    clone.style.height = 'auto';
    clone.style.maxWidth = 'none';
    clone.style.display = 'block';

    lastFocus = document.activeElement;
    stage.innerHTML = '';
    stage.appendChild(clone);
    modal.hidden = false;
    document.body.classList.add('mermaid-modal-open');
    modal.querySelector('.mermaid-modal__close').focus();
  }

  function bindMermaidSvgs() {
    var svgs = document.querySelectorAll(
      '.main-content .mermaid svg, .main-content .language-mermaid svg'
    );

    svgs.forEach(function (svg) {
      if (svg.dataset.mermaidZoomBound === 'true') return;

      svg.dataset.mermaidZoomBound = 'true';
      makeSvgFocusable(svg);
      svg.classList.add('mermaid-zoomable');

      svg.addEventListener('click', function (event) {
        event.stopPropagation();
        openModal(svg);
      });

      svg.addEventListener('keydown', function (event) {
        var key = event.key || event.code;
        if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
          event.preventDefault();
          event.stopPropagation();
          openModal(svg);
        }
      });
    });
  }

  function closestMermaidSvg(target) {
    if (!target || typeof target.closest !== 'function') return null;
    return target.closest('.main-content .mermaid svg, .main-content .language-mermaid svg');
  }

  function bindDelegatedEvents() {
    if (delegatedEventsBound) return;
    delegatedEventsBound = true;

    document.addEventListener('click', function (event) {
      var svg = closestMermaidSvg(event.target);
      if (!svg) return;

      bindMermaidSvgs();
      openModal(svg);
    });

    document.addEventListener('keydown', function (event) {
      var key = event.key || event.code;
      var svg = closestMermaidSvg(event.target);
      if (!svg || (key !== 'Enter' && key !== ' ' && key !== 'Spacebar')) return;

      event.preventDefault();
      bindMermaidSvgs();
      openModal(svg);
    });
  }

  function observeMermaidRendering() {
    if (!('MutationObserver' in window) || observer) return;

    observer = new MutationObserver(function () {
      bindMermaidSvgs();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    observerTimeout = window.setTimeout(function () {
      if (observer) observer.disconnect();
      observer = null;
      observerTimeout = null;
    }, 10000);
  }

  function init() {
    bindMermaidSvgs();
    bindDelegatedEvents();
    observeMermaidRendering();

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && modal && !modal.hidden) {
        closeModal();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
