CREATE TABLE "activityDays" (
	"userId" text NOT NULL,
	"day" date NOT NULL,
	CONSTRAINT "activityDays_userId_day_pk" PRIMARY KEY("userId","day")
);
--> statement-breakpoint
CREATE TABLE "scoringEvents" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"eventKey" text NOT NULL,
	"type" text NOT NULL,
	"problemId" text,
	"xp" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scoringEvents_userId_eventKey_unique" UNIQUE("userId","eventKey")
);
--> statement-breakpoint
CREATE TABLE "submissionRateLimits" (
	"userId" text PRIMARY KEY NOT NULL,
	"windowStart" timestamp NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "userProfiles" (
	"userId" text PRIMARY KEY NOT NULL,
	"nickname" text,
	"isPublic" boolean DEFAULT true NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "userProfiles_nickname_unique" UNIQUE("nickname")
);
--> statement-breakpoint
ALTER TABLE "activityDays" ADD CONSTRAINT "activityDays_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scoringEvents" ADD CONSTRAINT "scoringEvents_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissionRateLimits" ADD CONSTRAINT "submissionRateLimits_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "userProfiles" ADD CONSTRAINT "userProfiles_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;