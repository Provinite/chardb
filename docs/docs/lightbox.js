/**
 * Click-to-enlarge for the screenshots in these walkthroughs.
 *
 * Every page scales its screenshots down to the content column, which is
 * narrower than the 1280px they were captured at, so the detail is there but
 * not readable. This opens the clicked one at its full size over a dimmed
 * backdrop with its caption underneath.
 *
 * Drop-in: `<script src="lightbox.js" defer></script>` before </body>. No
 * dependencies, no markup changes, and it styles itself. Pages that use
 * `.screenshot` + `.screenshot-caption` and the one that uses
 * `<figure>` + `<figcaption>` both work, and an image with neither falls back
 * to its alt text.
 */
(() => {
  "use strict";

  const SELECTOR = ".screenshot img, figure img";

  /** The caption shown under an image, or its alt text when it has none. */
  const captionFor = (img) => {
    const box = img.closest(".screenshot, figure");
    const el = box && box.querySelector(".screenshot-caption, figcaption");
    const text = el ? el.textContent : img.getAttribute("alt");
    return (text || "").trim();
  };

  const style = document.createElement("style");
  style.textContent = `
    .lb-open { cursor: zoom-in; }
    .lb-open:focus-visible { outline: 3px solid #667eea; outline-offset: 3px; }

    #lb {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: none;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 1rem;
      padding: 2.5rem 1.5rem;
      background: rgba(15, 16, 30, 0.88);
      backdrop-filter: blur(3px);
    }
    #lb[data-open="1"] { display: flex; }

    #lb img {
      max-width: min(100%, 1600px);
      /* Room for the caption and the counter underneath. */
      max-height: calc(100vh - 11rem);
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: 10px;
      background: #fff;
      box-shadow: 0 20px 70px rgba(0, 0, 0, 0.5);
    }

    #lb-cap {
      max-width: min(100%, 900px);
      color: #eceef8;
      font-size: 0.95rem;
      line-height: 1.5;
      text-align: center;
    }
    #lb-cap:empty { display: none; }

    #lb-count {
      color: #a6adc8;
      font-size: 0.8125rem;
      letter-spacing: 0.03em;
    }

    #lb button {
      position: absolute;
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 999px;
      cursor: pointer;
      font: inherit;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #lb button:hover { background: rgba(255, 255, 255, 0.24); }
    #lb button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

    #lb-close {
      top: 1rem;
      right: 1rem;
      width: 40px;
      height: 40px;
      font-size: 1.4rem;
    }
    #lb-prev, #lb-next {
      top: 50%;
      transform: translateY(-50%);
      width: 44px;
      height: 44px;
      font-size: 1.5rem;
    }
    #lb-prev { left: 1rem; }
    #lb-next { right: 1rem; }
    #lb[data-single="1"] #lb-prev,
    #lb[data-single="1"] #lb-next,
    #lb[data-single="1"] #lb-count { display: none; }

    @media (max-width: 640px) {
      #lb { padding: 1rem; }
      #lb-prev, #lb-next { display: none; }
    }

    @media print {
      #lb { display: none !important; }
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = "lb";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Enlarged screenshot");
  overlay.innerHTML =
    '<button id="lb-close" type="button" aria-label="Close">&times;</button>' +
    '<button id="lb-prev" type="button" aria-label="Previous screenshot">&#8249;</button>' +
    '<button id="lb-next" type="button" aria-label="Next screenshot">&#8250;</button>' +
    '<img id="lb-img" alt="" />' +
    '<div id="lb-cap"></div>' +
    '<div id="lb-count"></div>';

  const shots = Array.from(document.querySelectorAll(SELECTOR));
  if (shots.length === 0) return;

  document.body.appendChild(overlay);
  const bigImg = overlay.querySelector("#lb-img");
  const capEl = overlay.querySelector("#lb-cap");
  const countEl = overlay.querySelector("#lb-count");
  overlay.dataset.single = shots.length === 1 ? "1" : "0";

  let index = 0;
  let opener = null;

  const show = (i) => {
    index = (i + shots.length) % shots.length;
    const img = shots[index];
    bigImg.src = img.currentSrc || img.src;
    bigImg.alt = img.getAttribute("alt") || "";
    capEl.textContent = captionFor(img);
    countEl.textContent = shots.length > 1 ? index + 1 + " / " + shots.length : "";
  };

  const open = (i) => {
    opener = shots[i];
    show(i);
    overlay.dataset.open = "1";
    document.body.style.overflow = "hidden";
    overlay.querySelector("#lb-close").focus();
  };

  const close = () => {
    overlay.dataset.open = "0";
    document.body.style.overflow = "";
    // Dropping the src frees a large decoded bitmap between openings.
    bigImg.removeAttribute("src");
    if (opener) opener.focus();
    opener = null;
  };

  shots.forEach((img, i) => {
    img.classList.add("lb-open");
    img.tabIndex = 0;
    img.setAttribute("role", "button");
    img.setAttribute(
      "aria-label",
      (img.getAttribute("alt") || "Screenshot") + " — enlarge",
    );
    img.addEventListener("click", () => open(i));
    img.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(i);
      }
    });
  });

  overlay.addEventListener("click", (e) => {
    // The backdrop closes; the image and the buttons do not.
    if (e.target === overlay || e.target === capEl || e.target === countEl) {
      close();
    }
  });
  overlay.querySelector("#lb-close").addEventListener("click", close);
  overlay.querySelector("#lb-prev").addEventListener("click", () => show(index - 1));
  overlay.querySelector("#lb-next").addEventListener("click", () => show(index + 1));

  document.addEventListener("keydown", (e) => {
    if (overlay.dataset.open !== "1") return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") show(index - 1);
    else if (e.key === "ArrowRight") show(index + 1);
  });
})();
