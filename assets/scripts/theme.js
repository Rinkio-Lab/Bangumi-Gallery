const themeToggle = document.getElementById('themeToggle');
themeToggle.onclick = () => document.body.classList.toggle('light');

console.log('%c[6/8]%c Theme script loaded.', styles.step, styles.info);