CREATE TABLE `trail_spawn_claims` (
	`spawn` text NOT NULL,
	`owner` text NOT NULL,
	`event` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`spawn`, `owner`),
	FOREIGN KEY (`spawn`) REFERENCES `trail_spawns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner`) REFERENCES `trail_members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `trail_spawns` ADD `latitude` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `trail_spawns` ADD `longitude` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `trail_spawns` ADD `owner` text;--> statement-breakpoint
CREATE INDEX `spawn_bounds` ON `trail_spawns` (`latitude`,`longitude`);--> statement-breakpoint
CREATE INDEX `spawn_tile` ON `trail_spawns` (`tile`);