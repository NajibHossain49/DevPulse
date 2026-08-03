export type DemoRole = "owner" | "admin" | "member" | "viewer";

export type DemoAccount = {
  id: string;
  role: DemoRole;
  name: string;
  email: string;
  password: string;
  description: string;
};

/** Seeded demo users for recruiter / portfolio exploration. */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: "owner",
    role: "owner",
    name: "Ava Chen",
    email: "ava.chen@devpulse.demo",
    password: "DevPulse123!",
    description: "Full access — billing, members, settings",
  },
  {
    id: "admin",
    role: "admin",
    name: "Marcus Webb",
    email: "marcus.webb@devpulse.demo",
    password: "DevPulse123!",
    description: "Manage projects & members (no billing write)",
  },
  {
    id: "member",
    role: "member",
    name: "Sofia Rahman",
    email: "sofia.rahman@devpulse.demo",
    password: "DevPulse123!",
    description: "Day-to-day contributor access",
  },
  {
    id: "viewer",
    role: "viewer",
    name: "Jordan Lee",
    email: "jordan.lee@devpulse.demo",
    password: "DevPulse123!",
    description: "Read-only analytics & projects",
  },
];

export const DEMO_PASSWORD = "DevPulse123!";
