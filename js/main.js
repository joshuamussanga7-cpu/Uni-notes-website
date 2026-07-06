document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const menuBtn = document.getElementById('menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const closeBtn = document.getElementById('close-btn');

    if (menuBtn && mobileMenu && closeBtn) {
        menuBtn.addEventListener('click', () => {
            mobileMenu.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        });

        closeBtn.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
            document.body.style.overflow = 'auto';
        });
    }

    // Ripple Effect
    function createRipple(event) {
        const button = event.currentTarget;
        const circle = document.createElement('span');
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;

        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
        circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
        circle.classList.add('ripple');

        const ripple = button.getElementsByClassName('ripple')[0];
        if (ripple) { ripple.remove(); }
        button.appendChild(circle);
    }

    const rippleButtons = document.querySelectorAll('.btn-gradient');
    rippleButtons.forEach(btn => btn.addEventListener('click', createRipple));

    // APK Download Logic
    const downloadBtns = document.querySelectorAll('#download-apk-btn, .download-apk-action');
    downloadBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();

            btn.classList.add('btn-loading');
            const statusMsg = document.getElementById('download-status');
            if (statusMsg) {
                statusMsg.textContent = "Download will begin shortly...";
                statusMsg.classList.remove('hidden');
            }

            setTimeout(() => {
                btn.classList.remove('btn-loading');
                btn.classList.add('btn-success');

                const link = document.createElement('a');
                link.href = 'assets/apk/app-release.apk';
                link.download = 'UniversityNotes.apk';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                if (statusMsg) statusMsg.textContent = "Download started successfully!";

                setTimeout(() => {
                    btn.classList.remove('btn-success');
                    if (statusMsg) statusMsg.classList.add('hidden');
                }, 3000);
            }, 1500);
        });
    });

    // FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if(question) {
            question.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                faqItems.forEach(i => i.classList.remove('active'));
                if (!isActive) item.classList.add('active');
            });
        }
    });

    // Gallery Logic
    const galleryItems = document.querySelectorAll('.gallery-card');
    const filterChips = document.querySelectorAll('.filter-chip');
    const searchInput = document.getElementById('gallery-search');

    function filterGallery() {
        const activeCategory = document.querySelector('.filter-chip.active').dataset.filter;
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

        galleryItems.forEach(item => {
            const category = item.dataset.category;
            const caption = item.querySelector('.gallery-caption').textContent.toLowerCase();
            const matchesCategory = activeCategory === 'all' || category === activeCategory;
            const matchesSearch = caption.includes(searchTerm) || category.includes(searchTerm);

            if (matchesCategory && matchesSearch) {
                item.style.display = 'block';
                setTimeout(() => item.style.opacity = '1', 10);
            } else {
                item.style.opacity = '0';
                setTimeout(() => item.style.display = 'none', 300);
            }
        });
    }

    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            filterGallery();
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', filterGallery);
    }

    // Lightbox Logic
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');
    let currentImgIndex = 0;

    const visibleImages = () => Array.from(galleryItems).filter(item => item.style.display !== 'none');

    function showImage(index) {
        const images = visibleImages();
        if (index < 0) index = images.length - 1;
        if (index >= images.length) index = 0;
        currentImgIndex = index;
        const img = images[index].querySelector('img');
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
    }

    galleryItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            const images = visibleImages();
            currentImgIndex = images.indexOf(item);
            showImage(currentImgIndex);
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    });

    if (lightbox) {
        lightboxClose.addEventListener('click', () => {
            lightbox.classList.remove('active');
            document.body.style.overflow = 'auto';
        });

        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                lightbox.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        });

        lightboxPrev.addEventListener('click', () => showImage(currentImgIndex - 1));
        lightboxNext.addEventListener('click', () => showImage(currentImgIndex + 1));

        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('active')) return;
            if (e.key === 'Escape') lightbox.classList.remove('active');
            if (e.key === 'ArrowLeft') showImage(currentImgIndex - 1);
            if (e.key === 'ArrowRight') showImage(currentImgIndex + 1);
        });
    }

    // Intersection Observer for scroll animations
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.fade-in');
    animatedElements.forEach(el => observer.observe(el));

    // Navbar scroll effect
    const navbar = document.querySelector('nav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('bg-slate-900/90', 'backdrop-blur-md', 'shadow-lg');
            navbar.classList.remove('bg-transparent');
        } else {
            navbar.classList.remove('bg-slate-900/90', 'backdrop-blur-md', 'shadow-lg');
            navbar.classList.add('bg-transparent');
        }
    });
});
