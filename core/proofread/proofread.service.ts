/**
 * Proofread Service — business logic layer
 *
 * Handles:
 * - User proofreading submission
 * - Admin direct update (modify SRT files immediately)
 * - Admin review flow (approve / reject)
 * - Pending count for admin sidebar badge
 */
import { proofreadRepository } from "./proofread.repository";
import {
  SubmitProofreadDto,
  ProofreadListItemDto,
  PendingCountDto,
} from "./proofread.dto";
import { generateSignatureUrl, uploadFile } from "@/lib/oss";

// ============================================================
//  SRT helpers (private)
// ============================================================

interface SrtBlock {
  id: number;
  startTime: string;
  endTime: string;
  text: string;
}

/** Parse an SRT string into structured blocks */
function parseSrt(srtText: string): SrtBlock[] {
  const subtitleBlocks = srtText.trim().split(/\r?\n\r?\n/);
  return subtitleBlocks
    .map((block) => {
      const lines = block.split(/\r?\n/);
      if (lines.length < 3) return null;
      const id = parseInt(lines[0]);
      const timeMatch = lines[1].match(
        /(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/,
      );
      if (!timeMatch) return null;
      const text = lines.slice(2).join("\n");
      return { id, startTime: timeMatch[1], endTime: timeMatch[2], text };
    })
    .filter(Boolean) as SrtBlock[];
}

/** Serialize SrtBlock[] back into an SRT string */
function serializeSrt(blocks: SrtBlock[]): string {
  return (
    blocks
      .map((b) => `${b.id}\n${b.startTime} --> ${b.endTime}\n${b.text}`)
      .join("\n\n") + "\n"
  );
}

/** Download an SRT file from OSS by its fileName, modify the target block, and re-upload */
async function updateSrtFile(
  fileName: string,
  subtitleIndex: number,
  newText: string,
): Promise<void> {
  // 1. Download current SRT content via signed URL
  const signedUrl = await generateSignatureUrl(fileName, 60 * 10);
  const res = await fetch(signedUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to download SRT file: ${fileName}`);
  }
  const srtContent = await res.text();

  // 2. Parse and modify
  const blocks = parseSrt(srtContent);
  const targetBlock = blocks.find((b) => b.id === subtitleIndex);
  if (!targetBlock) {
    throw new Error(
      `Subtitle block with id=${subtitleIndex} not found in ${fileName}`,
    );
  }
  targetBlock.text = newText;

  // 3. Serialize and re-upload (overwrite)
  const newSrtContent = serializeSrt(blocks);
  const buffer = Buffer.from(newSrtContent, "utf-8");
  await uploadFile(buffer, fileName);
}

// ============================================================
//  Public Service API
// ============================================================

export const proofreadService = {
  /**
   * Submit a proofreading request (regular user flow)
   */
  async submitProofread(
    dto: SubmitProofreadDto,
  ): Promise<{ success: boolean }> {
    await proofreadRepository.create({
      episodeid: dto.episodeid,
      subtitleIndex: dto.subtitleIndex,
      originalTextEn: dto.originalTextEn,
      originalTextZh: dto.originalTextZh,
      modifiedTextEn: dto.modifiedTextEn,
      modifiedTextZh: dto.modifiedTextZh,
      submitterId: dto.submitterId,
    });
    return { success: true };
  },

  /**
   * Admin direct update — modify SRT files immediately, no review needed
   */
  async directUpdate(dto: SubmitProofreadDto): Promise<{ success: boolean }> {
    // 1. Fetch the episode to get SRT file names
    const { episodeid, subtitleIndex, modifiedTextEn, modifiedTextZh } = dto;

    // We need the episode's SRT file names from DB
    const prisma = (await import("@/lib/prisma")).default;
    const episode = await prisma.episode.findUnique({
      where: { episodeid },
      select: {
        subtitleEnFileName: true,
        subtitleZhFileName: true,
      },
    });

    if (!episode) {
      throw new Error("EPISODE_NOT_FOUND");
    }

    // 2. Update English SRT if the file exists
    if (episode.subtitleEnFileName) {
      await updateSrtFile(
        episode.subtitleEnFileName,
        subtitleIndex,
        modifiedTextEn,
      );
    }

    // 3. Update Chinese SRT if the file exists
    if (episode.subtitleZhFileName) {
      await updateSrtFile(
        episode.subtitleZhFileName,
        subtitleIndex,
        modifiedTextZh,
      );
    }

    // 4. Also store a record for audit trail (marked as APPROVED by admin)
    await proofreadRepository.create({
      episodeid: dto.episodeid,
      subtitleIndex: dto.subtitleIndex,
      originalTextEn: dto.originalTextEn,
      originalTextZh: dto.originalTextZh,
      modifiedTextEn: dto.modifiedTextEn,
      modifiedTextZh: dto.modifiedTextZh,
      submitterId: dto.submitterId,
    });

    // Mark it as approved immediately
    const prismaClient = (await import("@/lib/prisma")).default;
    const latest = await prismaClient.subtitle_proofread.findFirst({
      where: { submitterId: dto.submitterId, episodeid },
      orderBy: { createdAt: "desc" },
    });
    if (latest) {
      await proofreadRepository.updateStatus(
        latest.id,
        "APPROVED",
        dto.submitterId,
      );
    }

    return { success: true };
  },

  /**
   * Get all pending proofreading requests for admin review center
   */
  async getPendingList(): Promise<ProofreadListItemDto[]> {
    const items = await proofreadRepository.findPendingList();

    return items.map((item) => ({
      id: item.id,
      episodeid: item.episodeid,
      episodeTitle: item.episode?.title || "Unknown Episode",
      subtitleIndex: item.subtitleIndex,
      originalTextEn: item.originalTextEn,
      originalTextZh: item.originalTextZh,
      modifiedTextEn: item.modifiedTextEn,
      modifiedTextZh: item.modifiedTextZh,
      status: item.status,
      submitterName:
        item.submitter?.user_profile?.nickname ||
        item.submitter?.email ||
        "Anonymous",
      submitterId: item.submitterId,
      createdAt: item.createdAt.toISOString(),
    }));
  },

  /**
   * Get the count of pending proofreading requests (for badge)
   */
  async getPendingCount(): Promise<PendingCountDto> {
    const count = await proofreadRepository.countPending();
    return { count };
  },

  /**
   * Admin approves a proofreading request — update SRT files and mark as approved
   */
  async approveProofread(
    id: number,
    reviewerId: string,
  ): Promise<{ success: boolean }> {
    const record = await proofreadRepository.findById(id);
    if (!record) {
      throw new Error("PROOFREAD_NOT_FOUND");
    }
    if (record.status !== "PENDING") {
      throw new Error("PROOFREAD_ALREADY_REVIEWED");
    }

    // Update SRT files
    if (record.episode?.subtitleEnFileName) {
      await updateSrtFile(
        record.episode.subtitleEnFileName,
        record.subtitleIndex,
        record.modifiedTextEn,
      );
    }
    if (record.episode?.subtitleZhFileName) {
      await updateSrtFile(
        record.episode.subtitleZhFileName,
        record.subtitleIndex,
        record.modifiedTextZh,
      );
    }

    // Mark as approved
    await proofreadRepository.updateStatus(id, "APPROVED", reviewerId);

    return { success: true };
  },

  /**
   * Admin rejects a proofreading request
   */
  async rejectProofread(
    id: number,
    reviewerId: string,
  ): Promise<{ success: boolean }> {
    const record = await proofreadRepository.findById(id);
    if (!record) {
      throw new Error("PROOFREAD_NOT_FOUND");
    }
    if (record.status !== "PENDING") {
      throw new Error("PROOFREAD_ALREADY_REVIEWED");
    }

    await proofreadRepository.updateStatus(id, "REJECTED", reviewerId);
    return { success: true };
  },
};
