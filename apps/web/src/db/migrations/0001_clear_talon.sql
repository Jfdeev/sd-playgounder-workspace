CREATE TABLE "loginIpAttempts" (
	"ip" text PRIMARY KEY NOT NULL,
	"failedAttempts" integer DEFAULT 0 NOT NULL,
	"lockedUntil" timestamp
);
