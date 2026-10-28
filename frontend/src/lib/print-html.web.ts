// Impression d'un document HTML dans la page elle-meme (fonctionne aussi en appli installee sur iPhone,
// ou les fenetres pop-up sont bloquees). Seul le document est imprime, pas l'interface de l'app.
export async function printHtmlWeb(html: string): Promise<void> {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const root = document.createElement("div");
  root.id = "print-root";
  const style = document.createElement("style");
  style.textContent = `
    #print-root { display: none; }
    @media print {
      @page { margin: 12mm; }
      html, body { height: auto !important; overflow: visible !important; display: block !important; }
      body > *:not(#print-root) { display: none !important; }
      #print-root { display: block; color: #111827; font-family: -apple-system, Helvetica, Arial, sans-serif; }
      ${[...doc.querySelectorAll("style")].map((s) => s.textContent?.replace(/\bbody\b/g, "#print-root")).join("\n")}
    }`;
  root.innerHTML = doc.body.innerHTML;
  document.body.appendChild(style);
  document.body.appendChild(root);
  const title = document.title;
  document.title = doc.title || title; // nom propose pour le fichier PDF

  // Attendre le chargement des justificatifs avant d'imprimer
  await Promise.all([...root.querySelectorAll("img")].map((img) => img.decode().catch(() => {})));

  const cleanup = () => {
    root.remove();
    style.remove();
    document.title = title;
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
  // Certains navigateurs mobiles n'envoient pas "afterprint"
  setTimeout(cleanup, 60000);
}
