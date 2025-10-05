// 懒加载配置常量
const LAZY_LOAD_CONFIG = {
    rootMargin: '50px', // 提前50px开始加载
    threshold: 0.01,    // 1%可见就开始加载
    loadingImage: 'assets/loading.gif',
    loadedClass: 'loaded',
    lazyClass: 'lazy'
};

// 单例observer实例
let lazyLoadObserver = null;

function getLazyLoadObserver() {
    if (!lazyLoadObserver) {
        lazyLoadObserver = new IntersectionObserver(
            handleIntersection,
            {
                rootMargin: LAZY_LOAD_CONFIG.rootMargin,
                threshold: LAZY_LOAD_CONFIG.threshold
            }
        );
    }
    return lazyLoadObserver;
}

function handleIntersection(entries, observer) {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const img = entry.target;
        const imageSrc = img.dataset?.src;
        
        if (!imageSrc) {
            console.warn('Lazy load image missing src:', img);
            observer.unobserve(img);
            return;
        }

        // 设置加载状态
        img.classList.add('loading');
        
        img.onload = () => {
            img.classList.remove(LAZY_LOAD_CONFIG.lazyClass, 'loading');
            img.classList.add(LAZY_LOAD_CONFIG.loadedClass);
            observer.unobserve(img);
        };

        img.onerror = () => {
            img.src = LAZY_LOAD_CONFIG.loadingImage;
            img.classList.remove(LAZY_LOAD_CONFIG.lazyClass, 'loading');
            observer.unobserve(img);
        };

        img.src = imageSrc;
    });
}

function lazyLoad() {
    const images = document.querySelectorAll(`img.${LAZY_LOAD_CONFIG.lazyClass}`);
    if (!images.length) return;

    const observer = getLazyLoadObserver();
    images.forEach(img => observer.observe(img));
}

// 清理函数
function cleanupLazyLoad() {
    if (lazyLoadObserver) {
        lazyLoadObserver.disconnect();
        lazyLoadObserver = null;
    }
}


console.log('%c[7/8]%c Lazy-load script loaded.', styles.step, styles.info);