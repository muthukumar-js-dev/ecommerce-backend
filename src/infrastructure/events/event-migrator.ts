import { DomainEvent } from '@shared/domain/domain-event';

export interface EventMigration {
    fromVersion: number;
    toVersion: number;
    migrate(event: any): any;
}

export class EventMigrator {
    private migrations = new Map<string, EventMigration[]>();

    registerMigration(eventName: string, migration: EventMigration): void {
        if (!this.migrations.has(eventName)) {
            this.migrations.set(eventName, []);
        }
        this.migrations.get(eventName)!.push(migration);
    }

    migrate<T extends DomainEvent<any>>(event: T, targetVersion: number): T {
        const migrations = this.migrations.get(event.eventName) || [];

        let currentEvent = event;
        let currentVersion = event.version;

        while (currentVersion < targetVersion) {
            const migration = migrations.find(
                (m) => m.fromVersion === currentVersion && m.toVersion === currentVersion + 1
            );

            if (!migration) {
                throw new Error(
                    `No migration found from version ${currentVersion} to ${currentVersion + 1} for event ${event.eventName}`
                );
            }

            currentEvent = migration.migrate(currentEvent);
            currentVersion++;
        }

        return currentEvent;
    }
}
