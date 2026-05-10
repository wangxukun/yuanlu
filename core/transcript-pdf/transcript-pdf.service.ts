/**
 * 文稿 PDF 生成服务
 * 使用 PDFKit 在服务端生成精美的双语文稿 PDF
 */
import PDFDocument from "pdfkit";
import * as path from "path";
import * as fs from "fs";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TranscriptPdfInput {
  episodeTitle: string;
  podcastTitle: string;
  coverUrl?: string; // Signed OSS URL for the cover image
  subtitles: {
    id: number;
    startTime: string;
    endTime: string;
    textEn: string;
    textZh: string;
  }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const BRAND_BLUE: [number, number, number] = [0, 51, 102];
const GRAY_TEXT: [number, number, number] = [102, 102, 102];
const BLACK_TEXT: [number, number, number] = [33, 33, 33];
const DIVIDER_COLOR: [number, number, number] = [200, 200, 200];

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN_LEFT = 56;
const MARGIN_RIGHT = 56;
const MARGIN_TOP = 70;
const MARGIN_BOTTOM = 70;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

const CJK_FONT_PATH = path.join(
  process.cwd(),
  "lib",
  "fonts",
  "NotoSansSC-Variable.ttf",
);
const ROBOTO_REGULAR_PATH = path.join(
  process.cwd(),
  "lib",
  "fonts",
  "Roboto-Regular.woff",
);
const ROBOTO_BOLD_PATH = path.join(
  process.cwd(),
  "lib",
  "fonts",
  "Roboto-Bold.woff",
);

// ─── Helper: Fetch cover image as Buffer ──────────────────────────────────────
async function fetchCoverImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (e) {
    console.warn("[TranscriptPDF] Failed to fetch cover image:", e);
    return null;
  }
}

// ─── Main PDF Generation ──────────────────────────────────────────────────────
export async function generateTranscriptPdf(
  input: TranscriptPdfInput,
): Promise<Buffer> {
  const { episodeTitle, podcastTitle, subtitles, coverUrl } = input;

  // Verify font file exists
  if (!fs.existsSync(CJK_FONT_PATH)) {
    throw new Error(
      "CJK font file not found. Please ensure NotoSansSC-Variable.ttf is in lib/fonts/",
    );
  }

  // Pre-fetch cover image
  let coverImageBuffer: Buffer | null = null;
  if (coverUrl) {
    coverImageBuffer = await fetchCoverImage(coverUrl);
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: MARGIN_TOP,
        bottom: MARGIN_BOTTOM,
        left: MARGIN_LEFT,
        right: MARGIN_RIGHT,
      },
      bufferPages: true, // Enable buffering so we can add page numbers after
      font: CJK_FONT_PATH, // 显式指定字体，防止 PDFKit 加载默认的 Helvetica 导致路径错误
      info: {
        Title: `${episodeTitle} - 文稿`,
        Author: "远路播客",
        Subject: `${podcastTitle} - ${episodeTitle}`,
        Creator: "远路播客 wxkzd.com",
      },
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Register fonts
    doc.registerFont("NotoSansSC", CJK_FONT_PATH);
    if (fs.existsSync(ROBOTO_REGULAR_PATH)) {
      doc.registerFont("Roboto", ROBOTO_REGULAR_PATH);
    }
    if (fs.existsSync(ROBOTO_BOLD_PATH)) {
      doc.registerFont("Roboto-Bold", ROBOTO_BOLD_PATH);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Render first page header
    // ──────────────────────────────────────────────────────────────────────────
    renderFirstPageHeader(doc, podcastTitle);

    // ──────────────────────────────────────────────────────────────────────────
    // Render title block with optional cover image
    // ──────────────────────────────────────────────────────────────────────────
    renderTitleBlock(doc, podcastTitle, episodeTitle, coverImageBuffer);

    // ──────────────────────────────────────────────────────────────────────────
    // Disclaimer note
    // ──────────────────────────────────────────────────────────────────────────
    doc.moveDown(0.8);
    // doc.font("NotoSansSC").fontSize(9).fillColor(GRAY_TEXT);
    // doc.text("注：AI翻译，仅供参考。", MARGIN_LEFT, doc.y, {
    //   width: CONTENT_WIDTH,
    // });
    // doc.moveDown(1);

    // ──────────────────────────────────────────────────────────────────────────
    // Render transcript blocks
    // ──────────────────────────────────────────────────────────────────────────
    for (const sub of subtitles) {
      renderTranscriptBlock(doc, sub.textEn, sub.textZh);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Add page numbers / footers (post-render on all buffered pages)
    // ──────────────────────────────────────────────────────────────────────────
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);

      // Temporarily remove bottom margin to prevent automatic page break when drawing footer
      const bottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;

      renderFooter(doc, i + 1, totalPages);

      // Restore bottom margin
      doc.page.margins.bottom = bottom;
    }

    doc.end();
  });
}

