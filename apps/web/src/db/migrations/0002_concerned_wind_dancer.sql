CREATE TABLE "narratorExplanations" (
	"designHash" text PRIMARY KEY NOT NULL,
	"summary" text NOT NULL,
	"bottleneckExplanation" text NOT NULL,
	"recommendation" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
