const PRECACHE = 'precache-v1';
const RUNTIME = 'runtime';
const HOSTNAME_WHITELIST = [
  self.location.hostname,
  "www.iyouhun.com",
  "www.shen.ee",
  "oss.iyouhun.com",
  "cdn.bootcdn.net",
  "cdnjs.cloudflare.com"
]

const getFixedUrl = (req) => {
  var now = Date.now();
  url = new URL(req.url)
  url.protocol = self.location.protocol
  url.search += (url.search ? '&' : '?') + 'cache-bust=' + now;
  return url.href
}

const isNavigationReq = (req) => (req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept').includes('text/html')))


const endWithExtension = (req) => Boolean(new URL(req.url).pathname.match(/\.\w+$/))

const shouldRedirect = (req) => (isNavigationReq(req) && new URL(req.url).pathname.substr(-1) !== "/" && !endWithExtension(req))

const getRedirectUrl = (req) => {
  url = new URL(req.url)
  url.pathname += "/"
  return url.href
}

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(PRECACHE).then(cache => {
      return cache.add('offline.html')
      .then(self.skipWaiting())
      .catch(err => console.log(err))
    })
  )
});


self.addEventListener('activate',  event => {
  console.log('service worker activated.')
  event.waitUntil(self.clients.claim());
});


self.addEventListener('fetch', event => {
  console.log(`fetch ${event.request.url}`)
  if (HOSTNAME_WHITELIST.indexOf(new URL(event.request.url).hostname) > -1) {
    
    if(shouldRedirect(event.request)){
      event.respondWith(Response.redirect(getRedirectUrl(event.request)))
      return;
    }

   
    const cached = caches.match(event.request);
    const fixedUrl = getFixedUrl(event.request);
    const fetched = fetch(fixedUrl, {cache: "no-store"});
    const fetchedCopy = fetched.then(resp => resp.clone());

    event.respondWith(
      Promise.race([fetched.catch(_ => cached), cached])
        .then(resp => resp || fetched)
        .catch(_ => caches.match('offline.html'))
    );

    event.waitUntil(
      Promise.all([fetchedCopy, caches.open(RUNTIME)])
        .then(([response, cache]) => response.ok && cache.put(event.request, response))
        .catch(_ => {/* eat any errors */})
    );
  }
});
