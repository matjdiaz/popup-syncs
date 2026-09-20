const { JSDOM } = require('jsdom');
const fs = require('fs');

async function run() {
    const loaderCode = fs.readFileSync('public/welcome-loader.js', 'utf8');
    const dom = new JSDOM(`<!DOCTYPE html>
    <html>
    <head></head>
    <body>
        <script>
            var s = document.createElement('script');
            s.src = "/welcome-loader.js?v=123"; 
            s.setAttribute("data-client-id", "vadigu-news.vercel.app");
            document.head.appendChild(s);
        </script>
    </body>
    </html>`, {
        url: "https://vadigu-news.vercel.app/demo.html",
        runScripts: "dangerously",
        resources: "usable"
    });

    // Mock fetch for JSDOM
    dom.window.fetch = async (url) => {
        console.log("Fetch called:", url);
        if (url.includes('mensajes')) {
            return {
                json: async () => [{
                    id: '1234',
                    title: 'Test Message',
                    message: 'Hello World',
                    activo: true
                }]
            };
        }
        if (url.includes('avisos_globales')) {
            return { json: async () => [] };
        }
        return { json: async () => ({}) };
    };

    // Inject the loader code as if it was fetched
    const script = dom.window.document.createElement("script");
    script.textContent = loaderCode;
    dom.window.document.head.appendChild(script);

    // Wait for async operations
    await new Promise(r => setTimeout(r, 2000));

    // Check if popup rendered
    const popup = dom.window.document.querySelector('.w-sync-popup');
    console.log("Popup rendered?", !!popup);
    if (popup) {
        console.log("Title found:", dom.window.document.querySelector('.w-sync-title').textContent);
    }
}

run().catch(console.error);
