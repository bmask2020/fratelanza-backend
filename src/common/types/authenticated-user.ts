import { Role } from '../auth/roles.enum';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: Role;
}
