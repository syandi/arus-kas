CREATE TABLE `branches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`location` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `transactions` ADD `branch_id` integer NOT NULL REFERENCES branches(id);