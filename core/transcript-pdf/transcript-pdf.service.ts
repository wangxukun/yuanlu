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
  format?: "A4" | "A5";
}

export interface PdfLayoutConfig {
  format: "A4" | "A5";
  pageWidth: number;
  pageHeight: number;
  marginLeft: number;
  marginRight: number;
  marginTop: number;
  marginBottom: number;
  contentWidth: number;
  headerY: number;
  footerYOffset: number;
  coverSize: number;
  fonts: {
    headerBrand: number;
    headerNote: number;
    titleMain: number;
    titleSub: number;
    transcriptEn: number;
    transcriptZh: number;
    footer: number;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────
const BRAND_BLUE: [number, number, number] = [0, 51, 102];
const GRAY_TEXT: [number, number, number] = [102, 102, 102];
const BLACK_TEXT: [number, number, number] = [33, 33, 33];
const DIVIDER_COLOR: [number, number, number] = [200, 200, 200];

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

// ─── Layout Configs ───────────────────────────────────────────────────────────
function getLayoutConfig(format: "A4" | "A5"): PdfLayoutConfig {
  if (format === "A5") {
    const pageWidth = 419.53;
    const pageHeight = 595.28;
    const marginLeft = 40;
    const marginRight = 40;
    return {
      format: "A5",
      pageWidth,
      pageHeight,
      marginLeft,
      marginRight,
      marginTop: 50,
      marginBottom: 50,
      contentWidth: pageWidth - marginLeft - marginRight,
      headerY: 18,
      footerYOffset: 30,
      coverSize: 55,
      fonts: {
        headerBrand: 12,
        headerNote: 9,
        titleMain: 17,
        titleSub: 13,
        transcriptEn: 13,
        transcriptZh: 12,
        footer: 8.5,
      },
    };
  }

  // Default A4
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginLeft = 56;
  const marginRight = 56;
  return {
    format: "A4",
    pageWidth,
    pageHeight,
    marginLeft,
    marginRight,
    marginTop: 70,
    marginBottom: 70,
    contentWidth: pageWidth - marginLeft - marginRight,
    headerY: 25,
    footerYOffset: 45,
    coverSize: 65,
    fonts: {
      headerBrand: 12.5,
      headerNote: 11,
      titleMain: 20,
      titleSub: 16,
      transcriptEn: 14.5,
      transcriptZh: 12.5,
      footer: 9.5,
    },
  };
}

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
  const {
    episodeTitle,
    podcastTitle,
    subtitles,
    coverUrl,
    format = "A4",
  } = input;
  const layout = getLayoutConfig(format);

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
      size: layout.format,
      margins: {
        top: layout.marginTop,
        bottom: layout.marginBottom,
        left: layout.marginLeft,
        right: layout.marginRight,
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
    renderFirstPageHeader(doc, podcastTitle, layout);

    // ──────────────────────────────────────────────────────────────────────────
    // Render title block with optional cover image
    // ──────────────────────────────────────────────────────────────────────────
    renderTitleBlock(doc, podcastTitle, episodeTitle, coverImageBuffer, layout);

    // ──────────────────────────────────────────────────────────────────────────
    // Disclaimer note
    // ──────────────────────────────────────────────────────────────────────────
    doc.moveDown(0.8);

    // ──────────────────────────────────────────────────────────────────────────
    // Render transcript blocks
    // ──────────────────────────────────────────────────────────────────────────
    for (const sub of subtitles) {
      renderTranscriptBlock(doc, sub.textEn, sub.textZh, layout);
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

      renderFooter(doc, i + 1, totalPages, layout);

      // Restore bottom margin
      doc.page.margins.bottom = bottom;
    }

    doc.end();
  });
}

