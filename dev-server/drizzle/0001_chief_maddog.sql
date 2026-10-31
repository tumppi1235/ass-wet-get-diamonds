CREATE TABLE `trail_integrity` (
	`id` text PRIMARY KEY NOT NULL,
	`valid` integer NOT NULL,
	CONSTRAINT "valid_transaction" CHECK("trail_integrity"."valid"=1)
);
--> statement-breakpoint
ALTER TABLE `trail_events` ADD `request_hash` text DEFAULT '' NOT NULL;