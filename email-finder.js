// npm install puppeteer

const puppeteer = require("puppeteer");

const company = process.argv[2];
if (!company) { console.error("Usage: node email-finder.js \"Company\""); process.exit(1); }

const PAGES = 5;
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"],
  });

  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
  await page.setExtraHTTPHeaders({ "Accept-Language": "fr-FR,fr;q=0.9" });

  const allEmails = new Set();

  for (let p = 0; p < PAGES; p++) {
    const query = encodeURIComponent(`"${company}"`);
    const url = `https://www.google.com/search?q=${query}&start=${p * 10}&hl=fr`;

    console.log(`Page ${p + 1}...`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

    const text = await page.evaluate(() => {
      const body = document.body.innerText;
      const mailtos = Array.from(document.querySelectorAll("a[href^='mailto:']"))
        .map(a => a.href.replace("mailto:", ""));
      return body + " " + mailtos.join(" ");
    });

    (text.match(EMAIL_REGEX) || []).forEach(e => allEmails.add(e.toLowerCase()));

    if (p < PAGES - 1) await new Promise(r => setTimeout(r, 1500));
  }

  await browser.close();

  console.log(`\n${allEmails.size} adresse(s) trouvée(s) pour "${company}" :\n`);
  [...allEmails].forEach(e => console.log(" ", e));
})();
