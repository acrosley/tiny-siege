CREATE TABLE `rooms` (
	`code` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rooms_updated_idx` ON `rooms` (`updated`);