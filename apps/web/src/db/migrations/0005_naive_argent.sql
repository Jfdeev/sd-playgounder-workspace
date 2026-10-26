CREATE TABLE "designVersions" (
	"id" text PRIMARY KEY NOT NULL,
	"designId" text NOT NULL,
	"number" integer NOT NULL,
	"content" jsonb NOT NULL,
	"contentHash" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "designVersions_designId_number_unique" UNIQUE("designId","number")
);
--> statement-breakpoint
CREATE TABLE "savedDesigns" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"contextKind" text NOT NULL,
	"contextId" text,
	"shareToken" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "savedDesigns_shareToken_unique" UNIQUE("shareToken")
);
--> statement-breakpoint
ALTER TABLE "designVersions" ADD CONSTRAINT "designVersions_designId_savedDesigns_id_fk" FOREIGN KEY ("designId") REFERENCES "public"."savedDesigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savedDesigns" ADD CONSTRAINT "savedDesigns_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;