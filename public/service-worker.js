self.addEventListener("install", (event) => {
    console.log("[ServiceWorker] Installed");
  });
  
  self.addEventListener("activate", (event) => {
    console.log("[ServiceWorker] Activated");
  });
  
  self.addEventListener("fetch", (event) => {
    // You can cache or handle requests here if needed
    // This is optional and just logs fetches
    console.log("[ServiceWorker] Fetching:", event.request.url);
  });
  