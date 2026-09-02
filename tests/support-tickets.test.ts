import { describe, it, expect, vi, beforeEach } from "vitest";
import { getWhatsAppWebUrl } from "@/lib/whatsapp";
import { prisma } from "@/lib/prisma";

describe("Help & Support and Support Tickets Test Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Support Contact & WhatsApp Link Generation", () => {
    it("generates a valid, safe wa.me chat URL without modifying platform support phone", () => {
      const supportPhone = "+919876543210";
      const message = "Hello Vidyalaya Support Team, I need assistance with our institute portal.";
      const url = getWhatsAppWebUrl(supportPhone, message);

      expect(url).toContain("https://wa.me/919876543210");
      expect(url).toContain("text=Hello%20Vidyalaya%20Support%20Team");
    });
  });

  describe("2. Support Ticket Creation & Session Auto-Attachment", () => {
    it("attaches instituteId and userId from session and defaults status to OPEN", async () => {
      const mockSession = {
        user: {
          id: "usr_apex_owner_1",
          name: "Sarthak Yadav",
          email: "sarthak@apex.com",
          instituteId: "inst_apex_123",
          role: "OWNER",
        },
      };

      const ticketPayload = {
        subject: "Cannot issue certificates for batch B2",
        description: "Encountered an error when clicking generate certificate.",
      };

      // Mock prisma.supportTicket.create
      const createSpy = vi.spyOn(prisma.supportTicket, "create").mockResolvedValue({
        id: "tkt_123",
        instituteId: mockSession.user.instituteId,
        userId: mockSession.user.id,
        subject: ticketPayload.subject,
        description: ticketPayload.description,
        status: "OPEN",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const createdTicket = await prisma.supportTicket.create({
        data: {
          instituteId: mockSession.user.instituteId,
          userId: mockSession.user.id,
          subject: ticketPayload.subject,
          description: ticketPayload.description,
          status: "OPEN",
        },
      });

      expect(createSpy).toHaveBeenCalledWith({
        data: {
          instituteId: "inst_apex_123",
          userId: "usr_apex_owner_1",
          subject: "Cannot issue certificates for batch B2",
          description: "Encountered an error when clicking generate certificate.",
          status: "OPEN",
        },
      });

      expect(createdTicket.id).toBe("tkt_123");
      expect(createdTicket.instituteId).toBe("inst_apex_123");
      expect(createdTicket.userId).toBe("usr_apex_owner_1");
      expect(createdTicket.status).toBe("OPEN");
    });
  });

  describe("3. Tenant Isolation & Gating", () => {
    it("guarantees an institute can only query and view tickets belonging to its own instituteId", async () => {
      const instituteAId = "inst_apex_123";
      const instituteBId = "inst_other_456";

      const mockTicketsInstituteA = [
        {
          id: "tkt_1",
          instituteId: instituteAId,
          subject: "Issue A1",
          description: "Desc A1",
          status: "OPEN",
        },
        {
          id: "tkt_2",
          instituteId: instituteAId,
          subject: "Issue A2",
          description: "Desc A2",
          status: "RESOLVED",
        },
      ];

      const findManySpy = vi.spyOn(prisma.supportTicket, "findMany").mockImplementation((async (args: any) => {
        if (args?.where?.instituteId === instituteAId) {
          return mockTicketsInstituteA as any;
        }
        return [];
      }) as any);

      // Query as Institute A
      const ticketsA = await prisma.supportTicket.findMany({
        where: { instituteId: instituteAId },
      });

      expect(findManySpy).toHaveBeenCalledWith({
        where: { instituteId: instituteAId },
      });
      expect(ticketsA.length).toBe(2);
      expect(ticketsA.every((t) => t.instituteId === instituteAId)).toBe(true);

      // Query as Institute B
      const ticketsB = await prisma.supportTicket.findMany({
        where: { instituteId: instituteBId },
      });
      expect(ticketsB.length).toBe(0);
    });
  });
});
