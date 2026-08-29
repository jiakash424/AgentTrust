import { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { prisma } from "../db";

// Extend Express Request interface to include user and workspace
declare global {
  namespace Express {
    interface Request {
      user?: any;
      workspaceId?: string;
      clientToken?: string;
    }
  }
}

let JWKS: ReturnType<typeof createRemoteJWKSet>;

function getJWKS() {
  if (!JWKS) {
    let jwksUrl = process.env.SUPABASE_JWKS_URL;

    // Automatically infer from VITE_SUPABASE_URL if not provided
    if (!jwksUrl && process.env.VITE_SUPABASE_URL) {
      jwksUrl = `${process.env.VITE_SUPABASE_URL}/auth/v1/jwk`;
    }

    if (!jwksUrl) {
      throw new Error(
        "SUPABASE_JWKS_URL or VITE_SUPABASE_URL is not defined in environment variables",
      );
    }

    JWKS = createRemoteJWKSet(new URL(jwksUrl));
  }
  return JWKS;
}

export async function verifyToken(token: string) {
  try {
    if (!token || typeof token !== "string" || token.startsWith("usr_tok_")) {
      return null;
    }
    const jwks = getJWKS();
    const issuerUrl = process.env.VITE_SUPABASE_URL
      ? `${process.env.VITE_SUPABASE_URL}/auth/v1`
      : undefined;

    const { payload } = await jwtVerify(token, jwks, {
      audience: "authenticated",
      issuer: issuerUrl,
    });

    return payload;
  } catch (err) {
    return null;
  }
}

export async function requireToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res
        .status(401)
        .json({ error: "Missing or invalid authorization header" });
      return;
    }

    const token = authHeader.split(" ")[1];

    try {
      req.user = await verifyToken(token);
    } catch (verifyError) {
      console.warn("[Auth] Token verification failed:", verifyError);
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const userId = req.user.sub;
    if (!userId) {
      res.status(401).json({ error: "User ID missing from token" });
      return;
    }

    // Ensure the User mirror exists in Prisma
    try {
      await prisma.user.upsert({
        where: { id: userId },
        update: {
          email: req.user.email || "",
          name: req.user.user_metadata?.full_name || req.user.email || "",
        },
        create: {
          id: userId,
          email: req.user.email || "",
          name: req.user.user_metadata?.full_name || req.user.email || "",
        },
      });
    } catch (upsertError) {
      console.warn("Failed to upsert User mirror:", upsertError);
    }

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Internal authentication error" });
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  const requestedWorkspaceId = req.headers["x-workspace-id"] as string;
  const clientToken =
    (req.headers["x-client-token"] as string) ||
    authHeader?.replace("Bearer ", "") ||
    `usr_tok_${Date.now()}`;

  req.clientToken = clientToken;

  // 1. Try Supabase JWT Token Authentication if valid
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    if (!token.startsWith("usr_tok_")) {
      try {
        const payload = await verifyToken(token);
        if (payload && payload.sub) {
          req.user = payload;
          const userId = payload.sub;

          let membership;
          if (requestedWorkspaceId) {
            membership = await prisma.workspaceMember.findUnique({
              where: {
                workspaceId_userId: {
                  workspaceId: requestedWorkspaceId,
                  userId: userId,
                },
              },
            });
          } else {
            membership = await prisma.workspaceMember.findFirst({
              where: { userId: userId },
            });
          }

          if (membership) {
            req.workspaceId = membership.workspaceId;
            return next();
          }
        }
      } catch (tokenErr) {
        console.warn(
          "[requireAuth] Token verification failed/expired, using unique client ID mode.",
        );
      }
    }
  }

  // 2. Unique Client Token Workspace Resolution
  try {
    let workspace = null;

    if (requestedWorkspaceId) {
      workspace = await prisma.workspace.findUnique({
        where: { id: requestedWorkspaceId },
      });
    }

    if (!workspace) {
      workspace = await prisma.workspace.findFirst();
    }

    if (workspace) {
      req.workspaceId = workspace.id;
      req.user = { sub: clientToken, email: `${clientToken}@agenttrust.ai` };
      return next();
    }
  } catch (fallbackErr) {
    console.error("[requireAuth] Workspace resolution error:", fallbackErr);
  }

  res.status(401).json({ error: "Invalid or missing token" });
}
