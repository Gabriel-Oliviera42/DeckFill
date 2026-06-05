/**
 * Local jsPDF fallback backed by pdf-lib.
 *
 * The app still prefers the official jsPDF CDN when it is available. This file
 * only registers window.jspdf.jsPDF when the CDN failed to load, keeping PDF
 * generation usable in offline/local environments.
 */

(function registerJsPdfFallback() {
  if (window.jspdf?.jsPDF || !window.PDFLib) {
    return;
  }

  const MM_TO_PT = 72 / 25.4;
  const A4_PORTRAIT_MM = [210, 297];

  function toPoint(valueMm) {
    return Number(valueMm || 0) * MM_TO_PT;
  }

  function normalizeColor(args) {
    const [r = 0, g = 0, b = 0] = args;
    return window.PDFLib.rgb(
      Number(r) / 255,
      Number(g) / 255,
      Number(b) / 255,
    );
  }

  function resolvePageSize(format, orientation) {
    let widthMm = A4_PORTRAIT_MM[0];
    let heightMm = A4_PORTRAIT_MM[1];

    if (Array.isArray(format) && format.length >= 2) {
      widthMm = Number(format[0]);
      heightMm = Number(format[1]);
    }

    if (orientation === "landscape" && widthMm < heightMm) {
      [widthMm, heightMm] = [heightMm, widthMm];
    }

    if (orientation === "portrait" && widthMm > heightMm) {
      [widthMm, heightMm] = [heightMm, widthMm];
    }

    return { widthMm, heightMm, widthPt: toPoint(widthMm), heightPt: toPoint(heightMm) };
  }

  function dataUrlToBytes(dataUrl) {
    const base64 = String(dataUrl || "").split(",")[1] || "";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  }

  class PdfLibJsPdfFallback {
    constructor(options = {}) {
      this.options = options;
      this.pageSize = resolvePageSize(
        options.format || "a4",
        options.orientation || "portrait",
      );
      this.pdfPromise = window.PDFLib.PDFDocument.create();
      this.pages = [];
      this.currentPageIndex = 0;
      this.queue = Promise.resolve();
      this.drawColor = window.PDFLib.rgb(0, 0, 0);
      this.fillColor = window.PDFLib.rgb(0, 0, 0);
      this.lineWidthPt = toPoint(0.1);
      this.imageCache = new Map();

      this.pages.push(this.createPage());
      this.internal = {
        pageSize: {
          getWidth: () => this.pageSize.widthMm,
          getHeight: () => this.pageSize.heightMm,
        },
      };
    }

    createPage() {
      return this.pdfPromise.then((pdfDoc) =>
        pdfDoc.addPage([this.pageSize.widthPt, this.pageSize.heightPt]),
      );
    }

    enqueue(drawOperation) {
      this.queue = this.queue.then(drawOperation);
      return this;
    }

    getCurrentPagePromise() {
      return this.pages[this.currentPageIndex];
    }

    addPage() {
      this.pages.push(this.createPage());
      this.currentPageIndex = this.pages.length - 1;
      return this;
    }

    setPage(pageNumber) {
      const targetIndex = Math.max(0, Number(pageNumber || 1) - 1);

      while (this.pages.length <= targetIndex) {
        this.pages.push(this.createPage());
      }

      this.currentPageIndex = targetIndex;
      return this;
    }

    setDrawColor(...args) {
      this.drawColor = normalizeColor(args);
      return this;
    }

    setFillColor(...args) {
      this.fillColor = normalizeColor(args);
      return this;
    }

    setLineWidth(widthMm) {
      this.lineWidthPt = toPoint(widthMm);
      return this;
    }

    line(x1, y1, x2, y2) {
      const pagePromise = this.getCurrentPagePromise();

      return this.enqueue(async () => {
        const page = await pagePromise;
        page.drawLine({
          start: { x: toPoint(x1), y: this.pageSize.heightPt - toPoint(y1) },
          end: { x: toPoint(x2), y: this.pageSize.heightPt - toPoint(y2) },
          thickness: this.lineWidthPt,
          color: this.drawColor,
        });
      });
    }

    rect(x, y, width, height, style = "") {
      const pagePromise = this.getCurrentPagePromise();

      return this.enqueue(async () => {
        const page = await pagePromise;
        const drawOptions = {
          x: toPoint(x),
          y: this.pageSize.heightPt - toPoint(y) - toPoint(height),
          width: toPoint(width),
          height: toPoint(height),
        };

        if (String(style).toUpperCase().includes("F")) {
          drawOptions.color = this.fillColor;
        } else {
          drawOptions.borderColor = this.drawColor;
          drawOptions.borderWidth = this.lineWidthPt;
        }

        page.drawRectangle(drawOptions);
      });
    }

    addImage(dataUrl, _format, x, y, width, height) {
      const pagePromise = this.getCurrentPagePromise();

      return this.enqueue(async () => {
        const pdfDoc = await this.pdfPromise;
        const page = await pagePromise;
        let image = this.imageCache.get(dataUrl);

        if (!image) {
          image = await pdfDoc.embedJpg(dataUrlToBytes(dataUrl));
          this.imageCache.set(dataUrl, image);
        }

        page.drawImage(image, {
          x: toPoint(x),
          y: this.pageSize.heightPt - toPoint(y) - toPoint(height),
          width: toPoint(width),
          height: toPoint(height),
        });
      });
    }

    async save(filename = "decklist.pdf") {
      await this.queue;
      const pdfDoc = await this.pdfPromise;
      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  }

  window.jspdf = { jsPDF: PdfLibJsPdfFallback };
})();
