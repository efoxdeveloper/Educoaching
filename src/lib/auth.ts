import NextAuth, { CredentialsSignin } from "next-auth";

import Credentials from "next-auth/providers/credentials";

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";



// Thrown when the user's credentials are correct but their institute has

// been suspended from /admin. The `code` becomes `res.error` on the client

// (see LoginForm.tsx), so we can show a distinct message instead of a

// generic "invalid credentials" one.

class InstituteSuspendedError extends CredentialsSignin {

  code = "InstituteSuspended";

}

class InstitutePendingApprovalError extends CredentialsSignin {

  code = "InstitutePendingApproval";

}

class BranchPendingApprovalError extends CredentialsSignin {

  code = "BranchPendingApproval";

}



// Thrown when someone logs in via the wrong portal link (e.g. a Platform

// Admin using the "Institute" link, or an institute user using "Admin").

// The credentials themselves are valid, but this account doesn't belong

// on the portal they landed on.

class WrongPortalError extends CredentialsSignin {

  constructor(code: string) {

    super();

    this.code = code;

  }

}


// Thrown when the institute's Owner hasn't clicked the verification link
// yet. Blocks login entirely (not just a banner) — see /verify-email.
class EmailNotVerifiedError extends CredentialsSignin {
  code = "EmailNotVerified";
}


export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },

  providers: [

    Credentials({

      name: "credentials",

      credentials: {

        email: { label: "Email", type: "email" },

        password: { label: "Password", type: "password" },

        portal: { label: "Portal", type: "text" },
      },
      authorize: async (credentials) => {
        const input = (credentials?.email as string | undefined)?.trim();
        const password = credentials?.password as string | undefined;
        const portal = credentials?.portal as string | undefined;

        if (!input || !password) return null;

        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: input, mode: "insensitive" } },
            ],
          },
          include: { branch: true },
        });

        if (!user) {
          // If input is a mobile number, check if a student record exists with this mobile
          const student = await prisma.student.findFirst({
            where: { mobile: input },
            select: { email: true },
          });
          if (student?.email) {
            user = await prisma.user.findFirst({
              where: { email: student.email },
              include: { branch: true },
            });
          }
        }

        if (!user) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;



        // Enforce the portal the user actually clicked into. Checked here,

        // server-side, rather than only in the UI, so it can't be bypassed

        // by changing the query string.

        const isPlatformAdmin = user.role === "PLATFORM_ADMIN";

        if (portal === "admin" && !isPlatformAdmin) {

          throw new WrongPortalError("UseInstitutePortal");

        }

        if (portal === "institute" && isPlatformAdmin) {

          throw new WrongPortalError("UseAdminPortal");

        }



        if (user.instituteId) {

          const institute = await prisma.institute.findUnique({

            where: { id: user.instituteId },

            select: { status: true, emailVerified: true },

          });

          if (institute?.status === "SUSPENDED") {

            throw new InstituteSuspendedError();

          }

          if (institute?.status === "PENDING_APPROVAL") {

            throw new InstitutePendingApprovalError();

          }

           if (institute?.emailVerified === false) {

            throw new EmailNotVerifiedError();

          }

        }

        if (user.branch && user.branch.status === "PENDING_APPROVAL") {
          throw new BranchPendingApprovalError();
        }

        const isMain = user.branch ? Boolean(user.branch.isMainBranch) : true;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          instituteId: user.instituteId,
          branchId: user.branchId,
          isMainBranch: isMain,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.instituteId = (user as { instituteId?: string | null }).instituteId ?? null;
        token.id = (user as { id?: string }).id;
        token.branchId = (user as { branchId?: string | null }).branchId ?? null;
        token.isMainBranch = (user as { isMainBranch?: boolean }).isMainBranch ?? true;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        (session.user as any).role = token.role as string | undefined;
        (session.user as any).instituteId =
          (token.instituteId as string | null | undefined) ?? null;
        (session.user as any).id = token.id as string | undefined;
        (session.user as any).branchId = token.branchId as string | null | undefined;
        (session.user as any).isMainBranch = token.isMainBranch as boolean | undefined;
      }
      return session;
    },

  },

});

