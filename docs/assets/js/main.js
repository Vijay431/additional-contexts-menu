// File Insights - Main JavaScript for GitHub Pages

document.addEventListener('DOMContentLoaded', function () {
  // Initialize all components
  initializeNavigation();
  initializeScrollEffects();
  initializeCodeCopyButtons();
  initializeTabSwitching();
  initializeInteractiveElements();

  // Add loading animations
  addLoadingAnimations();
});

/**
 * Initialize responsive navigation
 */
function initializeNavigation() {
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function () {
      navMenu.classList.toggle('active');
      navToggle.classList.toggle('active');

      // Animate hamburger menu
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

    // Close menu when clicking outside
    document.addEventListener('click', function (e) {
      if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
        navMenu.classList.remove('active');
        navToggle.classList.remove('active');

        // Reset hamburger menu
        const spans = navToggle.querySelectorAll('span');
        spans.forEach((span) => {
          span.style.transform = 'none';
          span.style.opacity = '1';
        });
      }
    });

    // Close menu on escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        navToggle.classList.remove('active');
      }
    });
  }
}

/**
 * Initialize scroll effects and animations
 */
function initializeScrollEffects() {
  // Add scroll-based animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px',
  };

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
      }
    });
  }, observerOptions);

  // Observe elements for animation
  const animateElements = document.querySelectorAll(
    '.feature-card, .step, .command-card, .architecture-card, .metric-card, .screenshot-item, .method-card, .requirement-card, .config-card, .trouble-card, .next-step-card'
  );

  animateElements.forEach((el) => {
    el.classList.add('animate-on-scroll');
    observer.observe(el);
  });

  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    });
  });

  // Header shadow on scroll
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
  // Add copy buttons to code blocks
  const codeBlocks = document.querySelectorAll('pre code, .code-example code');

  codeBlocks.forEach((codeBlock) => {
    const wrapper = codeBlock.closest('pre') || codeBlock.closest('.code-example');
    if (wrapper && !wrapper.querySelector('.copy-button')) {
      const copyButton = document.createElement('button');
      copyButton.className = 'copy-button';
      copyButton.innerHTML = '<i class="fas fa-copy"></i>';
      copyButton.title = 'Copy to clipboard';

      wrapper.style.position = 'relative';
      wrapper.appendChild(copyButton);

      copyButton.addEventListener('click', function () {
        const code = codeBlock.textContent;
        copyToClipboard(code);

        // Show success feedback
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

      // Remove active class from all buttons and panels
      tabButtons.forEach((btn) => btn.classList.remove('active'));
      tabPanels.forEach((panel) => panel.classList.remove('active'));

      // Add active class to clicked button and corresponding panel
      this.classList.add('active');
      const targetPanel = document.getElementById(targetTab);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });

  // Keyboard navigation for tabs
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
  // Add hover effects to cards
  const cards = document.querySelectorAll(
    '.feature-card, .command-card, .architecture-card, .metric-card, .method-card, .requirement-card, .config-card, .trouble-card, .next-step-card'
  );

  cards.forEach((card) => {
    card.addEventListener('mouseenter', function () {
      this.style.transform = 'translateY(-5px)';
    });

    card.addEventListener('mouseleave', function () {
      this.style.transform = 'translateY(0)';
    });
  });

  // Add click handlers for download buttons
  const downloadButtons = document.querySelectorAll(
    '.btn[href*="marketplace"], .btn[href*="releases"]'
  );

  downloadButtons.forEach((button) => {
    button.addEventListener('click', function (e) {
      // Track download attempts (you could send to analytics here)
      console.log('Download button clicked:', this.href);

      // Add visual feedback
      this.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.style.transform = 'scale(1)';
      }, 150);
    });
  });

  // Add tooltips to buttons and links
  const tooltipElements = document.querySelectorAll('[title]');
  tooltipElements.forEach((element) => {
    element.addEventListener('mouseenter', showTooltip);
    element.addEventListener('mouseleave', hideTooltip);
  });
}

/**
 * Add loading animations
 */
function addLoadingAnimations() {
  // Add CSS classes for animations
  const style = document.createElement('style');
  style.textContent = `
    .animate-on-scroll {
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.6s ease, transform 0.6s ease;
    }
    
    .animate-on-scroll.animate-in {
      opacity: 1;
      transform: translateY(0);
    }
    
    .site-header.scrolled {
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    
    .copy-button {
      position: absolute;
      top: 8px;
      right: 8px;
      background: var(--primary-color);
      color: var(--text-inverse);
      border: none;
      border-radius: 4px;
      padding: 6px 8px;
      font-size: 12px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.3s ease, background-color 0.3s ease;
    }
    
    .copy-button:hover {
      background: var(--primary-dark);
    }
    
    .copy-button.success {
      background: var(--accent-color);
    }
    
    pre:hover .copy-button,
    .code-example:hover .copy-button {
      opacity: 1;
    }
    
    .tooltip {
      position: absolute;
      background: var(--bg-dark);
      color: var(--text-inverse);
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      z-index: 1000;
      pointer-events: none;
      opacity: 0;
      transform: translateY(-5px);
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    
    .tooltip.show {
      opacity: 1;
      transform: translateY(0);
    }
    
    .nav-menu.active {
      display: flex !important;
    }
    
    @media (max-width: 768px) {
      .nav-menu {
        display: none;
      }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    // Use the modern clipboard API
    return navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
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
}

/**
 * Show tooltip
 */
function showTooltip(e) {
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.textContent = e.target.title;

  // Remove the title attribute to prevent default tooltip
  e.target.dataset.originalTitle = e.target.title;
  e.target.removeAttribute('title');

  document.body.appendChild(tooltip);

  // Position the tooltip
  const rect = e.target.getBoundingClientRect();
  tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
  tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';

  // Show tooltip
  setTimeout(() => tooltip.classList.add('show'), 100);

  // Store reference for cleanup
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

  // Restore the title attribute
  if (e.target.dataset.originalTitle) {
    e.target.title = e.target.dataset.originalTitle;
    delete e.target.dataset.originalTitle;
  }
}

/**
 * Debounce function for performance
 */
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

/**
 * Throttle function for scroll events
 */
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

// Add performance optimizations
window.addEventListener(
  'scroll',
  throttle(function () {
    // Handle scroll events with throttling
  }, 16)
); // ~60fps

window.addEventListener(
  'resize',
  debounce(function () {
    // Handle resize events with debouncing
  }, 250)
);

// Export functions for global use
window.FileInsights = {
  copyToClipboard,
  initializeNavigation,
  initializeScrollEffects,
  initializeCodeCopyButtons,
  initializeTabSwitching,
  initializeInteractiveElements,
};
