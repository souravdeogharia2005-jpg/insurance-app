const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Disable translation prompt in Chrome
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'language', { get: () => 'en-US' });
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    try {
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 15000 });
    } catch (e) {
        console.log("Navigation timeout, proceeding anyway");
    }

    // Wait a bit for animations
    await new Promise(r => setTimeout(r, 2000));

    await page.screenshot({ path: 'local_screenshot.png', fullPage: true });

    const html = await page.evaluate(() => {
        // Return a simplified DOM tree
        function traverse(node) {
            let res = `<${node.tagName.toLowerCase()}`;
            if (node.id) res += ` id="${node.id}"`;
            if (node.className && typeof node.className === 'string') res += ` class="${node.className}"`;
            
            const rect = node.getBoundingClientRect();
            res += ` style="top:${rect.top}px;height:${rect.height}px;"`;
            res += `>`;
            
            for (let i = 0; i < node.children.length; i++) {
                res += traverse(node.children[i]);
            }
            res += `</${node.tagName.toLowerCase()}>`;
            return res;
        }
        return traverse(document.body);
    });

    fs.writeFileSync('dom_tree.txt', html);
    console.log("Screenshot and DOM tree saved.");
    await browser.close();
})();
