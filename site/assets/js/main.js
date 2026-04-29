// Additional Context Menus — GitHub Pages site scripts

document.addEventListener('DOMContentLoaded', function () {
  initializeNavigation();
  initializeScrollEffects();
  initializeCodeCopyButtons();
  initializeTabSwitching();
  initializeInteractiveElements();
});

function setNavExpanded(isOpen) {
  const navToggle = document.getElementById('nav-toggle');
  if (navToggle) {
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }
}

/**
 * Initialize responsive navigation
 */
function initializeNavigation() {
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (navToggle && navMenu) {
    setNavExpanded(navMenu.classList.contains('active'));

    navToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      const willOpen = !navMenu.classList.contains('active');
      navMenu.classList.toggle('active');
      navToggle.classList.toggle('active');
      setNavExpanded(willOpen);

      const spans = navToggle.querySelectorAll('span');
      spans.forEach((span, index) => {
        if (navToggle.classList.contains('active')) {
          if (index === 0) span.style.transform = 'rotate(45deg) translate(5px, 5px)';
          if (index === 1) span.style.opacity = '0';
          if (index === 2) span.style.transform = 'rotate(-45deg) translate(7px, -6px)';
        } else {
          span.style.transform = 'none';
          span.style.opacity = '1';
        }
      });
    });

    document.addEventListener('click', function (e) {
      if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
        navMenu.classList.remove('active');
        navToggle.classList.remove('active');
        setNavExpanded(false);

        const spans = navToggle.querySelectorAll('span');
        spans.forEach((span) => {
          span.style.transform = 'none';
          span.style.opacity = '1';
        });
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        navToggle.classList.remove('active');
        setNavExpanded(false);
        navToggle.querySelectorAll('span').forEach((s) => {
          s.style.transform = 'none';
          s.style.opacity = '1';
        });
        navToggle.focus();
      }
    });
  }
}

/**
 * Initialize scroll effects and animations
 */
function initializeScrollEffects() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px',
  };

  let delayCounter = 0;
  let resetDelayTimeout = null;

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Add a stagger delay if multiple elements appear at once
        if (delayCounter > 0) {
          entry.target.style.transitionDelay = `${delayCounter * 100}ms`;
        }

        entry.target.classList.add('animate-in');

        delayCounter++;

        // Reset the counter when batch finishes
        clearTimeout(resetDelayTimeout);
        resetDelayTimeout = setTimeout(() => {
          delayCounter = 0;
        }, 100);

        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  const animateElements = document.querySelectorAll(
    '.feature-card, .feature-item, .example-card, .service-card, .step, .command-card, .architecture-card, .metric-card, .screenshot-item, .method-card, .requirement-card, .config-card, .trouble-card, .next-step-card, .import-option, .move-feature, .save-feature, .practice-card, .step-flow .step-item, .arch-layer, .layer-components .component, .build-feature, .dev-section, .perf-stat, .download-card, .version-card, .support-card, .changelog-preview, .installation-tabs',
  );

  animateElements.forEach((el) => {
    el.classList.add('animate-on-scroll');
    observer.observe(el);
  });

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const id = this.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    });
  });

  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 10) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    });
  }
}

/**
 * Initialize code copy buttons
 */
function initializeCodeCopyButtons() {
  const codeBlocks = document.querySelectorAll('pre code, .code-example code');

  codeBlocks.forEach((codeBlock) => {
    const wrapper = codeBlock.closest('pre') || codeBlock.closest('.code-example');
    if (wrapper && !wrapper.querySelector('.copy-button')) {
      const copyButton = document.createElement('button');
      copyButton.type = 'button';
      copyButton.className = 'copy-button';
      copyButton.innerHTML = '<i class="fas fa-copy"></i>';
      copyButton.title = 'Copy to clipboard';

      wrapper.style.position = 'relative';
      wrapper.appendChild(copyButton);

      copyButton.addEventListener('click', function () {
        const code = codeBlock.textContent;
        copyToClipboard(code);

        const originalHTML = copyButton.innerHTML;
        copyButton.innerHTML = '<i class="fas fa-check"></i>';
        copyButton.classList.add('success');

        setTimeout(() => {
          copyButton.innerHTML = originalHTML;
          copyButton.classList.remove('success');
        }, 2000);
      });
    }
  });
}

/**
 * Initialize tab switching functionality
 */
function initializeTabSwitching() {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach((button) => {
    button.addEventListener('click', function () {
      const targetTab = this.dataset.tab;

      tabButtons.forEach((btn) => btn.classList.remove('active'));
      tabPanels.forEach((panel) => panel.classList.remove('active'));

      this.classList.add('active');
      const targetPanel = document.getElementById(targetTab);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });

  tabButtons.forEach((button, index) => {
    button.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const nextIndex =
          e.key === 'ArrowLeft'
            ? (index - 1 + tabButtons.length) % tabButtons.length
            : (index + 1) % tabButtons.length;
        tabButtons[nextIndex].click();
        tabButtons[nextIndex].focus();
      }
    });
  });
}

/**
 * Initialize interactive elements
 */
function initializeInteractiveElements() {
  const cards = document.querySelectorAll(
    '.feature-card, .service-card, .command-card, .architecture-card, .metric-card, .method-card, .requirement-card, .config-card, .trouble-card, .next-step-card, .import-option, .move-feature, .save-feature, .practice-card',
  );

  cards.forEach((card) => {
    card.addEventListener('mouseenter', function () {
      this.style.transform = 'translateY(-5px)';
    });

    card.addEventListener('mouseleave', function () {
      this.style.transform = 'translateY(0)';
    });
  });

  const downloadButtons = document.querySelectorAll(
    '.btn[href*="marketplace"], .btn[href*="releases"]',
  );

  downloadButtons.forEach((button) => {
    button.addEventListener('click', function () {
      this.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.style.transform = 'scale(1)';
      }, 150);
    });
  });

  const tooltipElements = document.querySelectorAll('[title]');
  tooltipElements.forEach((element) => {
    element.addEventListener('mouseenter', showTooltip);
    element.addEventListener('mouseleave', hideTooltip);
  });
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand('copy');
    textArea.remove();
    return Promise.resolve();
  } catch (err) {
    textArea.remove();
    return Promise.reject(err);
  }
}

/**
 * Show tooltip
 */
function showTooltip(e) {
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.textContent = e.target.title;

  e.target.dataset.originalTitle = e.target.title;
  e.target.removeAttribute('title');

  document.body.appendChild(tooltip);

  const rect = e.target.getBoundingClientRect();
  tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
  tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';

  setTimeout(() => tooltip.classList.add('show'), 100);

  e.target.tooltipElement = tooltip;
}

/**
 * Hide tooltip
 */
function hideTooltip(e) {
  if (e.target.tooltipElement) {
    e.target.tooltipElement.remove();
    e.target.tooltipElement = null;
  }

  if (e.target.dataset.originalTitle) {
    e.target.title = e.target.dataset.originalTitle;
    delete e.target.dataset.originalTitle;
  }
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

window.addEventListener(
  'scroll',
  throttle(function () {
    /* reserved for scroll-driven UI */
  }, 16),
);

window.addEventListener(
  'resize',
  debounce(function () {
    /* reserved for layout-sensitive UI */
  }, 250),
);

window.AdditionalContextMenusSite = {
  copyToClipboard,
  initializeNavigation,
  initializeScrollEffects,
  initializeCodeCopyButtons,
  initializeTabSwitching,
  initializeInteractiveElements,
};

window.FileInsights = window.AdditionalContextMenusSite;
