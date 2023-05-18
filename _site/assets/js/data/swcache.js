const resource = [
    /* --- CSS --- */
    '/YeBug.github.io/_site/assets/css/style.css',

    /* --- PWA --- */
    '/YeBug.github.io/_site/app.js',
    '/YeBug.github.io/_site/sw.js',

    /* --- HTML --- */
    '/YeBug.github.io/_site/index.html',
    '/YeBug.github.io/_site/404.html',

    
        '/YeBug.github.io/_site/categories/',
    
        '/YeBug.github.io/_site/tags/',
    
        '/YeBug.github.io/_site/archives/',
    
        '/YeBug.github.io/_site/about/',
    

    /* --- Favicons & compressed JS --- */
    
    
        '/YeBug.github.io/_site/assets/img/favicons/android-chrome-192x192.png',
        '/YeBug.github.io/_site/assets/img/favicons/android-chrome-512x512.png',
        '/YeBug.github.io/_site/assets/img/favicons/apple-touch-icon.png',
        '/YeBug.github.io/_site/assets/img/favicons/favicon-16x16.png',
        '/YeBug.github.io/_site/assets/img/favicons/favicon-32x32.png',
        '/YeBug.github.io/_site/assets/img/favicons/favicon.ico',
        '/YeBug.github.io/_site/assets/img/favicons/mstile-150x150.png',
        '/YeBug.github.io/_site/assets/js/dist/categories.min.js',
        '/YeBug.github.io/_site/assets/js/dist/commons.min.js',
        '/YeBug.github.io/_site/assets/js/dist/home.min.js',
        '/YeBug.github.io/_site/assets/js/dist/misc.min.js',
        '/YeBug.github.io/_site/assets/js/dist/page.min.js',
        '/YeBug.github.io/_site/assets/js/dist/post.min.js'
];

/* The request url with below domain will be cached */
const allowedDomains = [
    

    'YeBug.github.io',

    

    'fonts.gstatic.com',
    'fonts.googleapis.com',
    'cdn.jsdelivr.net',
    'polyfill.io'
];

/* Requests that include the following path will be banned */
const denyUrls = [
    
];