// ─── Render: First Page Header ────────────────────────────────────────────────
function renderFirstPageHeader(doc: PDFKit.PDFDocument, podcastTitle: string) {
  const headerY = 25;

  // Left side: Brand
  doc.font("NotoSansSC").fontSize(12).fillColor(BRAND_BLUE);
  doc.text(`远路播客 | ${podcastTitle}`, MARGIN_LEFT, headerY, {
    width: CONTENT_WIDTH * 0.6,
    lineBreak: false,
  });

  // Right side: Disclaimer note
  doc.font("NotoSansSC").fontSize(9).fillColor(GRAY_TEXT);
  doc.text("AI翻译 仅供参考", MARGIN_LEFT, headerY + 2, {
    width: CONTENT_WIDTH,
    align: "right",
    lineBreak: false,
  });

  // Header divider line
  doc
    .moveTo(MARGIN_LEFT, headerY + 22)
    .lineTo(PAGE_WIDTH - MARGIN_RIGHT, headerY + 22)
    .strokeColor(DIVIDER_COLOR)
    .lineWidth(0.5)
    .stroke();
}

// ─── Render: Title Block ──────────────────────────────────────────────────────
function renderTitleBlock(
  doc: PDFKit.PDFDocument,
  podcastTitle: string,
  episodeTitle: string,
  coverImageBuffer: Buffer | null,
) {
  const titleStartY = MARGIN_TOP;
  const coverSize = 65;
  const textAreaWidth = coverImageBuffer
    ? CONTENT_WIDTH - coverSize - 16
    : CONTENT_WIDTH;

  // Main title
  doc
    .font("NotoSansSC")
    .fontSize(16)
    .fillColor(BLACK_TEXT)
    .strokeColor(BLACK_TEXT)
    .lineWidth(0.3);
  doc.text(`${podcastTitle}`, MARGIN_LEFT, titleStartY, {
    width: textAreaWidth,
    stroke: true,
    fill: true,
  });

  // Subtitle
  doc.moveDown(0.3);
  doc
    .font("NotoSansSC")
    .fontSize(12)
    .fillColor(BRAND_BLUE)
    .strokeColor(BRAND_BLUE)
    .lineWidth(0.2);
  doc.text(`${episodeTitle}`, MARGIN_LEFT, doc.y, {
    width: textAreaWidth,
    stroke: true,
    fill: true,
  });

  // Cover image (top-right)
  if (coverImageBuffer) {
    try {
      doc.image(
        coverImageBuffer,
        PAGE_WIDTH - MARGIN_RIGHT - coverSize,
        titleStartY,
        {
          width: coverSize,
          height: coverSize,
          fit: [coverSize, coverSize],
        },
      );
    } catch (err) {
      console.warn("[TranscriptPDF] Failed to embed cover image:", err);
    }
  }

  // Divider line below title
  const dividerY = Math.max(doc.y + 12, titleStartY + coverSize + 12);
  doc
    .moveTo(MARGIN_LEFT, dividerY)
    .lineTo(PAGE_WIDTH - MARGIN_RIGHT, dividerY)
    .strokeColor([50, 50, 50])
    .lineWidth(1)
    .stroke();

  doc.lineWidth(1); // Reset to default

  doc.y = dividerY + 8;
}

// ─── Render: Transcript Block ─────────────────────────────────────────────────
function renderTranscriptBlock(
  doc: PDFKit.PDFDocument,
  textEn: string,
  textZh: string,
) {
  const blockStartY = doc.y;
  const neededSpace = 80; // Minimum space needed for a block

  // Check if we need a new page
  if (blockStartY + neededSpace > PAGE_HEIGHT - MARGIN_BOTTOM) {
    doc.addPage();
  }

  // English text (Using Roboto for the clean English style)
  doc.font("Roboto").fontSize(12).fillColor([0, 0, 0]);
  doc.text(textEn.trim(), MARGIN_LEFT, doc.y, {
    width: CONTENT_WIDTH,
    lineGap: 4,
    paragraphGap: 0,
  });

  doc.moveDown(0.3);

  // Chinese translation (Back to CJK font)
  doc.font("NotoSansSC").fontSize(10.5).fillColor([60, 60, 60]);
  doc.text(textZh.trim(), MARGIN_LEFT, doc.y, {
    width: CONTENT_WIDTH,
    lineGap: 3,
    paragraphGap: 0,
  });

  doc.moveDown(1.5);
}

// ─── Render: Footer ──────────────────────────────────────────────────────────
function renderFooter(
  doc: PDFKit.PDFDocument,
  pageNum: number,
  totalPages: number,
) {
  const footerY = PAGE_HEIGHT - 45;

  // Footer divider line
  doc
    .moveTo(MARGIN_LEFT, footerY - 5)
    .lineTo(PAGE_WIDTH - MARGIN_RIGHT, footerY - 5)
    .strokeColor(DIVIDER_COLOR)
    .lineWidth(0.4)
    .stroke();

  // Left side: branding
  doc.font("NotoSansSC").fontSize(8).fillColor(GRAY_TEXT);
  doc.text("远路播客    wxkzd.com", MARGIN_LEFT, footerY, {
    width: CONTENT_WIDTH * 0.5,
    lineBreak: false,
  });

  // Right side: page numbers
  doc.font("NotoSansSC").fontSize(8).fillColor(GRAY_TEXT);
  doc.text(`共 ${totalPages} 页，第 ${pageNum} 页`, MARGIN_LEFT, footerY, {
    width: CONTENT_WIDTH,
    align: "right",
    lineBreak: false,
  });
}
