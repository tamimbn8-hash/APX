/**
 * APX┃Velro — Official Scripts
 * Pure Vanilla JavaScript • No Frameworks • High Performance
 */

/* --------------------------------------------------------------------------
   GLOBAL SETTINGS & PERSISTENCE (Runs immediately to prevent FOUC)
   -------------------------------------------------------------------------- */
const DEFAULT_SETTINGS = {
  theme: 'midnight',
  accent: 'blurple',
  font: 'cairo',
  size: 'md',
  motion: true,
  glow: true,
  sound: true,
  ambientFx: 'rain',
  rain: true
};

function getSavedSettings() {
  try {
    const saved = localStorage.getItem('apx_user_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : { ...DEFAULT_SETTINGS };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem('apx_user_settings', JSON.stringify(settings));
  } catch (e) {
    // LocalStorage quota or privacy mode fallback
  }
}

function applySettingsToDOM(settings) {
  const root = document.documentElement;
  root.setAttribute('data-theme', settings.theme || 'midnight');
  root.setAttribute('data-accent', settings.accent || 'blurple');
  root.setAttribute('data-font', settings.font || 'cairo');
  root.setAttribute('data-font-size', settings.size || 'md');
  root.setAttribute('data-motion', settings.motion ? 'smooth' : 'reduced');
  root.setAttribute('data-glow', settings.glow ? 'true' : 'false');
  root.setAttribute('data-sound', settings.sound !== false ? 'true' : 'false');
  
  // Ambient FX: rain, stars, snow, matrix, or off
  const fx = settings.ambientFx || (settings.rain === false ? 'off' : 'rain');
  root.setAttribute('data-ambient-fx', fx);
  root.setAttribute('data-rain', fx !== 'off' ? 'true' : 'false');
}

// Immediate application upon script evaluation
let currentSettings = getSavedSettings();
applySettingsToDOM(currentSettings);

/* ==========================================================================
   INTERACTIVE AUDIO & SOUND EFFECTS ENGINE (Web Audio API Synthesizer)
   Tactile, futuristic micro-sounds with zero external file latency
   ========================================================================== */
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

const SoundFX = {
  hover() {
    if (!currentSettings.sound) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.035);
      gain.gain.setValueAtTime(0.018, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch(e) {}
  },

  click() {
    if (!currentSettings.sound) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(240, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch(e) {}
  },

  toggle(state) {
    if (!currentSettings.sound) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const f1 = state ? 520 : 680;
      const f2 = state ? 820 : 420;
      osc.frequency.setValueAtTime(f1, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(f2, ctx.currentTime + 0.07);
      gain.gain.setValueAtTime(0.035, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.07);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch(e) {}
  },

  drawer(isOpen) {
    if (!currentSettings.sound) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const f1 = isOpen ? 320 : 640;
      const f2 = isOpen ? 640 : 280;
      osc.frequency.setValueAtTime(f1, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(f2, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.11);
    } catch(e) {}
  },

  chord() {
    if (!currentSettings.sound) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.03);
        gain.gain.setValueAtTime(0.02, ctx.currentTime + idx * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.03 + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.03);
        osc.stop(ctx.currentTime + idx * 0.03 + 0.13);
      });
    } catch(e) {}
  }
};

