ALTER TABLE `trail_visits` ADD `cell_i` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `trail_visits` ADD `cell_j` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `trail_visits` SET `cell_i`=CAST(substr(`tile`,1,instr(`tile`,',')-1) AS INTEGER), `cell_j`=CAST(substr(`tile`,instr(`tile`,',')+1) AS INTEGER);--> statement-breakpoint
CREATE INDEX `visit_bounds` ON `trail_visits` (`cell_i`,`cell_j`);
