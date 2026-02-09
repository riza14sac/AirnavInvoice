import { z } from "zod";

// Base schema without refinements (used for partial/update)
export const serviceBaseSchema = z.object({
    airline: z.string().min(1, "Airline/Operator is required"),
    flightType: z.enum(["DOM", "INT"]),
    flightNumber: z.string().min(1, "Flight number is required"),
    flightNumber2: z.string().optional(),
    registration: z.string().min(1, "Registration is required"),
    aircraftType: z.string().min(1, "Aircraft type is required"),
    depStation: z.string().min(1, "Departure station is required"),
    arrStation: z.string().min(1, "Arrival station is required"),

    // Date and times - accept ISO strings or Date objects
    arrivalDate: z.coerce.date(),
    ataUtc: z.coerce.date().optional().nullable(), // Optional - fill for Arrival
    atdUtc: z.coerce.date().optional().nullable(), // Optional - fill for Departure

    advanceExtend: z.enum(["ADVANCE", "EXTEND"]),

    // Service times
    serviceStartUtc: z.coerce.date(),
    serviceEndUtc: z.coerce.date(),

    // Units - at least one must be true
    useApp: z.boolean().default(false),
    useTwr: z.boolean().default(false),
    useAfis: z.boolean().default(false),

    // Currency for billing
    currency: z.enum(["IDR", "USD"]).default("IDR"),
    exchangeRate: z.number().int().positive().optional().nullable(),

    picDinas: z.string().optional(),
});

// Full schema with refinements for creation
export const serviceSchema = serviceBaseSchema.refine(
    (data) => data.ataUtc || data.atdUtc,
    {
        message: "Either ATA (Arrival) or ATD (Departure) time must be provided",
        path: ["ataUtc"],
    }
).refine(
    (data) => data.useApp || data.useTwr || data.useAfis,
    {
        message: "At least one unit (APP, TWR, or AFIS) must be selected",
        path: ["useApp"],
    }
).refine(
    (data) => data.serviceEndUtc > data.serviceStartUtc,
    {
        message: "Service end time must be after start time",
        path: ["serviceEndUtc"],
    }
);

export type ServiceFormData = z.infer<typeof serviceSchema>;

// Update schema - partial of base, with id required
export const serviceUpdateSchema = serviceBaseSchema.partial().extend({
    id: z.string().min(1),
});

export type ServiceUpdateData = z.infer<typeof serviceUpdateSchema>;
