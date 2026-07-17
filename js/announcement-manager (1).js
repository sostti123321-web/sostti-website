/**
 * announcement-manager.js — SOSTTI Ad Popup Carousel
 * Shows admission ad images in a popup after page load.
 * To add/remove ads: edit the this.ads array below.
 * Supports: multi-image carousel, swipe on mobile, keyboard nav,
 *           and SMART AUTO-RESPONSIVE sizing for all screen sizes.
 */
(function () {
    'use strict';

    /* ─── Screen-size helpers ─────────────────────────────────────── */
    function getScreen() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        var isLandscape = w > h;

        if (w <= 360 || (isLandscape && h <= 420)) return 'xs';   // very small / landscape phone
        if (w <= 540)                               return 'sm';   // small phone
        if (w <= 768)                               return 'md';   // large phone / small tablet
        if (w <= 1024)                              return 'lg';   // tablet / small laptop
        return 'xl';                                               // desktop / large screen
    }

    /* Config per breakpoint:
       popupMaxW  – max-width of the popup card (px or %)
       popupMaxH  – max-height guard so it never overflows the viewport (vh)
       padding    – overlay padding
       radius     – border-radius
       ctaFont    – CTA bar font-size (rem)
       ctaPad     – CTA bar padding
       closeSz    – close button size (px)
       navSz      – nav arrow size (px)
       navFont    – nav arrow font size (px)
       dotSz      – dot indicator size (px)
       counterFont– slide counter font size (px)
    */
    var BREAKPOINTS = {
        xs:  { popupMaxW: '96vw',  popupMaxH: 88, padding: '8px',  radius: 12, ctaFont: '.75rem', ctaPad: '9px 12px',  closeSz: 26, navSz: 28, navFont: 16, dotSz: 6,  counterFont: 11 },
        sm:  { popupMaxW: '92vw',  popupMaxH: 90, padding: '10px', radius: 14, ctaFont: '.80rem', ctaPad: '10px 14px', closeSz: 29, navSz: 30, navFont: 18, dotSz: 7,  counterFont: 12 },
        md:  { popupMaxW: '88vw',  popupMaxH: 90, padding: '12px', radius: 16, ctaFont: '.85rem', ctaPad: '11px 16px', closeSz: 30, navSz: 33, navFont: 19, dotSz: 7,  counterFont: 12 },
        lg:  { popupMaxW: '80vw',  popupMaxH: 90, padding: '16px', radius: 18, ctaFont: '.88rem', ctaPad: '12px 18px', closeSz: 32, navSz: 36, navFont: 21, dotSz: 8,  counterFont: 12 },
        xl:  { popupMaxW: '75vw',  popupMaxH: 90, padding: '20px', radius: 20, ctaFont: '.92rem', ctaPad: '13px 22px', closeSz: 34, navSz: 38, navFont: 22, dotSz: 8,  counterFont: 13 }
    };

    /* ─── Apply responsive layout to live DOM elements ────────────── */
    function applyResponsive() {
        var overlay = document.getElementById('ad-carousel-overlay');
        if (!overlay) return;

        var bp  = BREAKPOINTS[getScreen()];
        var pop = document.getElementById('ad-carousel-popup');
        var img = document.getElementById('ad-carousel-img');
        var cta = overlay.querySelector('.ad-cta-bar');
        var closeBtn = overlay.querySelector('.ad-close-btn');
        var prevBtn  = overlay.querySelector('.ad-prev-btn');
        var nextBtn  = overlay.querySelector('.ad-next-btn');
        var dots     = overlay.querySelectorAll('.ad-dot-item');
        var counter  = document.getElementById('ad-counter');

        if (!pop) return;

        /* Popup card */
        pop.style.maxWidth    = bp.popupMaxW;
        pop.style.maxHeight   = bp.popupMaxH + 'vh';
        pop.style.borderRadius = bp.radius + 'px';
        pop.style.overflow    = 'hidden';

        /* Image */
        if (img) {
            img.style.borderRadius = bp.radius + 'px ' + bp.radius + 'px 0 0';
            img.style.maxHeight    = (bp.popupMaxH - 8) + 'vh'; /* leave room for CTA */
            img.style.objectFit   = 'contain';
        }

        /* Overlay padding */
        overlay.style.padding = bp.padding;

        /* CTA bar */
        if (cta) {
            cta.style.fontSize    = bp.ctaFont;
            cta.style.padding     = bp.ctaPad;
            cta.style.borderRadius = '0 0 ' + bp.radius + 'px ' + bp.radius + 'px';
        }

        /* Close button */
        if (closeBtn) {
            closeBtn.style.width    = bp.closeSz + 'px';
            closeBtn.style.height   = bp.closeSz + 'px';
            closeBtn.style.fontSize = Math.round(bp.closeSz * 0.55) + 'px';
        }

        /* Nav buttons */
        [prevBtn, nextBtn].forEach(function (btn) {
            if (!btn) return;
            btn.style.width    = bp.navSz + 'px';
            btn.style.height   = bp.navSz + 'px';
            btn.style.fontSize = bp.navFont + 'px';
        });

        /* Dots */
        dots.forEach(function (d) {
            d.style.width  = bp.dotSz + 'px';
            d.style.height = bp.dotSz + 'px';
        });

        /* Counter */
        if (counter) counter.style.fontSize = bp.counterFont + 'px';
    }

    /* ─── Main Carousel Class ─────────────────────────────────────── */
    var ImageAdCarousel = (function () {
        function ImageAdCarousel() {
            /* Auto-detect page depth based on path markers */
            var path = window.location.pathname;
            this.prefix = '';
            if (path.indexOf('/pages/courses/') !== -1) {
                this.prefix = '../../';
            } else if (path.indexOf('/pages/') !== -1) {
                this.prefix = '../';
            }

            /* Hardcoded fallback ads — used when PHP is unavailable or returns empty */
            this.fallbackAds = [
                'images/ads/Update Flyer-01.jpg'
            ];

            this.ads = [];
            this.applyLink = 'https://docs.google.com/forms/d/e/1FAIpQLSdnJItkIMyt3SGNaDeTBDcMTBKNeKJ4lC8cx3wxSOvjpciX4g/viewform?usp=header';
            this.delay   = 1200; /* ms before popup appears */
            this.current = 0;
            this.init();
        }

        ImageAdCarousel.prototype.init = function () {
            if (document.getElementById('ad-carousel-overlay')) return;
            var self = this;

            /* Try to fetch fresh ads from PHP helper (cache busted to prevent stale results) */
            fetch(this.prefix + 'get_ads.php?t=' + Date.now())
                .then(function (r) {
                    if (!r.ok) throw new Error('HTTP ' + r.status);
                    return r.json();
                })
                .then(function (data) {
                    if (Array.isArray(data)) {
                        /* Use the dynamic list of ads directly. If empty, no ads will be shown. */
                        self.ads = data.map(function (a) { return self.prefix + a; });
                    } else {
                        /* PHP returned invalid data — use hardcoded fallback */
                        self.ads = self.fallbackAds.map(function (a) { return self.prefix + a; });
                    }
                    self.start();
                })
                .catch(function () {
                    /* PHP unavailable (no server / file:// protocol) — use hardcoded fallback */
                    self.ads = self.fallbackAds.map(function (a) { return self.prefix + a; });
                    self.start();
                });
        };

        ImageAdCarousel.prototype.start = function () {
            if (this.ads.length === 0) return;
            this.createStyles();
            this.createHTML();
            this.bindEvents();
            this.preload();

            var self = this;
            setTimeout(function () {
                self.show();
            }, 2000);
        };


        ImageAdCarousel.prototype.createStyles = function () {
            var s = document.createElement('style');
            s.id = 'ad-carousel-styles';
            /* Base styles — all responsive sizing is handled by JS in applyResponsive() */
            s.textContent = [
                /* Overlay */
                '#ad-carousel-overlay{',
                '  display:none;position:fixed;top:0;left:0;width:100%;height:100%;',
                '  background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);',
                '  z-index:99999;justify-content:center;align-items:center;',
                '  box-sizing:border-box;animation:adFadeIn .3s ease-out',
                '}',

                /* Popup card */
                '#ad-carousel-popup{',
                '  position:relative;width:auto;border-radius:18px;',
                '  overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.65);',
                '  animation:adScaleIn .35s cubic-bezier(.22,.87,.36,1);background:#000;',
                '  transition:max-width .2s ease,max-height .2s ease;',
                '  display:flex;flex-direction:column;min-width:280px;min-height:200px',
                '}',

                /* Ad image */
                '#ad-carousel-img{',
                '  width:auto;height:auto;max-width:100%;display:block;cursor:pointer;',
                '  transition:opacity .25s ease;object-fit:contain;',
                '  margin:0 auto;',
                '}',
                '#ad-carousel-img:hover{opacity:.92}',

                /* CTA bar */
                '.ad-cta-bar{',
                '  display:flex;align-items:center;justify-content:center;',
                '  background:linear-gradient(90deg,#0a5cbf,#1a7aff);color:#fff;',
                '  font-weight:700;gap:8px;text-decoration:none;',
                '  transition:background .2s,padding .2s,font-size .2s;',
                '  white-space:nowrap;flex-shrink:0;width:100%;box-sizing:border-box',
                '}',
                '.ad-cta-bar:hover{background:linear-gradient(90deg,#084fad,#1470ee);color:#fff}',

                /* Close button */
                '.ad-close-btn{',
                '  position:absolute;top:10px;right:10px;',
                '  background:rgba(0,0,0,.65);color:#fff;border:none;border-radius:50%;',
                '  font-weight:bold;cursor:pointer;',
                '  display:flex;align-items:center;justify-content:center;',
                '  transition:all .2s;z-index:10',
                '}',
                '.ad-close-btn:hover{background:#000;transform:scale(1.1)}',

                /* Nav arrows */
                '.ad-nav-btn{',
                '  position:absolute;top:42%;transform:translateY(-50%);',
                '  background:rgba(0,0,0,.55);color:#fff;border:none;',
                '  border-radius:50%;cursor:pointer;',
                '  display:flex;align-items:center;justify-content:center;',
                '  transition:all .2s;z-index:10',
                '}',
                '.ad-nav-btn:hover{background:rgba(0,0,0,.9)}',
                '.ad-prev-btn{left:10px}.ad-next-btn{right:10px}',

                /* Dots */
                '.ad-dots-bar{',
                '  position:absolute;bottom:50px;left:50%;transform:translateX(-50%);',
                '  display:flex;gap:6px;z-index:10',
                '}',
                '.ad-dot-item{',
                '  background:rgba(255,255,255,.4);border-radius:50%;',
                '  cursor:pointer;transition:background .2s,width .2s,height .2s',
                '}',
                '.ad-dot-item.active{background:#fff}',

                /* Counter label */
                '.ad-counter-lbl{',
                '  position:absolute;top:10px;left:10px;',
                '  background:rgba(0,0,0,.65);color:#fff;',
                '  padding:3px 10px;border-radius:10px;font-weight:600;',
                '  z-index:10;pointer-events:none',
                '}',

                /* Keyframes */
                '@keyframes adFadeIn{from{opacity:0}to{opacity:1}}',
                '@keyframes adScaleIn{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}'
            ].join('');
            document.head.appendChild(s);
        };

        ImageAdCarousel.prototype.createHTML = function () {
            var multi = this.ads.length > 1;
            var self  = this;
            var dots  = this.ads.map(function (_, i) {
                return '<div class="ad-dot-item' + (i === 0 ? ' active' : '') + '" data-idx="' + i + '"></div>';
            }).join('');

            var html = [
                '<div id="ad-carousel-overlay" role="dialog" aria-modal="true" aria-label="Admission Advertisement">',
                '  <div id="ad-carousel-popup">',
                '    <button class="ad-close-btn" aria-label="Close">&#215;</button>',
                multi ? '<button class="ad-nav-btn ad-prev-btn" aria-label="Previous">&#8249;</button>' : '',
                multi ? '<button class="ad-nav-btn ad-next-btn" aria-label="Next">&#8250;</button>' : '',
                '    <img id="ad-carousel-img" fetchpriority="high" src="' + this.ads[0] + '" alt="Admission Advertisement">',
                multi ? '<div class="ad-dots-bar">' + dots + '</div>' : '',
                multi ? '<div class="ad-counter-lbl" id="ad-counter">1/' + this.ads.length + '</div>' : '',
                '    <a class="ad-cta-bar" id="adCtaLink" href="' + this.applyLink + '" target="_blank" rel="noopener">',
                '      <i class="fas fa-pen-to-square"></i> Apply Now ( Admissions Open )',
                '    </a>',
                '  </div>',
                '</div>'
            ].join('');
            document.body.insertAdjacentHTML('beforeend', html);
        };

        ImageAdCarousel.prototype.bindEvents = function () {
            var self    = this;
            var overlay = document.getElementById('ad-carousel-overlay');
            var img     = document.getElementById('ad-carousel-img');
            var closeBtn = overlay.querySelector('.ad-close-btn');
            var prevBtn  = overlay.querySelector('.ad-prev-btn');
            var nextBtn  = overlay.querySelector('.ad-next-btn');
            var dots     = overlay.querySelectorAll('.ad-dot-item');
            var counter  = document.getElementById('ad-counter');

            function close() {
                overlay.style.display = 'none';
                document.body.style.overflow = '';
                document.removeEventListener('keydown', keyHandler);
                window.removeEventListener('resize', resizeHandler);
                window.removeEventListener('orientationchange', resizeHandler);
            }

            function go(dir) {
                self.current = (self.current + dir + self.ads.length) % self.ads.length;
                img.style.opacity = '0';
                setTimeout(function () {
                    img.src = self.ads[self.current];
                    img.style.opacity = '1';
                }, 200);
                dots.forEach(function (d, i) { d.classList.toggle('active', i === self.current); });
                if (counter) counter.textContent = (self.current + 1) + '/' + self.ads.length;
            }

            function keyHandler(e) {
                if (e.key === 'Escape')      close();
                if (e.key === 'ArrowLeft')   go(-1);
                if (e.key === 'ArrowRight')  go(1);
            }

            /* Resize / orientation change → re-apply responsive sizing */
            var resizeTimer;
            function resizeHandler() {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(applyResponsive, 80);
            }
            window.addEventListener('resize', resizeHandler);
            window.addEventListener('orientationchange', resizeHandler);

            /* Click image → apply link */
            img.addEventListener('click', function () {
                window.open(self.applyLink, '_blank', 'noopener');
            });

            closeBtn.addEventListener('click', close);
            overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
            if (prevBtn) prevBtn.addEventListener('click', function () { go(-1); });
            if (nextBtn) nextBtn.addEventListener('click', function () { go(1); });
            dots.forEach(function (d) {
                d.addEventListener('click', function () {
                    var idx = parseInt(d.getAttribute('data-idx'), 10);
                    go(idx - self.current);
                });
            });
            document.addEventListener('keydown', keyHandler);

            /* Touch swipe */
            var touchX = 0;
            overlay.addEventListener('touchstart', function (e) {
                touchX = e.touches[0].clientX;
            }, { passive: true });
            overlay.addEventListener('touchend', function (e) {
                var diff = touchX - e.changedTouches[0].clientX;
                if (Math.abs(diff) > 45) go(diff > 0 ? 1 : -1);
            }, { passive: true });
        };

        ImageAdCarousel.prototype.preload = function () {
            this.ads.forEach(function (src) { var img = new Image(); img.src = src; });
        };

        ImageAdCarousel.prototype.show = function () {
            var o = document.getElementById('ad-carousel-overlay');
            if (o) {
                o.style.display = 'flex';
                document.body.style.overflow = 'hidden';
                /* Apply correct sizing for the current screen on first show */
                applyResponsive();
            }
        };

        return ImageAdCarousel;
    })();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { new ImageAdCarousel(); });
    } else {
        new ImageAdCarousel();
    }
})();
