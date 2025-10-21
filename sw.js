// sw.js

const CACHE_NAME = 'lunch-roulette-cache-v2'; // 캐시 이름 (버전 변경 시 업데이트 필요)
const urlsToCache = [
  './', // 루트 URL (index.html)
  './index.html',
  './manifest.json',
  './icon.png',
  './og_image.png',
  // GSAP CDN URL 추가 (앱에서 사용하는 외부 리소스도 캐싱)
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js',
  // CSS와 JS가 index.html 내부에 있으므로 별도 파일은 필요 없음
  // 만약 별도의 CSS/JS 파일이 있다면 여기에 추가:
  // './style.css',
  // './app.js'
];

// 서비스 워커 설치 이벤트
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        // 설치 후 즉시 활성화되도록 강제
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// 서비스 워커 활성화 이벤트 (오래된 캐시 정리)
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
        console.log('Service Worker: Activation complete');
        // 활성화 후 즉시 클라이언트를 제어하도록 함
        return self.clients.claim();
      })
  );
});

// 네트워크 요청 перехват 이벤트 (캐시 우선 전략)
self.addEventListener('fetch', event => {
  // console.log('Service Worker: Fetching', event.request.url);
  event.respondWith(
    caches.match(event.request) // 요청과 일치하는 캐시 확인
      .then(response => {
        // 캐시가 있으면 캐시된 응답 반환
        if (response) {
          // console.log('Service Worker: Found in cache', event.request.url);
          return response;
        }
        // 캐시가 없으면 네트워크에서 가져옴
        // console.log('Service Worker: Not found in cache, fetching from network', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // 가져오기 성공 시
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              // 기본 요청이 아니면 캐시하지 않음 (예: Chrome 확장 프로그램 요청)
              return networkResponse;
            }
            // 응답을 복제하여 하나는 브라우저에, 하나는 캐시에 저장
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return networkResponse;
          }
        ).catch(error => {
          console.error('Service Worker: Fetch failed', error);
          // 오프라인 대체 페이지 등을 반환할 수 있음 (옵션)
          // return caches.match('./offline.html');
        });
      })
  );
});