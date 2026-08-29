import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, requireToken } from "../middleware/auth";
import crypto from "crypto";

const router = Router();

// GET /api/workspaces — Get current user's workspaces
router.get("/", requireToken, async (req: any, res) => {
  try {
    const userId = req.user.sub;
    let memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
    });

    // If user has no workspaces, create a default workspace and set user as OWNER
    if (memberships.length === 0) {
      const workspace = await prisma.workspace.create({
        data: {
          name: "My Enterprise",
          members: {
            create: {
              userId: userId,
              role: "OWNER",
            },
          },
        },
      });
      memberships = await prisma.workspaceMember.findMany({
        where: { userId },
        include: { workspace: true },
      });
    }

    res.json(memberships);
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    res.status(500).json({ error: "Failed to fetch workspaces" });
  }
});

// GET /api/workspaces/members — Fetch real team members of active workspace
router.get("/members", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const userId = req.user.sub;

    let members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true },
    });

    // Ensure the current user has a member entry if missing
    if (members.length === 0) {
      await prisma.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId, userId } },
        update: { role: "OWNER" },
        create: { workspaceId, userId, role: "OWNER" },
      });

      members = await prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: { user: true },
      });
    }

    // Map output for frontend UI
    const formatted = members.map((m) => {
      const name = m.user.name || m.user.email.split("@")[0] || "Team Member";
      const words = name.trim().split(" ");
      const initials =
        words.length >= 2
          ? `${words[0][0]}${words[1][0]}`.toUpperCase()
          : name.slice(0, 2).toUpperCase();

      return {
        id: m.id,
        userId: m.userId,
        name,
        initials,
        email: m.user.email,
        role:
          m.role === "OWNER"
            ? "Owner"
            : m.role === "MEMBER"
              ? "Member"
              : "Admin",
        rawRole: m.role,
      };
    });

    res.json(formatted);
  } catch (error: any) {
    console.error("Failed to fetch workspace members:", error);
    res.status(500).json({ error: "Failed to fetch workspace members" });
  }
});

// POST /api/workspaces/members/invite — Add/invite a real team member
router.post("/members/invite", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const { email, role, name } = req.body;

    if (!email || !email.includes("@")) {
      return res
        .status(400)
        .json({ error: "A valid email address is required" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const roleEnum =
      role?.toUpperCase() === "OWNER"
        ? "OWNER"
        : role?.toUpperCase() === "ADMIN"
          ? "MEMBER"
          : "MEMBER";

    // 1. Find or create user in PostgreSQL
    let targetUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!targetUser) {
      const placeholderId = `usr_${crypto.randomUUID()}`;
      targetUser = await prisma.user.create({
        data: {
          id: placeholderId,
          email: cleanEmail,
          name: name || cleanEmail.split("@")[0],
        },
      });
    }

    // 2. Upsert WorkspaceMember link
    const member = await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: targetUser.id,
        },
      },
      update: { role: roleEnum },
      create: {
        workspaceId,
        userId: targetUser.id,
        role: roleEnum,
      },
      include: { user: true },
    });

    const displayName = targetUser.name || cleanEmail.split("@")[0];
    const words = displayName.trim().split(" ");
    const initials =
      words.length >= 2
        ? `${words[0][0]}${words[1][0]}`.toUpperCase()
        : displayName.slice(0, 2).toUpperCase();

    res.json({
      member: {
        id: member.id,
        userId: member.userId,
        name: displayName,
        initials,
        email: targetUser.email,
        role: member.role === "OWNER" ? "Owner" : "Member",
        rawRole: member.role,
      },
    });
  } catch (error: any) {
    console.error("Failed to invite team member:", error);
    res
      .status(500)
      .json({ error: error.message || "Failed to add team member" });
  }
});

// DELETE /api/workspaces/members/:id — Remove a team member
router.delete("/members/:id", requireAuth, async (req: any, res) => {
  try {
    const workspaceId = req.workspaceId;
    const { id } = req.params;

    const existing = await prisma.workspaceMember.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ error: "Team member not found in this workspace" });
    }

    // Prevent removing the sole owner
    if (existing.role === "OWNER") {
      const ownerCount = await prisma.workspaceMember.count({
        where: { workspaceId, role: "OWNER" },
      });
      if (ownerCount <= 1) {
        return res
          .status(400)
          .json({ error: "Cannot remove the only workspace owner" });
      }
    }

    await prisma.workspaceMember.delete({
      where: { id: existing.id },
    });

    res.json({ success: true, removedId: id });
  } catch (error: any) {
    console.error("Failed to remove team member:", error);
    res.status(500).json({ error: "Failed to remove team member" });
  }
});

export default router;