function initSoundFX() {
  // Attach hover sounds with throttle
  let lastHover = 0;
  document.addEventListener('mouseover', (e) => {
    const now = Date.now();
    if (now - lastHover < 65) return;
    const target = e.target.closest('a, button, .rule-card, .service-card, .mindmap-node-card, .mindmap-apex-card, .gallery-item, .hub-module-item');
    if (target) {
      lastHover = now;
      SoundFX.hover();
    }
  }, { passive: true });

  // Attach click sounds
  document.addEventListener('click', (e) => {
    const target = e.target.closest('a, button, input[type="checkbox"], .theme-option-card, .accent-dot-btn, .font-option-btn, .size-btn, .ambient-fx-btn, .mindmap-filter-btn');
    if (target) {
      SoundFX.click();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileMenu();
  initScrollReveal();
  initGallery();
  initDynamicYear();
  initSmoothScroll();
  initRulesSearchAndFilter();
  initMindMapFilters();
  initSettingsDrawer();
  initBackToTop();
  initAmbientCanvas();
  initSoundFX();
});

/**
 * 1. NAVBAR SCROLL EFFECT
 * Adds .scrolled class on scroll for glass-blur transition
 */
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  const handleScroll = () => {
    if (window.scrollY > 30) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // Initial check on load
}

/**
 * 2. MOBILE HAMBURGER MENU
 * Accessible toggle drawer with ESC and outside click listeners
 */
function initMobileMenu() {
  const toggleBtn = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');
  if (!toggleBtn || !navMenu) return;

  const toggleMenu = (forceClose = false) => {
    const isOpen = forceClose ? false : !navMenu.classList.contains('open');
    navMenu.classList.toggle('open', isOpen);
    toggleBtn.classList.toggle('open', isOpen);
    toggleBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // Close when clicking nav links
  navMenu.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      if (navMenu.classList.contains('open')) {
        toggleMenu(true);
      }
    });
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (navMenu.classList.contains('open') && !navMenu.contains(e.target) && !toggleBtn.contains(e.target)) {
      toggleMenu(true);
    }
  });

  // Close on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navMenu.classList.contains('open')) {
      toggleMenu(true);
    }
  });
}

/**
 * 3. SCROLL REVEAL ANIMATIONS
 * Uses IntersectionObserver for smooth fade-up on scroll
 */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal');
  if (!revealElements.length) return;

  // Check if user prefers reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    revealElements.forEach(el => el.classList.add('visible'));
    return;
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -50px 0px',
      threshold: 0.1
    });

    revealElements.forEach(el => observer.observe(el));
  } else {
    // Fallback for older browsers
    revealElements.forEach(el => el.classList.add('visible'));
  }
}

/**
 * 4. GALLERY LIGHTBOX & FILTERING
 * Pure vanilla gallery with modal preview, ESC key, next/prev, and category filtering
 */
function initGallery() {
  const galleryItems = Array.from(document.querySelectorAll('.gallery-item'));
  const lightbox = document.getElementById('lightboxModal');
  const filterButtons = document.querySelectorAll('.filter-btn');

  // Filter Buttons
  if (filterButtons.length && galleryItems.length) {
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.getAttribute('data-filter');

        galleryItems.forEach(item => {
          const category = item.getAttribute('data-category') || '';
          const categories = category.split(' ');
          if (filter === 'all' || categories.includes(filter)) {
            item.style.display = 'flex';
            setTimeout(() => {
              item.style.opacity = '1';
              item.style.transform = 'translateY(0)';
            }, 20);
          } else {
            item.style.opacity = '0';
            item.style.transform = 'scale(0.95)';
            setTimeout(() => {
              item.style.display = 'none';
            }, 250);
          }
        });
      });
    });
  }

  // Lightbox
  if (!lightbox || !galleryItems.length) return;

  const lbImage = lightbox.querySelector('.lightbox-image');
  const lbTitle = lightbox.querySelector('.lightbox-title');
  const lbCategory = lightbox.querySelector('.lightbox-tag');
  const lbDesc = lightbox.querySelector('.lightbox-desc');
  const closeBtn = lightbox.querySelector('.lightbox-close-btn');
  const prevBtn = lightbox.querySelector('.lightbox-nav-btn.prev');
  const nextBtn = lightbox.querySelector('.lightbox-nav-btn.next');

  let currentIndex = 0;
  let activeItems = galleryItems;

  const updateActiveItems = () => {
    activeItems = galleryItems.filter(item => item.style.display !== 'none');
  };

  const showLightbox = (index) => {
    updateActiveItems();
    if (!activeItems.length) return;

    if (index < 0) {
      currentIndex = activeItems.length - 1;
    } else if (index >= activeItems.length) {
      currentIndex = 0;
    } else {
      currentIndex = index;
    }

    const item = activeItems[currentIndex];
    const imgSrc = item.getAttribute('data-img');
    const title = item.getAttribute('data-title') || '';
    const category = item.getAttribute('data-category-label') || '';
    const desc = item.getAttribute('data-desc') || '';

    if (lbImage) {
      lbImage.src = imgSrc;
      lbImage.alt = title;
    }
    if (lbTitle) lbTitle.textContent = title;
    if (lbCategory) lbCategory.textContent = category;
    if (lbDesc) lbDesc.textContent = desc;

    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  };

  galleryItems.forEach(item => {
    item.addEventListener('click', () => {
      updateActiveItems();
      const idx = activeItems.indexOf(item);
      if (idx !== -1) {
        showLightbox(idx);
      }
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (prevBtn) prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showLightbox(currentIndex - 1);
  });
  if (nextBtn) nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showLightbox(currentIndex + 1);
  });

  // Close on outside backdrop click
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;

    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowRight') {
      // In RTL, ArrowRight moves to next item
      showLightbox(currentIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      // In RTL, ArrowLeft moves to prev item
      showLightbox(currentIndex - 1);
    }
  });
}

