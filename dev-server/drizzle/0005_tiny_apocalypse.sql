CREATE TABLE `trail_boss_rewards` (
	`encounter` text NOT NULL,
	`owner` text NOT NULL,
	`document` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`encounter`, `owner`),
	FOREIGN KEY (`encounter`) REFERENCES `trail_encounters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner`) REFERENCES `trail_members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `trail_contributions` (
	`encounter` text NOT NULL,
	`owner` text NOT NULL,
	`boss` text NOT NULL,
	`activity_id` text NOT NULL,
	`document` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`encounter`, `owner`),
	FOREIGN KEY (`encounter`) REFERENCES `trail_encounters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner`) REFERENCES `trail_members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`boss`) REFERENCES `trail_bosses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_boss_activity` ON `trail_contributions` (`owner`,`boss`,`activity_id`);--> statement-breakpoint
CREATE TABLE `trail_encounter_actions` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`request_hash` text NOT NULL,
	`receipt` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`owner`, `id`),
	FOREIGN KEY (`owner`) REFERENCES `trail_members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `trail_encounters` (
	`id` text PRIMARY KEY NOT NULL,
	`boss` text NOT NULL,
	`owner` text NOT NULL,
	`state` text NOT NULL,
	`document` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`started_at` integer,
	`deadline` integer,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`boss`) REFERENCES `trail_bosses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner`) REFERENCES `trail_members`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `encounter_deadlines` ON `trail_encounters` (`state`,`deadline`);--> statement-breakpoint
CREATE TABLE `trail_party_members` (
	`encounter` text NOT NULL,
	`owner` text NOT NULL,
	`boss` text NOT NULL,
	`accepted` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`encounter`, `owner`),
	FOREIGN KEY (`encounter`) REFERENCES `trail_encounters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner`) REFERENCES `trail_members`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`boss`) REFERENCES `trail_bosses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_party_per_boss` ON `trail_party_members` (`owner`,`boss`) WHERE active=1;--> statement-breakpoint
CREATE INDEX `player_parties` ON `trail_party_members` (`owner`,`active`);--> statement-breakpoint
ALTER TABLE `trail_events` ADD `activity_id` text;--> statement-breakpoint
ALTER TABLE `trail_events` ADD `activity_at` integer;--> statement-breakpoint
CREATE INDEX `activity_receipts` ON `trail_events` (`owner`,`activity_id`,`activity_at`);--> statement-breakpoint
CREATE INDEX `activity_completion` ON `trail_events` (`owner`,`kind`,`activity_at`);