/**
 * Repository layer — pure database operations only.
 * No business logic, no mapping, no permissions.
 */
import prisma from "@/lib/prisma";

export const proofreadRepository = {
  /** Create a new proofreading request */
  async create(data: {
    episodeid: string;
    subtitleIndex: number;
    originalTextEn: string;
    originalTextZh: string;
    modifiedTextEn: string;
    modifiedTextZh: string;
    submitterId: string;
  }) {
    return prisma.subtitle_proofread.create({ data });
  },

  /** Find all PENDING proofreading requests with episode title and submitter info */
  async findPendingList() {
    return prisma.subtitle_proofread.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        episode: {
          select: {
            title: true,
          },
        },
        submitter: {
          select: {
            user_profile: {
              select: {
                nickname: true,
              },
            },
            email: true,
          },
        },
      },
    });
  },

  /** Count pending proofreading requests */
  async countPending() {
    return prisma.subtitle_proofread.count({
      where: { status: "PENDING" },
    });
  },

  /** Find a specific proofreading request by ID */
  async findById(id: number) {
    return prisma.subtitle_proofread.findUnique({
      where: { id },
      include: {
        episode: {
          select: {
            title: true,
            subtitleEnFileName: true,
            subtitleZhFileName: true,
          },
        },
      },
    });
  },

  /** Update the status of a proofreading request */
  async updateStatus(id: number, status: string, reviewerId: string) {
    return prisma.subtitle_proofread.update({
      where: { id },
      data: {
        status,
        reviewerId,
        reviewedAt: new Date(),
      },
    });
  },
};