/**
 * 5. DYNAMIC CURRENT YEAR
 * Automatically displays current year in footer
 */
function initDynamicYear() {
  const yearElements = document.querySelectorAll('.current-year');
  const currentYear = new Date().getFullYear();
  yearElements.forEach(el => {
    el.textContent = currentYear;
  });
}

/**
 * 6. SMOOTH SCROLLING
 * Smoothly scrolls to target anchor links with header offset
 */
function initSmoothScroll() {
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId === '#' || !targetId) return;

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

/**
 * 7. RULES SEARCH & CATEGORY FILTERING
 * Real-time instant search across rules and interactive category tabs
 */
function initRulesSearchAndFilter() {
  const searchInput = document.getElementById('rulesSearchInput');
  const filterPills = document.querySelectorAll('.rules-pill-btn');
  const ruleCards = document.querySelectorAll('.rule-card');
  const categoryBlocks = document.querySelectorAll('.rules-category-block');
  const noResultsBox = document.getElementById('noRulesFound');
  const resultsCount = document.getElementById('rulesResultsCount');
  const clearFiltersButton = document.getElementById('clearRulesFilters');
  const totalRules = ruleCards.length;
  const normalizeArabic = (value) => value
    .toLocaleLowerCase('ar')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي');

  if (!ruleCards.length) return;

  let activeCategory = 'all';
  let searchQuery = '';

  const applyFilters = () => {
    let visibleCount = 0;

    categoryBlocks.forEach(block => {
      const blockCat = block.getAttribute('data-cat-id');
      const cardsInBlock = block.querySelectorAll('.rule-card');
      let blockVisibleCount = 0;

      cardsInBlock.forEach(card => {
        const fullText = normalizeArabic(card.textContent || '');
        const normalizedQuery = normalizeArabic(searchQuery);
        const matchesCat = activeCategory === 'all' || blockCat === activeCategory;
        const matchesSearch = !normalizedQuery || fullText.includes(normalizedQuery);

        if (matchesCat && matchesSearch) {
          card.style.display = 'flex';
          blockVisibleCount++;
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });

      block.style.display = blockVisibleCount > 0 ? 'block' : 'none';
    });

    if (noResultsBox) {
      noResultsBox.classList.toggle('visible', visibleCount === 0);
    }

    if (resultsCount) {
      resultsCount.textContent = `عرض ${visibleCount} من ${totalRules} قانون`;
    }
    if (clearFiltersButton) {
      clearFiltersButton.hidden = activeCategory === 'all' && !searchQuery;
    }
  };

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => {
        p.classList.remove('active');
        p.setAttribute('aria-selected', 'false');
      });
      pill.classList.add('active');
      pill.setAttribute('aria-selected', 'true');
      activeCategory = pill.getAttribute('data-cat-target') || 'all';
      applyFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      applyFilters();
    });
  }

  clearFiltersButton?.addEventListener('click', () => {
    searchQuery = '';
    if (searchInput) searchInput.value = '';
    activeCategory = 'all';
    filterPills.forEach(pill => {
      const isAll = pill.getAttribute('data-cat-target') === 'all';
      pill.classList.toggle('active', isAll);
      pill.setAttribute('aria-selected', String(isAll));
    });
    applyFilters();
    searchInput?.focus();
  });

  applyFilters();
}

/**
 * 7.5. STAFF MIND MAP & HIERARCHY FILTERING
 */
