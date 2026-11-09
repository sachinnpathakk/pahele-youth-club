document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('js-ready');

    const header = document.querySelector('header');
    const progressEl = document.getElementById('scrollProgress');
    const backToTopBtn = document.getElementById('backToTop');
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    const navItems = Array.from(document.querySelectorAll('.nav-link'));
    const sections = Array.from(document.querySelectorAll('section[id]'));

    // Cache layout metrics outside scroll loop to avoid forced reflows/roughness
    let sectionOffsets = [];
    let maxScroll = 1;
    const measureLayout = () => {
        const headerOffset = header ? header.offsetHeight + 80 : 140;
        maxScroll = Math.max(1, document.documentElement.scrollHeight - document.documentElement.clientHeight);
        sectionOffsets = sections.map((sec) => ({
            id: sec.id,
            top: sec.offsetTop - headerOffset,
        }));
    };
    measureLayout();
    window.addEventListener('load', measureLayout, { once: true });
    window.addEventListener('resize', measureLayout, { passive: true });

    // Lenis Silky Smooth Scroll (calibrated lerp + 1:1 wheel multiplier for smooth, non-choppy glide)
    let lenis = null;
    if (typeof Lenis !== 'undefined') {
        lenis = new Lenis({
            lerp: 0.1,
            smoothWheel: true,
            wheelMultiplier: 1.0,
            touchMultiplier: 1.0,
        });

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
    }

    const scrollToElement = (target) => {
        if (!target) return;
        const headerOffset = header ? header.offsetHeight + 12 : 76;
        if (lenis) {
            lenis.scrollTo(target, { offset: -headerOffset, duration: 0.9 });
        } else {
            const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerOffset);
            window.scrollTo({ top, behavior: 'smooth' });
        }
    };

    // Zero-reflow scroll updater (GPU transform progress bar + cached scrollspy)
    let lastScrolledState = false;
    let lastBackTopState = false;
    let lastActiveId = '';

    const updateOnScroll = (scrollY) => {
        const y = Math.max(0, scrollY);

        if (progressEl) {
            const ratio = Math.min(1, y / maxScroll);
            progressEl.style.transform = `scaleX(${ratio.toFixed(4)})`;
        }

        const isScrolled = y > 40;
        if (header && isScrolled !== lastScrolledState) {
            header.classList.toggle('scrolled', isScrolled);
            lastScrolledState = isScrolled;
        }

        const showBackTop = y > 480;
        if (backToTopBtn && showBackTop !== lastBackTopState) {
            backToTopBtn.classList.toggle('visible', showBackTop);
            lastBackTopState = showBackTop;
        }

        let activeId = sectionOffsets[0]?.id || 'home';
        for (const sec of sectionOffsets) {
            if (y >= sec.top) {
                activeId = sec.id;
            }
        }
        if (activeId !== lastActiveId) {
            lastActiveId = activeId;
            navItems.forEach((link) => {
                link.classList.toggle('active', link.getAttribute('href') === `#${activeId}`);
            });
        }
    };

    if (lenis) {
        lenis.on('scroll', ({ scroll }) => updateOnScroll(scroll));
    } else {
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    updateOnScroll(window.scrollY);
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }
    updateOnScroll(window.scrollY);

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            if (lenis) {
                lenis.scrollTo(0, { duration: 0.9 });
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    // Mobile Menu Toggle
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            const isOpen = navLinks.classList.toggle('open');
            menuToggle.setAttribute('aria-expanded', String(isOpen));
        });
    }

    // Toast Helper
    const toast = document.getElementById('toast');
    let toastTimer = null;
    const showToast = (msg) => {
        if (!toast || !msg) return;
        toast.textContent = msg;
        toast.classList.add('visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.classList.remove('visible');
        }, 3200);
    };

    // Anchor Link Navigation & Toast Triggers
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', (e) => {
            const href = anchor.getAttribute('href');
            if (!href) return;

            if (href === '#') {
                e.preventDefault();
                if (anchor.dataset.toast) showToast(anchor.dataset.toast);
                return;
            }

            const target = document.querySelector(href);
            if (!target) return;

            e.preventDefault();
            if (navLinks && navLinks.classList.contains('open')) {
                navLinks.classList.remove('open');
                if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
            }

            const galleryJump = anchor.dataset.galleryJump;
            if (galleryJump) {
                applyGalleryFilter(galleryJump);
            }

            scrollToElement(target);
        });
    });

    // Fast Scroll Reveal Animations
    const revealTargets = document.querySelectorAll(
        '.about-visual, .group-photo-frame, .leader-card, .contribution-card, .bento-item, .gallery-item, .guff-card'
    );

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('reveal-active');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.01, rootMargin: '0px 0px 80px 0px' });

        revealTargets.forEach((el) => observer.observe(el));
    } else {
        revealTargets.forEach((el) => el.classList.add('reveal-active'));
    }

    // Animated Stat Counters
    const statNumbers = document.querySelectorAll('.stat-number[data-count]');
    const animateCount = (el) => {
        const target = parseInt(el.dataset.count || '0', 10);
        const suffix = el.dataset.suffix || '';
        const duration = 700;
        const start = performance.now();

        const step = (now) => {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = `${Math.round(target * eased)}${suffix}`;
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    };

    if ('IntersectionObserver' in window && statNumbers.length) {
        const statsObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    animateCount(entry.target);
                    statsObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        statNumbers.forEach((el) => statsObserver.observe(el));
    }

    // Gallery Filtering
    const filterButtons = Array.from(document.querySelectorAll('.filter-btn'));
    const galleryMasonry = document.getElementById('galleryMasonry');
    const galleryItems = Array.from(document.querySelectorAll('.gallery-item'));

    function applyGalleryFilter(category) {
        filterButtons.forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.filter === category);
        });
        if (galleryMasonry) {
            galleryMasonry.classList.toggle('filtered', category !== 'all');
        }
        galleryItems.forEach((item) => {
            const matches = category === 'all' || item.dataset.category === category;
            item.classList.toggle('hidden', !matches);
            if (matches) item.classList.add('reveal-active');
        });
        requestAnimationFrame(() => {
            measureLayout();
            if (lenis && typeof lenis.resize === 'function') lenis.resize();
        });
    }

    filterButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            applyGalleryFilter(btn.dataset.filter || 'all');
        });
    });

    // Interactive Lightbox (Group Photo, Leadership Portraits, Impact Cards, Gallery)
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxCaption = document.getElementById('lightboxCaption');
    const lightboxSubtitle = document.getElementById('lightboxSubtitle');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');

    const getVisibleSlides = () => {
        const nodes = Array.from(document.querySelectorAll('[data-lightbox-item], .bento-item'));
        return nodes.filter((el) => !el.classList.contains('hidden'));
    };

    let currentIndex = 0;

    const renderSlide = (index) => {
        const slides = getVisibleSlides();
        if (!slides.length || !lightboxImg || !lightboxCaption || !lightboxSubtitle) return;
        currentIndex = ((index % slides.length) + slides.length) % slides.length;
        const item = slides[currentIndex];
        const imgEl = item.tagName === 'IMG' ? item : item.querySelector('img');
        const src = imgEl ? imgEl.src : item.dataset.impactImg || '';
        const alt = imgEl ? imgEl.alt : item.dataset.lightboxTitle || '';

        lightboxImg.src = src;
        lightboxImg.alt = alt;
        lightboxCaption.textContent = item.dataset.lightboxTitle || alt;
        lightboxSubtitle.textContent = item.dataset.lightboxSubtitle || '';
    };

    const openLightboxFor = (el) => {
        if (!lightbox) return;
        const slides = getVisibleSlides();
        const idx = slides.indexOf(el);
        renderSlide(idx >= 0 ? idx : 0);
        lightbox.classList.add('open');
        lightbox.setAttribute('aria-hidden', 'false');
        if (lenis) lenis.stop();
    };

    const closeLightbox = () => {
        if (!lightbox) return;
        lightbox.classList.remove('open');
        lightbox.setAttribute('aria-hidden', 'true');
        if (lenis) lenis.start();
    };

    document.querySelectorAll('[data-lightbox-item], .bento-item').forEach((item) => {
        item.addEventListener('click', () => openLightboxFor(item));
    });

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener('click', () => renderSlide(currentIndex - 1));
    if (lightboxNext) lightboxNext.addEventListener('click', () => renderSlide(currentIndex + 1));

    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (!lightbox || !lightbox.classList.contains('open')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') renderSlide(currentIndex - 1);
        if (e.key === 'ArrowRight') renderSlide(currentIndex + 1);
    });

    // Chiya Guff Story Switcher
    const guffStories = [
        {
            quote: '"Last Tuesday, we sat down with the elders and decided the old bridge needs a fresh coat of paint. We\'re starting this Friday. Who\'s in?"',
            meta: 'Shared in Pathkhola Community Hub',
        },
        {
            quote: '"Every Saturday morning begins with two cups of hot chiya and fifty gloves ready to clear plastic along the hillside picnic trail."',
            meta: 'Green Pathkhola • Weekend Clean-Up',
        },
        {
            quote: '"When younger students ask how to organize their first book drive, that\'s when we know the legacy of Pathkhola is in safe hands."',
            meta: 'Youth Mentorship Circle • Est. 2015',
        },
    ];
    let guffIndex = 0;
    const guffQuote = document.getElementById('guffQuote');
    const guffMeta = document.getElementById('guffMeta');
    const nextGuffBtn = document.getElementById('nextGuffBtn');

    if (nextGuffBtn && guffQuote && guffMeta) {
        nextGuffBtn.addEventListener('click', () => {
            guffIndex = (guffIndex + 1) % guffStories.length;
            guffQuote.style.opacity = '0';
            setTimeout(() => {
                guffQuote.innerHTML = `<p>${guffStories[guffIndex].quote}</p>`;
                guffMeta.textContent = guffStories[guffIndex].meta;
                guffQuote.style.opacity = '0.95';
            }, 180);
        });
    }

    // Contact Form Submission Feedback
    const contactForm = document.getElementById('contactForm');
    const formFeedback = document.getElementById('formFeedback');
    if (contactForm && formFeedback) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('contactName');
            const emailInput = document.getElementById('contactEmail');
            const sender = nameInput?.value.trim() || 'friend';
            const email = emailInput?.value.trim() || 'your inbox';
            formFeedback.textContent = `Thank you, ${sender}! Your message has been noted and our team will reply to ${email} soon.`;
            formFeedback.classList.add('visible');
            contactForm.reset();
        });
    }
});
