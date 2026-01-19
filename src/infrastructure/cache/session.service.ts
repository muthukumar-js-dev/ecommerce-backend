import { RedisClient } from './redis-client';

export interface Session {
    userId: string;
    email: string;
    role: string;
    createdAt: Date;
    lastActivity: Date;
    ipAddress?: string;
    userAgent?: string;
}

export class SessionService {
    private readonly SESSION_PREFIX = 'session:';
    private readonly USER_SESSIONS_PREFIX = 'user:sessions:';
    private readonly SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

    constructor(private redisClient: RedisClient) { }

    /**
     * Create a new session
     */
    async createSession(sessionId: string, session: Session): Promise<void> {
        try {
            const key = this.getSessionKey(sessionId);
            const sessionData = {
                ...session,
                createdAt: session.createdAt ?? new Date(),
                lastActivity: new Date(),
            };

            await this.redisClient.set(key, sessionData, this.SESSION_TTL);

            // Track user sessions for multi-device support
            await this.addUserSession(session.userId, sessionId);

            console.log(`Session created: ${sessionId} for user: ${session.userId}`);
        } catch (error: unknown) {
            console.error(`Failed to create session ${sessionId}:`, error);
            throw error;
        }
    }

    /**
     * Get session by ID
     */
    async getSession(sessionId: string): Promise<Session | null> {
        try {
            const key = this.getSessionKey(sessionId);
            const session = await this.redisClient.get<Session>(key);

            if (session) {
                // Update last activity timestamp
                await this.updateLastActivity(sessionId);
            }

            return session;
        } catch (error: unknown) {
            console.error(`Failed to get session ${sessionId}:`, error);
            return null;
        }
    }

    /**
     * Update session data
     */
    async updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
        try {
            const key = this.getSessionKey(sessionId);
            const session = await this.getSession(sessionId);

            if (!session) {
                throw new Error(`Session ${sessionId} not found`);
            }

            const updated = {
                ...session,
                ...updates,
                lastActivity: new Date(),
            };

            await this.redisClient.set(key, updated, this.SESSION_TTL);
            console.log(`Session updated: ${sessionId}`);
        } catch (error: unknown) {
            console.error(`Failed to update session ${sessionId}:`, error);
            throw error;
        }
    }

    /**
     * Delete session
     */
    async deleteSession(sessionId: string): Promise<void> {
        try {
            const session = await this.getSession(sessionId);
            const key = this.getSessionKey(sessionId);

            await this.redisClient.del(key);

            if (session) {
                await this.removeUserSession(session.userId, sessionId);
            }

            console.log(`Session deleted: ${sessionId}`);
        } catch (error: unknown) {
            console.error(`Failed to delete session ${sessionId}:`, error);
            throw error;
        }
    }

    /**
     * Refresh session TTL
     */
    async refreshSession(sessionId: string): Promise<void> {
        try {
            const key = this.getSessionKey(sessionId);
            const exists = await this.redisClient.exists(key);

            if (!exists) {
                throw new Error(`Session ${sessionId} not found`);
            }

            await this.redisClient.expire(key, this.SESSION_TTL);
            await this.updateLastActivity(sessionId);

            console.log(`Session refreshed: ${sessionId}`);
        } catch (error: unknown) {
            console.error(`Failed to refresh session ${sessionId}:`, error);
            throw error;
        }
    }

    /**
     * Get all sessions for a user
     */
    async getUserSessions(userId: string): Promise<string[]> {
        try {
            const key = this.getUserSessionsKey(userId);
            const sessions = await this.redisClient.hgetall(key);
            return Object.keys(sessions);
        } catch (error: unknown) {
            console.error(`Failed to get user sessions for ${userId}:`, error);
            return [];
        }
    }

    /**
     * Delete all sessions for a user (logout from all devices)
     */
    async deleteUserSessions(userId: string): Promise<void> {
        try {
            const sessionIds = await this.getUserSessions(userId);

            await Promise.all(
                sessionIds.map((sessionId) => this.deleteSession(sessionId))
            );

            const key = this.getUserSessionsKey(userId);
            await this.redisClient.del(key);

            console.log(`All sessions deleted for user: ${userId}`);
        } catch (error: unknown) {
            console.error(`Failed to delete user sessions for ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Check if session is valid
     */
    async isSessionValid(sessionId: string): Promise<boolean> {
        try {
            const key = this.getSessionKey(sessionId);
            return await this.redisClient.exists(key);
        } catch (error: unknown) {
            console.error(`Failed to check session validity ${sessionId}:`, error);
            return false;
        }
    }

    /**
     * Get session TTL
     */
    async getSessionTTL(sessionId: string): Promise<number> {
        try {
            const key = this.getSessionKey(sessionId);
            return await this.redisClient.ttl(key);
        } catch (error: unknown) {
            console.error(`Failed to get session TTL ${sessionId}:`, error);
            return -1;
        }
    }

    // Private helper methods

    private getSessionKey(sessionId: string): string {
        return `${this.SESSION_PREFIX}${sessionId}`;
    }

    private getUserSessionsKey(userId: string): string {
        return `${this.USER_SESSIONS_PREFIX}${userId}`;
    }

    private async addUserSession(userId: string, sessionId: string): Promise<void> {
        const key = this.getUserSessionsKey(userId);
        const timestamp = new Date().toISOString();
        await this.redisClient.hset(key, sessionId, timestamp);
    }

    private async removeUserSession(userId: string, sessionId: string): Promise<void> {
        const key = this.getUserSessionsKey(userId);
        await this.redisClient.hdel(key, sessionId);
    }

    private async updateLastActivity(sessionId: string): Promise<void> {
        try {
            const session = await this.redisClient.get<Session>(this.getSessionKey(sessionId));
            if (session) {
                session.lastActivity = new Date();
                await this.redisClient.set(this.getSessionKey(sessionId), session, this.SESSION_TTL);
            }
        } catch (error: unknown) {
            // Silent fail - not critical
            console.error(`Failed to update last activity for ${sessionId}:`, error);
        }
    }
}

// Singleton instance
let sessionServiceInstance: SessionService | null = null;

export function getSessionService(redisClient: RedisClient): SessionService {
    if (!sessionServiceInstance) {
        sessionServiceInstance = new SessionService(redisClient);
    }
    return sessionServiceInstance;
}