function initMindMapFilters() {
  const filterBtns = document.querySelectorAll('.mindmap-filter-btn');
  const branches = document.querySelectorAll('.mindmap-branch-column');
  const apex = document.querySelector('.mindmap-apex');

  if (!filterBtns.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter') || 'all';

      // Leadership apex
      if (apex) {
        if (filter === 'all' || filter === 'leadership') {
          apex.style.display = 'flex';
          apex.style.opacity = '1';
        } else {
          apex.style.display = 'none';
        }
      }

      // Department Branches
      branches.forEach(branch => {
        const dept = branch.getAttribute('data-dept');
        if (filter === 'all' || filter === dept) {
          branch.style.display = 'flex';
          setTimeout(() => {
            branch.style.opacity = '1';
            branch.style.transform = 'translateY(0)';
          }, 10);
        } else {
          branch.style.opacity = '0';
          branch.style.transform = 'translateY(10px)';
          setTimeout(() => {
            branch.style.display = 'none';
          }, 200);
        }
      });
    });
  });
}

/**
 * 8. SETTINGS DRAWER & CUSTOMIZATION PANEL
 * Full controls for Light/Night Modes, Ambience FX, Accents, Fonts, Sizes, Motion and Glow
 */
function initSettingsDrawer() {
  const getOverlay = () => document.getElementById('settingsOverlay');
  const getDrawer = () => document.getElementById('settingsDrawer');

  const toggleDrawer = (forceClose = false) => {
    const overlay = getOverlay();
    if (!overlay) return;
    const isOpen = forceClose ? false : !overlay.classList.contains('open');
    SoundFX.drawer(isOpen);
    if (isOpen) {
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    } else {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  };

  // Expose global helpers
  window.openSettingsDrawer = () => toggleDrawer(false);
  window.closeSettingsDrawer = () => toggleDrawer(true);

  // Direct element click listeners
  const openBtns = [
    document.getElementById('navSettingsBtn'),
    document.getElementById('floatingSettingsBtn')
  ].filter(Boolean);

  openBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleDrawer();
    });
  });

  // Global delegated click listener for settings buttons
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('#navSettingsBtn, #floatingSettingsBtn, .nav-icon-btn, .floating-settings-btn');
    if (trigger) {
      e.preventDefault();
      e.stopPropagation();
      toggleDrawer();
      return;
    }

    const closeBtn = e.target.closest('#closeSettingsBtn, .settings-close-btn');
    if (closeBtn) {
      e.preventDefault();
      toggleDrawer(true);
      return;
    }

    const overlay = getOverlay();
    if (overlay && e.target === overlay) {
      toggleDrawer(true);
    }
  });

  // ESC to close
  document.addEventListener('keydown', (e) => {
    const overlay = getOverlay();
    if (e.key === 'Escape' && overlay && overlay.classList.contains('open')) {
      toggleDrawer(true);
    }
  });

  // Buttons & Controls inside drawer
  const themeBtns = document.querySelectorAll('.theme-option-card');
  const fxBtns = document.querySelectorAll('.ambient-fx-btn');
  const accentBtns = document.querySelectorAll('.accent-dot-btn');
  const fontBtns = document.querySelectorAll('.font-option-btn');
  const sizeBtns = document.querySelectorAll('.size-btn');
  const motionToggle = document.getElementById('motionToggle');
  const glowToggle = document.getElementById('glowToggle');
  const soundToggle = document.getElementById('soundToggle');
  const rainToggle = document.getElementById('rainToggle');
  const resetBtn = document.getElementById('resetSettingsBtn');

  // Sync UI with current settings
  const updateUIFromSettings = (settings) => {
    themeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-theme-val') === settings.theme);
    });
    const currentFx = settings.ambientFx || (settings.rain === false ? 'off' : 'rain');
    fxBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-fx-val') === currentFx);
    });
    accentBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-accent-val') === settings.accent);
    });
    fontBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-font-val') === settings.font);
    });
    sizeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-size-val') === settings.size);
    });
    if (motionToggle) motionToggle.checked = settings.motion;
    if (glowToggle) glowToggle.checked = settings.glow;
    if (soundToggle) soundToggle.checked = settings.sound !== false;
    if (rainToggle) rainToggle.checked = currentFx !== 'off';
  };

  updateUIFromSettings(currentSettings);

  // 1. Theme Change (Including Light Mode!)
  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-theme-val');
      currentSettings.theme = val;
      applySettingsToDOM(currentSettings);
      saveSettings(currentSettings);
      updateUIFromSettings(currentSettings);
      SoundFX.chord();
      if (window._ambientControl) window._ambientControl.syncState();
    });
  });

  // 2. Ambient FX Mode (Rain, Stars, Snow, Matrix, Off)
  fxBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-fx-val');
      currentSettings.ambientFx = val;
      currentSettings.rain = val !== 'off';
      applySettingsToDOM(currentSettings);
      saveSettings(currentSettings);
      updateUIFromSettings(currentSettings);
      SoundFX.click();
      if (window._ambientControl) window._ambientControl.syncState();
    });
  });

  // 3. Accent Change
  accentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-accent-val');
      currentSettings.accent = val;
      applySettingsToDOM(currentSettings);
      saveSettings(currentSettings);
      updateUIFromSettings(currentSettings);
      SoundFX.chord();
      if (window._ambientControl) window._ambientControl.syncState();
    });
  });

  // 4. Font Change
  fontBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-font-val');
      currentSettings.font = val;
      applySettingsToDOM(currentSettings);
      saveSettings(currentSettings);
      updateUIFromSettings(currentSettings);
      SoundFX.click();
    });
  });

  // 5. Font Size Change
  sizeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-size-val');
      currentSettings.size = val;
      applySettingsToDOM(currentSettings);
      saveSettings(currentSettings);
      updateUIFromSettings(currentSettings);
      SoundFX.click();
    });
  });

  // 6. Motion Toggle
  if (motionToggle) {
    motionToggle.addEventListener('change', () => {
      currentSettings.motion = motionToggle.checked;
      applySettingsToDOM(currentSettings);
      saveSettings(currentSettings);
      SoundFX.toggle(currentSettings.motion);
    });
  }

  // 7. Glow Toggle
  if (glowToggle) {
    glowToggle.addEventListener('change', () => {
      currentSettings.glow = glowToggle.checked;
      applySettingsToDOM(currentSettings);
      saveSettings(currentSettings);
      SoundFX.toggle(currentSettings.glow);
    });
  }

  // 7.5 Sound Effects Toggle
  if (soundToggle) {
    soundToggle.addEventListener('change', () => {
      currentSettings.sound = soundToggle.checked;
      applySettingsToDOM(currentSettings);
      saveSettings(currentSettings);
      SoundFX.toggle(currentSettings.sound);
    });
  }

  // 8. Rain Legacy Toggle
  if (rainToggle) {
    rainToggle.addEventListener('change', () => {
      currentSettings.ambientFx = rainToggle.checked ? 'rain' : 'off';
      currentSettings.rain = rainToggle.checked;
      applySettingsToDOM(currentSettings);
      saveSettings(currentSettings);
      updateUIFromSettings(currentSettings);
      SoundFX.toggle(rainToggle.checked);
      if (window._ambientControl) window._ambientControl.syncState();
    });
  }

  // 9. Reset Defaults
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      currentSettings = { ...DEFAULT_SETTINGS };
      applySettingsToDOM(currentSettings);
      saveSettings(currentSettings);
      updateUIFromSettings(currentSettings);
      SoundFX.chord();
      if (window._ambientControl) window._ambientControl.syncState();
    });
  }
}