// ─── Render: First Page Header ────────────────────────────────────────────────
function renderFirstPageHeader(
  doc: PDFKit.PDFDocument,
  podcastTitle: string,
  layout: PdfLayoutConfig,
) {
  const headerY = layout.headerY;

  // Left side: Brand
  doc
    .font("NotoSansSC")
    .fontSize(layout.fonts.headerBrand)
    .fillColor(BRAND_BLUE);
  doc.text(`远路播客 | ${podcastTitle}`, layout.marginLeft, headerY, {
    width: layout.contentWidth * 0.6,
    lineBreak: false,
  });

  // Right side: Disclaimer note
  doc.font("NotoSansSC").fontSize(layout.fonts.headerNote).fillColor(GRAY_TEXT);
  doc.text("AI翻译 仅供参考", layout.marginLeft, headerY + 2, {
    width: layout.contentWidth,
    align: "right",
    lineBreak: false,
  });

  // Header divider line
  doc
    .moveTo(layout.marginLeft, headerY + 22)
    .lineTo(layout.pageWidth - layout.marginRight, headerY + 22)
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
  layout: PdfLayoutConfig,
) {
  const titleStartY = layout.marginTop;
  const targetCoverHeight = layout.coverSize;
  const expectedCoverWidth = targetCoverHeight * (16 / 9);

  const textAreaWidth = coverImageBuffer
    ? layout.contentWidth - expectedCoverWidth - 16
    : layout.contentWidth;

  // Main title
  doc
    .font("Roboto")
    .fontSize(layout.fonts.titleMain)
    .fillColor(BLACK_TEXT)
    .strokeColor(BLACK_TEXT);
  doc.text(`${podcastTitle}`, layout.marginLeft, titleStartY, {
    width: textAreaWidth,
    stroke: true,
    fill: true,
  });

  // Calculate Subtitle Y position
  doc
    .font("Roboto")
    .fontSize(layout.fonts.titleSub)
    .fillColor(BRAND_BLUE)
    .strokeColor(BRAND_BLUE);

  const subtitleHeight = doc.heightOfString(`${episodeTitle}`, {
    width: textAreaWidth,
  });

  // Default next line Y (minimum spacing)
  const minSubtitleY = doc.y + doc.currentLineHeight() * 0.3;

  // Target Y to align bottom with targetCoverHeight
  const alignedSubtitleY = titleStartY + targetCoverHeight - subtitleHeight;

  // Actual Y is the maximum of the two to prevent overlap
  const subtitleY = Math.max(minSubtitleY, alignedSubtitleY);

  doc.text(`${episodeTitle}`, layout.marginLeft, subtitleY, {
    width: textAreaWidth,
    stroke: true,
    fill: true,
  });

  // Now calculate the final cover height based on text block height.
  const finalCoverHeight = doc.y - titleStartY;
  const finalCoverWidth = finalCoverHeight * (16 / 9); // Preserve 16:9 ratio

  // Cover image (top-right)
  if (coverImageBuffer) {
    try {
      doc.image(
        coverImageBuffer,
        layout.pageWidth - layout.marginRight - finalCoverWidth,
        titleStartY,
        {
          width: finalCoverWidth,
          height: finalCoverHeight,
          // Explicitly forcing width and height stretches the image to these dimensions,
          // guaranteeing the 16:9 shape and exact top/bottom alignment.
        },
      );
    } catch (err) {
      console.warn("[TranscriptPDF] Failed to embed cover image:", err);
    }
  }

  // Divider line below title
  const dividerY = Math.max(doc.y + 12, titleStartY + finalCoverHeight + 12);
  doc
    .moveTo(layout.marginLeft, dividerY)
    .lineTo(layout.pageWidth - layout.marginRight, dividerY)
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
  layout: PdfLayoutConfig,
) {
  const blockStartY = doc.y;
  const neededSpace = 80; // Minimum space needed for a block (approx)

  // Check if we need a new page
  if (blockStartY + neededSpace > layout.pageHeight - layout.marginBottom) {
    doc.addPage();
  }

  // English text (Using Roboto for the clean English style)
  doc.font("Roboto").fontSize(layout.fonts.transcriptEn).fillColor([0, 0, 0]);
  doc.text(textEn.trim(), layout.marginLeft, doc.y, {
    width: layout.contentWidth,
    lineGap: 4,
    paragraphGap: 0,
  });

  doc.moveDown(0.3);

  // Chinese translation (Back to CJK font)
  doc
    .font("NotoSansSC")
    .fontSize(layout.fonts.transcriptZh)
    .fillColor([0, 0, 0]);
  doc.text(textZh.trim(), layout.marginLeft, doc.y, {
    width: layout.contentWidth,
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
  layout: PdfLayoutConfig,
) {
  const footerY = layout.pageHeight - layout.footerYOffset;

  // Footer divider line
  doc
    .moveTo(layout.marginLeft, footerY - 5)
    .lineTo(layout.pageWidth - layout.marginRight, footerY - 5)
    .strokeColor(DIVIDER_COLOR)
    .lineWidth(0.4)
    .stroke();

  // Left side: branding
  doc.font("NotoSansSC").fontSize(layout.fonts.footer).fillColor(GRAY_TEXT);
  doc.text("远路播客    wxkzd.com", layout.marginLeft, footerY, {
    width: layout.contentWidth * 0.5,
    lineBreak: false,
  });

  // Right side: page numbers
  doc.font("NotoSansSC").fontSize(layout.fonts.footer).fillColor(GRAY_TEXT);
  doc.text(
    `共 ${totalPages} 页，第 ${pageNum} 页`,
    layout.marginLeft,
    footerY,
    {
      width: layout.contentWidth,
      align: "right",
      lineBreak: false,
    },
  );
}
