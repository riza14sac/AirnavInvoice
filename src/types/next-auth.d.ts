import { Role } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
    interface User {
        id: string;
        email: string;
        name: string;
        role: Role;
    }

    interface Session {
        user: User & {
            id: string;
            role: Role;
        };
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: Role;
    }
}
