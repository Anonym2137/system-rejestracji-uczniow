PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_lesson_session` (
	`id` text PRIMARY KEY NOT NULL,
	`class_id` integer NOT NULL,
	`teacher_id` text NOT NULL,
	`subject` text,
	`started_at` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `school_class`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`teacher_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_lesson_session`("id", "class_id", "teacher_id", "subject", "started_at", "is_active") SELECT "id", "class_id", "teacher_id", "subject", "started_at", "is_active" FROM `lesson_session`;--> statement-breakpoint
DROP TABLE `lesson_session`;--> statement-breakpoint
ALTER TABLE `__new_lesson_session` RENAME TO `lesson_session`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_student_leave` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` integer NOT NULL,
	`lesson_session_id` text NOT NULL,
	`reason` text,
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
CREATE INDEX `lesson_idx` ON `student_leave` (`lesson_session_id`);