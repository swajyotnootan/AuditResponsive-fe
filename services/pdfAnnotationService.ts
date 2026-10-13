// services/pdfAnnotationService.ts
// ✅ Embeds highlights and text annotations directly into PDF

import { decode as atob, encode as btoa } from "base-64";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface HighlightData {
  id: string;
  text: string;
  page: number;
  color: string;
  rect?: { x: number; y: number; width: number; height: number };
}

export interface AnnotationData {
  id: string;
  text: string;
  page: number;
  x: number;
  y: number;
  author?: string;
  timestamp?: string;
}

export class PDFAnnotationService {
  /**
   * Convert hex color to RGB (0-1 range)
   */
  private static hexToRgb(hex: string) {
    const clean = (hex || "#eab308").replace("#", "");
    const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(clean);
    return result
      ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255,
        }
      : { r: 1, g: 0.85, b: 0.1 };
  }

  /**
   * Wrap long text into multiple lines
   */
  private static wrapText(text: string, maxChars: number): string[] {
    if (!text) return [""];
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      if ((currentLine + " " + word).trim().length <= maxChars) {
        currentLine = (currentLine + " " + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length > 0 ? lines : [""];
  }

  /**
   * Safe base64 → Uint8Array (works on web + native)
   */
  private static base64ToUint8Array(base64: string): Uint8Array {
    if (typeof atob === "function") {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }
    // Fallback for React Native (should already have atob polyfill via base-64)
    // If not, install 'base-64' and uncomment:
    // const { decode } = require('base-64');
    // const binaryString = decode(base64);
    // const bytes = new Uint8Array(binaryString.length);
    // for (let i = 0; i < binaryString.length; i++) {
    //   bytes[i] = binaryString.charCodeAt(i);
    // }
    // return bytes;
    throw new Error("atob not available. Install base-64 polyfill.");
  }

  /**
   * Safe Uint8Array → base64 (works on web + native, chunked)
   */
  private static uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk) as number[]);
    }
    if (typeof btoa === "function") {
      return btoa(binary);
    }
    // const { encode } = require('base-64');
    // return encode(binary);
    throw new Error("btoa not available. Install base-64 polyfill.");
  }

  /**
   * Main method - embeds annotations into PDF
   * @param pdfBase64 - original PDF as base64 string
   * @param highlights - array of highlights
   * @param annotations - array of text annotations
   * @returns modified PDF as base64 string
   */
  static async embedAnnotations(
    pdfBase64: string,
    highlights: HighlightData[] = [],
    annotations: AnnotationData[] = [],
  ): Promise<string> {
    try {
      // 1. Decode base64 → Uint8Array
      const pdfBytes = this.base64ToUint8Array(pdfBase64);

      // 2. Load PDF
      const pdfDoc = await PDFDocument.load(pdfBytes, {
        ignoreEncryption: true,
      });
      const pages = pdfDoc.getPages();

      console.log("📄 [PDFAnnotationService] Pages in PDF:", pages.length);
      console.log("📄 [PDFAnnotationService] Highlights:", highlights.length);
      console.log("📄 [PDFAnnotationService] Annotations:", annotations.length);

      // 3. Embed fonts
      const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // 4. Draw highlights on their pages
      for (const highlight of highlights) {
        const pageIndex = (highlight.page || 1) - 1;
        if (pageIndex < 0 || pageIndex >= pages.length) continue;

        const page = pages[pageIndex];
        const { r, g, b } = this.hexToRgb(highlight.color || "#eab308");

        if (
          highlight.rect &&
          highlight.rect.width > 0 &&
          highlight.rect.height > 0
        ) {
          page.drawRectangle({
            x: highlight.rect.x,
            y: page.getHeight() - highlight.rect.y - highlight.rect.height,
            width: highlight.rect.width,
            height: highlight.rect.height,
            color: rgb(r, g, b),
            opacity: 0.4,
          });
        }
      }

      // 5. Add "Annotations Summary" page at the end
      if (annotations.length > 0 || highlights.length > 0) {
        const summaryPage = pdfDoc.addPage([595, 842]); // A4
        const { width, height } = summaryPage.getSize();

        // Header bar
        summaryPage.drawRectangle({
          x: 0,
          y: height - 80,
          width: width,
          height: 80,
          color: rgb(0.12, 0.16, 0.4),
        });

        summaryPage.drawText("ANNOTATIONS & HIGHLIGHTS SUMMARY", {
          x: 40,
          y: height - 50,
          size: 18,
          font: boldFont,
          color: rgb(1, 1, 1),
        });

        summaryPage.drawText(`Generated: ${new Date().toLocaleString()}`, {
          x: 40,
          y: height - 70,
          size: 10,
          font: regularFont,
          color: rgb(0.85, 0.85, 0.95),
        });

        let yPos = height - 120;

        // ---- HIGHLIGHTS SECTION ----
        if (highlights.length > 0) {
          summaryPage.drawText(`HIGHLIGHTS (${highlights.length})`, {
            x: 40,
            y: yPos,
            size: 14,
            font: boldFont,
            color: rgb(0.7, 0.5, 0),
          });
          yPos -= 25;

          highlights.forEach((h, idx) => {
            if (yPos < 60) return;

            const lines = this.wrapText(h.text || "", 80);

            summaryPage.drawText(`${idx + 1}.`, {
              x: 40,
              y: yPos,
              size: 11,
              font: boldFont,
              color: rgb(0.2, 0.2, 0.2),
            });

            lines.forEach((line, lineIdx) => {
              summaryPage.drawText(line, {
                x: 60,
                y: yPos - lineIdx * 14,
                size: 11,
                font: regularFont,
                color: rgb(0.2, 0.2, 0.2),
              });
            });

            yPos -= lines.length * 14 + 8;

            summaryPage.drawText(
              `Page ${h.page || 1} • ${h.color || "#eab308"}`,
              {
                x: 60,
                y: yPos,
                size: 9,
                font: regularFont,
                color: rgb(0.6, 0.6, 0.6),
              },
            );

            yPos -= 20;
          });

          yPos -= 10;
        }

        // ---- ANNOTATIONS SECTION ----
        if (annotations.length > 0) {
          summaryPage.drawText(`ANNOTATIONS (${annotations.length})`, {
            x: 40,
            y: yPos,
            size: 14,
            font: boldFont,
            color: rgb(0.15, 0.35, 0.7),
          });
          yPos -= 25;

          annotations.forEach((a, idx) => {
            if (yPos < 60) return;

            const lines = this.wrapText(a.text || "", 80);

            summaryPage.drawText(`${idx + 1}.`, {
              x: 40,
              y: yPos,
              size: 11,
              font: boldFont,
              color: rgb(0.2, 0.2, 0.2),
            });

            lines.forEach((line, lineIdx) => {
              summaryPage.drawText(line, {
                x: 60,
                y: yPos - lineIdx * 14,
                size: 11,
                font: regularFont,
                color: rgb(0.2, 0.2, 0.2),
              });
            });

            yPos -= lines.length * 14 + 8;

            const meta = `Page ${a.page || 1}${a.author ? ` • ${a.author}` : ""}${a.timestamp ? ` • ${a.timestamp}` : ""}`;
            summaryPage.drawText(meta, {
              x: 60,
              y: yPos,
              size: 9,
              font: regularFont,
              color: rgb(0.6, 0.6, 0.6),
            });

            yPos -= 20;
          });
        }
      }

      // 6. Save PDF
      const modifiedBytes = await pdfDoc.save();
      console.log(
        "📄 [PDFAnnotationService] Modified PDF size:",
        modifiedBytes.length,
      );

      // 7. Convert Uint8Array → base64
      return this.uint8ArrayToBase64(modifiedBytes);
    } catch (error) {
      console.error(
        "❌ [PDFAnnotationService] Error embedding annotations:",
        error,
      );
      // Return original PDF if embedding fails (so user still gets a file)
      return pdfBase64;
    }
  }
}
