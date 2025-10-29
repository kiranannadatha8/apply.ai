/**
 * Enum for authentication providers
 *
 */
export type AuthProvider = "EMAIL" | "GOOGLE" | "LINKEDIN";

/**
 * Interface for the User model
 */
export interface User {
  id: string;
  email: string;
  name?: string | null;
  pictureUrl?: string | null;
  provider: AuthProvider;
  createdAt: Date;
  updatedAt: Date;
  profiles: Profile[];
  resumes: Resume[];
  refreshTokens: RefreshToken[];
  handshakeCodes: HandshakeCode[];
  oAuthAccounts: OAuthAccount[];
  sessions: Session[];
  onboardingCompleted: boolean;
}

/**
 * Interface for the RefreshToken model
 */
export interface RefreshToken {
  id: string;
  userId: string;
  hashedToken: string;
  revoked: boolean;
  createdAt: Date;
  expiresAt: Date;
  user: User;
}

/**
 * Interface for the HandshakeCode model
 */
export interface HandshakeCode {
  id: string;
  userId: string;
  code: string;
  createdAt: Date;
  expiresAt: Date;
  usedAt?: Date | null;
  user: User;
}

/**
 * Interface for the Profile model
 * Note: 'any' is used for Json types.
 * You could replace 'any' with a more specific interface
 * (e.g., PersonalDetails, EducationItem[]) if you have defined structures.
 */
export interface Profile {
  id: string;
  userId: string;
  label: string;
  personal?: any | null;
  education?: any | null;
  skills?: any | null;
  experience?: any | null;
  projects?: any | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: User;
  resumes: Resume[];
}

/**
 * Interface for the Resume model
 */
export interface Resume {
  id: string;
  userId: string;
  profileId?: string | null;
  storageUrl: string;
  checksum: string;
  mime: string;
  createdAt: Date;
  user: User;
  profile?: Profile | null;
}

/**
 * Interface for the OAuthAccount model
 */
export interface OAuthAccount {
  id: string;
  userId: string;
  provider: string;
  providerId: string;
  email?: string | null;
  createdAt: Date;
  user: User;
}

/**
 * Interface for the Session model
 */
export interface Session {
  id: string;
  userId: string;
  refreshId?: string | null;
  userAgent?: string | null;
  ip?: string | null;
  createdAt: Date;
  lastSeenAt: Date;
  revoked: boolean;
  user: User;
}

export interface Steps {
  key: string;
  label: string;
}
