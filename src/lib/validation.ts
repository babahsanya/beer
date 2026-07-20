import { z } from "zod";

/**
 * Общие zod-схемы для валидации входных данных в API routes.
 */

// CUID pattern — Prisma's default ID format.
export const cuidSchema = z
  .string()
  .min(1, "ID is required")
  .max(100, "ID too long")
  .regex(/^[a-zA-Z0-9_-]+$/, "ID contains invalid characters");

// Beer ID — CUID or untappd-/online- prefix
export const beerIdSchema = z
  .string()
  .min(1, "beerId is required")
  .max(100, "beerId too long")
  .regex(/^[a-zA-Z0-9_-]+$/, "beerId contains invalid characters");

export const untappdIdSchema = z
  .number()
  .int("Untappd ID must be an integer")
  .positive("Untappd ID must be positive")
  .max(1_000_000_000);

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const smallLimitSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\u200B\uFEFF\u2028\u2029]/;

export const searchQuerySchema = z
  .string()
  .min(1, "Query is required")
  .max(200, "Query too long (max 200 chars)")
  .refine((q) => !CONTROL_CHARS.test(q), "Query contains control characters")
  .transform((q) => q.trim());

export const ratingSchema = z
  .number()
  .min(0.5, "Rating must be at least 0.5")
  .max(5, "Rating must be at most 5")
  .multipleOf(0.5, "Rating must be in 0.5 increments");

export const commentSchema = z
  .string()
  .max(500, "Comment too long (max 500 chars)")
  .trim()
  .default("");

export const authorSchema = z
  .string()
  .min(2, "Author name too short (min 2 chars)")
  .max(50, "Author name too long (max 50 chars)")
  .trim();

export const abvSchema = z
  .number()
  .min(0, "ABV must be >= 0")
  .max(30, "ABV must be <= 30");

export const ibuSchema = z
  .number()
  .int("IBU must be an integer")
  .min(0, "IBU must be >= 0")
  .max(200, "IBU must be <= 200");

export const tastingRatingSchema = z
  .number()
  .int("Rating must be an integer")
  .min(0, "Rating must be >= 0")
  .max(5, "Rating must be <= 5");

export const tastingEntryCreateSchema = z.object({
  beerId: z.string().max(100).optional().default(""),
  beerName: z.string().min(1).max(200),
  beerStyle: z.string().max(100).default(""),
  brewery: z.string().max(200).default(""),
  abv: abvSchema.default(0),
  country: z.string().max(100).default(""),
  personalRating: tastingRatingSchema,
  aroma: tastingRatingSchema.default(0),
  taste: tastingRatingSchema.default(0),
  appearance: tastingRatingSchema.default(0),
  mouthfeel: tastingRatingSchema.default(0),
  comment: z.string().max(2000).trim().default(""),
  location: z.string().max(200).default(""),
  glassType: z.string().max(100).default(""),
  wouldBuyAgain: z.boolean().default(false),
}).strict();

export const tastingEntryUpdateSchema = tastingEntryCreateSchema.partial();

export const dateRangeSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.dateFrom && data.dateTo) {
      return new Date(data.dateFrom) <= new Date(data.dateTo);
    }
    return true;
  },
  { message: "dateFrom must be before dateTo" },
);

export function formatZodErrors(error: z.ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}
