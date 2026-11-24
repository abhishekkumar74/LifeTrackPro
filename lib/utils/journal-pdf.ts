import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { JournalEntry } from '@/lib/hooks/use-journal';

interface ExportJournalOptions {
  entries: JournalEntry[];
  userName?: string;
}

// Helper to wrap text into lines based on maximum width in points
function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  if (!text) return [];
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push('');
      continue;
    }

    const words = para.split(' ');
    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(candidate, fontSize);

      if (width <= maxWidth) {
        currentLine = candidate;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  return lines;
}

export async function generateAndShareJournalPdf({
  entries,
  userName = 'LifeTrack User',
}: ExportJournalOptions): Promise<string> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN_LEFT = 50;
  const MARGIN_RIGHT = 50;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
  const MARGIN_BOTTOM = 60;

  let pageNumber = 1;
  let currentPage: PDFPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let cursorY = PAGE_HEIGHT - 60;

  const checkPageBreak = (neededHeight: number) => {
    if (cursorY - neededHeight < MARGIN_BOTTOM) {
      // Draw footer on current page
      currentPage.drawText(`Page ${pageNumber}`, {
        x: PAGE_WIDTH / 2 - 20,
        y: 35,
        size: 9,
        font: fontRegular,
        color: rgb(0.5, 0.5, 0.55),
      });

      pageNumber++;
      currentPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      cursorY = PAGE_HEIGHT - 60;
    }
  };

  // Header Cover Section
  currentPage.drawText('LifeTrack Pro - Personal Journal', {
    x: MARGIN_LEFT,
    y: cursorY,
    size: 22,
    font: fontBold,
    color: rgb(0.09, 0.08, 0.16),
  });
  cursorY -= 24;

  currentPage.drawText(`Author: ${userName}  |  Total Entries: ${entries.length}  |  Exported: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, {
    x: MARGIN_LEFT,
    y: cursorY,
    size: 10,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.45),
  });
  cursorY -= 16;

  // Header Accent Line
  currentPage.drawLine({
    start: { x: MARGIN_LEFT, y: cursorY },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: cursorY },
    thickness: 1.5,
    color: rgb(0.36, 0.31, 0.91), // #5B4FE8
  });
  cursorY -= 30;

  // Render Entries
  for (const entry of entries) {
    checkPageBreak(120);

    // Entry Date & Time Tag
    const entryDateStr = entry.entry_date
      ? new Date(entry.entry_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Undated Entry';

    currentPage.drawText(entryDateStr, {
      x: MARGIN_LEFT,
      y: cursorY,
      size: 13,
      font: fontBold,
      color: rgb(0.12, 0.11, 0.22),
    });

    if (entry.time_of_day) {
      const timeTag = entry.time_of_day.toUpperCase();
      const tagWidth = fontRegular.widthOfTextAtSize(timeTag, 8);
      currentPage.drawText(timeTag, {
        x: PAGE_WIDTH - MARGIN_RIGHT - tagWidth,
        y: cursorY,
        size: 8,
        font: fontBold,
        color: rgb(0.5, 0.45, 0.85),
      });
    }
    cursorY -= 18;

    // Entry Title
    if (entry.title && entry.title.trim()) {
      checkPageBreak(25);
      currentPage.drawText(entry.title.trim(), {
        x: MARGIN_LEFT,
        y: cursorY,
        size: 11,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.25),
      });
      cursorY -= 16;
    }

    // Main Content
    if (entry.content && entry.content.trim()) {
      const contentLines = wrapText(entry.content.trim(), fontRegular, 10, CONTENT_WIDTH);
      for (const line of contentLines) {
        checkPageBreak(14);
        currentPage.drawText(line, {
          x: MARGIN_LEFT,
          y: cursorY,
          size: 10,
          font: fontRegular,
          color: rgb(0.18, 0.18, 0.2),
        });
        cursorY -= 14;
      }
      cursorY -= 6;
    }

    // Highlights / Special Moment
    if (entry.achievements && entry.achievements.trim()) {
      checkPageBreak(30);
      currentPage.drawText('Highlight: ', {
        x: MARGIN_LEFT,
        y: cursorY,
        size: 9,
        font: fontBold,
        color: rgb(0.68, 0.45, 0.1),
      });
      const highlightLines = wrapText(entry.achievements.trim(), fontOblique, 9, CONTENT_WIDTH - 55);
      let isFirst = true;
      for (const hLine of highlightLines) {
        if (!isFirst) {
          checkPageBreak(12);
        }
        currentPage.drawText(hLine, {
          x: isFirst ? MARGIN_LEFT + 55 : MARGIN_LEFT,
          y: cursorY,
          size: 9,
          font: fontOblique,
          color: rgb(0.3, 0.3, 0.35),
        });
        cursorY -= 12;
        isFirst = false;
      }
      cursorY -= 4;
    }

    // Gratitude
    if (entry.improvements && entry.improvements.trim()) {
      checkPageBreak(30);
      currentPage.drawText('Gratitude: ', {
        x: MARGIN_LEFT,
        y: cursorY,
        size: 9,
        font: fontBold,
        color: rgb(0.06, 0.55, 0.4),
      });
      const gratitudeLines = wrapText(entry.improvements.trim(), fontRegular, 9, CONTENT_WIDTH - 55);
      let isFirst = true;
      for (const gLine of gratitudeLines) {
        if (!isFirst) {
          checkPageBreak(12);
        }
        currentPage.drawText(gLine, {
          x: isFirst ? MARGIN_LEFT + 55 : MARGIN_LEFT,
          y: cursorY,
          size: 9,
          font: fontRegular,
          color: rgb(0.3, 0.3, 0.35),
        });
        cursorY -= 12;
        isFirst = false;
      }
      cursorY -= 4;
    }

    // Boundaries / Avoid tomorrow
    if (entry.not_to_dos && entry.not_to_dos.trim()) {
      checkPageBreak(30);
      currentPage.drawText('Boundaries: ', {
        x: MARGIN_LEFT,
        y: cursorY,
        size: 9,
        font: fontBold,
        color: rgb(0.7, 0.2, 0.2),
      });
      const boundaryLines = wrapText(entry.not_to_dos.trim(), fontRegular, 9, CONTENT_WIDTH - 65);
      let isFirst = true;
      for (const bLine of boundaryLines) {
        if (!isFirst) {
          checkPageBreak(12);
        }
        currentPage.drawText(bLine, {
          x: isFirst ? MARGIN_LEFT + 65 : MARGIN_LEFT,
          y: cursorY,
          size: 9,
          font: fontRegular,
          color: rgb(0.3, 0.3, 0.35),
        });
        cursorY -= 12;
        isFirst = false;
      }
      cursorY -= 4;
    }

    // Tags
    if (entry.tags && entry.tags.length > 0) {
      checkPageBreak(18);
      const tagsStr = entry.tags.map((t) => `#${t}`).join('  ');
      currentPage.drawText(tagsStr, {
        x: MARGIN_LEFT,
        y: cursorY,
        size: 8,
        font: fontRegular,
        color: rgb(0.45, 0.4, 0.75),
      });
      cursorY -= 14;
    }

    // Divider between entries
    cursorY -= 10;
    checkPageBreak(20);
    currentPage.drawLine({
      start: { x: MARGIN_LEFT, y: cursorY },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: cursorY },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.88),
    });
    cursorY -= 22;
  }

  // Draw final page footer
  currentPage.drawText(`Page ${pageNumber}`, {
    x: PAGE_WIDTH / 2 - 20,
    y: 35,
    size: 9,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.55),
  });

  const fileName = `LifeTrack_Journal_${Date.now()}.pdf`;

  // Web download handling via Blob & Object URL
  if (Platform.OS === 'web') {
    const pdfBytes = await doc.save();
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return url;
    }
    return '';
  }

  // Native mobile handling (iOS & Android) via FileSystem & native share sheet
  const pdfBase64 = await doc.saveAsBase64();
  const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  const fileUri = `${dir}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Share via native share sheet
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Export LifeTrack Journal PDF',
      UTI: 'com.adobe.pdf',
    });
  }

  return fileUri;
}
