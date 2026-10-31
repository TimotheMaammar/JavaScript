
(async () => {
  const log = (...args) => console.log("[Scribd]", ...args);
  const html = document.documentElement.innerHTML;

  const pageFiles = [
    ...html.matchAll(/contentUrl\s*:\s*["']([^"']+)["']/g)
  ].map(m => m[1]);

  const uniqueFiles = [...new Set(pageFiles)];
  log(`${uniqueFiles.length} ressources trouvées`);

  const imageLinks = new Set();

  const imageRegex =
    /https?:\\?\/\\?\/html\.scribd\.com\\?\/[^"'\\\s]+?\/images\\?\/\d+-[a-f0-9]+\.jpg/gi;

  for (const match of html.matchAll(imageRegex)) {
    imageLinks.add(match[0].replace(/\\/g, ""));
  }

  const origRegex =
    /orig\s*=\s*["'](https?:\/\/[^"']+\.jpg)["']/gi;

  for (let i = 0; i < uniqueFiles.length; i++) {
    const file = uniqueFiles[i];

    try {
      const response = await fetch(new URL(file, location.href));
      if (!response.ok) continue;

      const content = await response.text();

      for (const match of content.matchAll(imageRegex)) {
        imageLinks.add(match[0].replace(/\\/g, ""));
      }

      for (const match of content.matchAll(origRegex)) {
        imageLinks.add(match[1]);
      }

      log(`Ressource ${i + 1}/${uniqueFiles.length} traitée`);
    } catch (error) {
      log(`Ressource inaccessible : ${file}`);
    }
  }

  const links = [...imageLinks].sort((a, b) => {
    const getPage = url =>
      Number(url.match(/images\/(\d+)-/)?.[1] || 0);

    return getPage(a) - getPage(b);
  });

  window.scribdPageLinks = links;

  if (!links.length) {
    alert("Aucune image trouvée.");
    return;
  }

  log(`${links.length} images trouvées. Création du document...`);

  const escapeHTML = str =>
    str.replace(/&/g, "&amp;")
       .replace(/"/g, "&quot;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;");

  const pages = links.map((url, i) => `
    <section class="page">
      <div class="number">Page ${i + 1} / ${links.length}</div>
      <img src="${escapeHTML(url)}" loading="lazy">
    </section>
  `).join("\n");

  const documentHTML = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Scribd - ${links.length} pages</title>
<style>
  body {
    margin: 0;
    padding: 20px;
    background: #555;
    font-family: Arial, sans-serif;
  }
  .page {
    margin: 0 auto 25px;
    max-width: 1000px;
    background: white;
    padding: 10px;
    box-shadow: 0 2px 12px #222;
  }
  .page img {
    display: block;
    width: 100%;
    height: auto;
  }
  .number {
    padding: 8px;
    color: #555;
    font-size: 13px;
  }
</style>
</head>
<body>
${pages}
</body>
</html>`;

  const blob = new Blob([documentHTML], {
    type: "text/html;charset=utf-8"
  });

  const blobURL = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = blobURL;
  a.download = `Scribd-${links.length}-pages.html`;

  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(blobURL), 60000);

  log("Terminé !");
  log("Liens :", links);
  alert(`${links.length} pages extraites. Fichier HTML téléchargé !`);
})();
