PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_student` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`class_id` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `school_class`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_student`("id", "user_id", "first_name", "last_name", "class_id") SELECT "id", "user_id", "first_name", "last_name", "class_id" FROM `student`;--> statement-breakpoint
DROP TABLE `student`;--> statement-breakpoint
ALTER TABLE `__new_student` RENAME TO `student`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_student_leave` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` integer NOT NULL,
	`lesson_session_id` text NOT NULL,
	`reason` text DEFAULT 'Inny' NOT NULL,
	`left_at` integer NOT NULL,
	`returned_at` integer,
	FOREIGN KEY (`student_id`) REFERENCES `student`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lesson_session_id`) REFERENCES `lesson_session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_student_leave`("id", "student_id", "lesson_session_id", "reason", "left_at", "returned_at") SELECT "id", "student_id", "lesson_session_id", "reason", "left_at", "returned_at" FROM `student_leave`;--> statement-breakpoint
DROP TABLE `student_leave`;--> statement-breakpoint
ALTER TABLE `__new_student_leave` RENAME TO `student_leave`;--> statement-breakpoint
CREATE INDEX `student_id_idx` ON `student_leave` (`student_id`);--> statement-breakpoint
CREATE INDEX `lesson_idx` ON `student_leave` (`lesson_session_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `student_active_leave_idx` ON `student_leave` (`student_id`) WHERE returned_at IS NULL;