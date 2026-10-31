CREATE TABLE `trail_bosses` (
	`id` text PRIMARY KEY NOT NULL,
	`tile` text NOT NULL,
	`document` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`removed_at` integer
);
--> statement-breakpoint
CREATE INDEX `boss_bounds` ON `trail_bosses` (`latitude`,`longitude`);