/**
 * 9. BACK TO TOP BUTTON
 * Shows smooth floating button when user scrolls down
 */
function initBackToTop() {
  const btn = document.getElementById('backToTopBtn');
  if (!btn) return;

  const handleScroll = () => {
    if (window.scrollY > 320) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  btn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

/* ==========================================================================
   10. MULTI-MODE AMBIENT CANVAS ANIMATION
   High-performance ambient backgrounds: Rain 🌧️, Stars & Meteors ✨, Snow ❄️, Matrix ⚡
   ========================================================================== */
function initAmbientCanvas() {
  const canvas = document.getElementById('rainCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let animationId = null;
  let isRunning = false;
  let currentMode = 'rain';

  // Elements for each mode
  let rainDrops = [];
  let rainRipples = [];
  let stars = [];
  let meteors = [];
  let snowParticles = [];
  let matrixColumns = [];

  // Helper: Get accent color with alpha, tailored for dark or light theme
  function getThemeColor(alpha, fallbackLight = 'rgba(71, 85, 105, 0.4)') {
    const root = document.documentElement;
    const theme = root.getAttribute('data-theme') || 'midnight';
    const accent = root.getAttribute('data-accent') || 'blurple';

    if (theme === 'light') {
      return `rgba(37, 99, 235, ${alpha})`;
    }

    const accentMap = {
      blurple: `rgba(130, 160, 255, ${alpha})`,
      purple:  `rgba(175, 130, 255, ${alpha})`,
      cyan:    `rgba(50, 230, 255, ${alpha})`,
      emerald: `rgba(40, 220, 150, ${alpha})`,
      amber:   `rgba(255, 185, 40, ${alpha})`,
      crimson: `rgba(255, 90, 130, ${alpha})`
    };
    return accentMap[accent] || `rgba(160, 195, 255, ${alpha})`;
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initModeElements();
  }

  function initModeElements() {
    const w = canvas.width;
    const h = canvas.height;

    // 1. Calm Aesthetic Rain (مطر سينمائي هادئ وأنيق كما كان)
    rainDrops = [];
    const rainCount = Math.floor(w / 8.5); // Balanced aesthetic count (~140-180 drops)
    for (let i = 0; i < rainCount; i++) {
      rainDrops.push({
        x: Math.random() * (w + 100) - 50,
        y: Math.random() * h - h,
        length: Math.random() * 20 + 14,
        speed: Math.random() * 7 + 8,
        opacity: Math.random() * 0.4 + 0.15,
        width: Math.random() * 0.8 + 0.6
      });
    }

    // 2. Stars & Meteors
    stars = [];
    meteors = [];
    const starCount = Math.floor(w / 14);
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.8 + 0.2,
        twinkleSpeed: (Math.random() * 0.02 + 0.005) * (Math.random() > 0.5 ? 1 : -1)
      });
    }

    // 3. Snow & Embers
    snowParticles = [];
    const snowCount = Math.floor(w / 18);
    for (let i = 0; i < snowCount; i++) {
      snowParticles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        radius: Math.random() * 2.5 + 1,
        speedY: Math.random() * 1.5 + 0.5,
        speedX: Math.random() * 0.6 - 0.3,
        swing: Math.random() * Math.PI * 2,
        swingSpeed: Math.random() * 0.02 + 0.01,
        opacity: Math.random() * 0.5 + 0.2
      });
    }

    // 4. Matrix Code Streams
    matrixColumns = [];
    const colWidth = 24;
    const colCount = Math.floor(w / colWidth);
    const chars = "APX0101MTA<>#$*+~VELRO";
    for (let i = 0; i < colCount; i++) {
      matrixColumns.push({
        x: i * colWidth,
        y: Math.random() * -h,
        speed: Math.random() * 3 + 2,
        chars: Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]),
        opacity: Math.random() * 0.35 + 0.1
      });
    }
  }

  // Draw 1: Calm Aesthetic Rain
  function drawRain() {
    const angle = 0.12;
    const sinAngle = Math.sin(angle);
    const cosAngle = Math.cos(angle);
    const w = canvas.width;
    const h = canvas.height;

    for (let i = 0; i < rainDrops.length; i++) {
      const drop = rainDrops[i];
      const dx = sinAngle * drop.length;
      const dy = cosAngle * drop.length;

      const grad = ctx.createLinearGradient(drop.x, drop.y, drop.x - dx, drop.y + dy);
      grad.addColorStop(0, getThemeColor(0));
      grad.addColorStop(0.5, getThemeColor(drop.opacity * 0.6));
      grad.addColorStop(1, getThemeColor(drop.opacity));

      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - dx, drop.y + dy);
      ctx.strokeStyle = grad;
      ctx.lineWidth = drop.width;
      ctx.lineCap = 'round';
      ctx.stroke();

      drop.y += drop.speed;
      drop.x -= sinAngle * drop.speed;

      if (drop.y > h) {
        drop.y = -drop.length - Math.random() * 25;
        drop.x = Math.random() * (w + 100) - 50;
      }
    }
  }

  // Draw 2: Stars & Meteors
  function drawStars() {
    // Draw twinkling stars
    stars.forEach(star => {
      star.alpha += star.twinkleSpeed;
      if (star.alpha > 0.95) {
        star.alpha = 0.95;
        star.twinkleSpeed = -Math.abs(star.twinkleSpeed);
      } else if (star.alpha < 0.15) {
        star.alpha = 0.15;
        star.twinkleSpeed = Math.abs(star.twinkleSpeed);
      }

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = getThemeColor(star.alpha);
      ctx.shadowBlur = 4;
      ctx.shadowColor = getThemeColor(star.alpha);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Random shooting star trigger (شهب)
    if (Math.random() < 0.015 && meteors.length < 3) {
      meteors.push({
        x: Math.random() * canvas.width * 0.8,
        y: Math.random() * canvas.height * 0.4,
        length: Math.random() * 80 + 50,
        speed: Math.random() * 12 + 10,
        angle: Math.PI / 4 + (Math.random() * 0.2 - 0.1),
        opacity: 1
      });
    }

    // Draw shooting stars
    meteors.forEach((m, idx) => {
      const dx = Math.cos(m.angle) * m.length;
      const dy = Math.sin(m.angle) * m.length;

      const grad = ctx.createLinearGradient(m.x, m.y, m.x - dx, m.y - dy);
      grad.addColorStop(0, '#FFFFFF');
      grad.addColorStop(0.4, getThemeColor(m.opacity));
      grad.addColorStop(1, getThemeColor(0));

      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - dx, m.y - dy);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();

      m.x += Math.cos(m.angle) * m.speed;
      m.y += Math.sin(m.angle) * m.speed;
      m.opacity -= 0.015;

      if (m.opacity <= 0 || m.x > canvas.width || m.y > canvas.height) {
        meteors.splice(idx, 1);
      }
    });
  }

  // Draw 3: Snow & Luminous Particles
  function drawSnow() {
    snowParticles.forEach(p => {
      p.swing += p.swingSpeed;
      p.y += p.speedY;
      p.x += Math.sin(p.swing) * p.speedX;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = getThemeColor(p.opacity);
      ctx.shadowBlur = 6;
      ctx.shadowColor = getThemeColor(p.opacity * 0.8);
      ctx.fill();
      ctx.shadowBlur = 0;

      if (p.y > canvas.height + 10) {
        p.y = -10;
        p.x = Math.random() * canvas.width;
      }
    });
  }

  // Draw 4: Matrix Code Stream
  function drawMatrix() {
    ctx.font = '12px ui-monospace, SFMono-Regular, monospace';
    matrixColumns.forEach(col => {
      col.chars.forEach((char, idx) => {
        const charY = col.y + idx * 16;
        if (charY > 0 && charY < canvas.height + 20) {
          const alpha = idx === col.chars.length - 1 ? 0.8 : col.opacity * (idx / col.chars.length);
          ctx.fillStyle = idx === col.chars.length - 1 ? '#FFFFFF' : getThemeColor(alpha);
          ctx.fillText(char, col.x, charY);
        }
      });

      col.y += col.speed;
      if (col.y > canvas.height) {
        col.y = -16 * col.chars.length;
        col.x = Math.floor(Math.random() * (canvas.width / 24)) * 24;
      }
    });
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentMode === 'rain') {
      drawRain();
    } else if (currentMode === 'stars') {
      drawStars();
    } else if (currentMode === 'snow') {
      drawSnow();
    } else if (currentMode === 'matrix') {
      drawMatrix();
    }

    if (isRunning && currentMode !== 'off') {
      animationId = requestAnimationFrame(loop);
    }
  }

  function start() {
    if (isRunning) return;
    isRunning = true;
    canvas.classList.add('active');
    loop();
  }

  function stop() {
    isRunning = false;
    canvas.classList.remove('active');
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function syncState() {
    const fx = document.documentElement.getAttribute('data-ambient-fx') || 'rain';
    currentMode = fx;

    if (fx === 'off') {
      stop();
    } else {
      if (!isRunning) start();
    }
  }

  // Observer on root attribute changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(m => {
      if (m.attributeName === 'data-ambient-fx' || m.attributeName === 'data-theme' || m.attributeName === 'data-accent') {
        syncState();
      }
    });
  });
  observer.observe(document.documentElement, { attributes: true });

  window.addEventListener('resize', () => {
    resize();
    if (isRunning) {
      cancelAnimationFrame(animationId);
      animationId = null;
      isRunning = false;
      start();
    }
  });

  window._ambientControl = { start, stop, syncState };
  window._rainControl = { startRain: start, stopRain: stop, syncRainState: syncState };

  resize();
  syncState();
}
