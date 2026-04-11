/**
 * Subtitle Proofreading DTOs
 * Stable data transfer interfaces for both Web and future Mobile clients
 */

/** Input DTO: submit a proofreading request */
export interface SubmitProofreadDto {
  episodeid: string;
  subtitleIndex: number;
  originalTextEn: string;
  originalTextZh: string;
  modifiedTextEn: string;
  modifiedTextZh: string;
  submitterId: string;
}

/** Input DTO: admin review action */
export interface ReviewProofreadDto {
  id: number;
  action: "approve" | "reject";
  reviewerId: string;
}

/** Output DTO: single proofread list item for admin review center */
export interface ProofreadListItemDto {
  id: number;
  episodeid: string;
  episodeTitle: string;
  subtitleIndex: number;
  originalTextEn: string;
  originalTextZh: string;
  modifiedTextEn: string;
  modifiedTextZh: string;
  status: string;
  submitterName: string;
  submitterId: string;
  createdAt: string;
}

/** Output DTO: pending count for badge */
export interface PendingCountDto {
  count: number;
}
