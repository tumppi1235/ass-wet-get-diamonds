ALTER TABLE `trail_claims` ADD `cell_i` integer;--> statement-breakpoint
ALTER TABLE `trail_claims` ADD `cell_j` integer;--> statement-breakpoint
CREATE INDEX `claim_bounds` ON `trail_claims` (`cell_i`,`cell_j`);