const resource = [
    /* --- CSS --- */
    '/YeBug.github.io/assets/css/style.css',

    /* --- PWA --- */
    '/YeBug.github.io/app.js',
    '/YeBug.github.io/sw.js',

    /* --- HTML --- */
    '/YeBug.github.io/index.html',
    '/YeBug.github.io/404.html',

    
        '/YeBug.github.io/categories/',
    
        '/YeBug.github.io/tags/',
    
        '/YeBug.github.io/archives/',
    
        '/YeBug.github.io/about/',
    

    /* --- Favicons & compressed JS --- */
    
    
        '/YeBug.github.io/assets/img/favicons/android-chrome-192x192.png',
        '/YeBug.github.io/assets/img/favicons/android-chrome-512x512.png',
        '/YeBug.github.io/assets/img/favicons/apple-touch-icon.png',
        '/YeBug.github.io/assets/img/favicons/favicon-16x16.png',
        '/YeBug.github.io/assets/img/favicons/favicon-32x32.png',
        '/YeBug.github.io/assets/img/favicons/favicon.ico',
        '/YeBug.github.io/assets/img/favicons/mstile-150x150.png',
        '/YeBug.github.io/assets/js/dist/categories.min.js',
        '/YeBug.github.io/assets/js/dist/commons.min.js',
        '/YeBug.github.io/assets/js/dist/home.min.js',
        '/YeBug.github.io/assets/js/dist/misc.min.js',
        '/YeBug.github.io/assets/js/dist/page.min.js',
        '/YeBug.github.io/assets/js/dist/post.min.js'
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

