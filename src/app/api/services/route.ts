import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { serviceSchema } from "@/validators/service.schema";
import { calculateBilling } from "@/lib/calc/billing";
import { generateReceiptNo } from "@/lib/calc/receiptNo";
import { canCreate, canRead } from "@/lib/auth/rbac";
import { FlightType, PaymentStatus, AdvanceExtend, Prisma } from "@prisma/client";

// GET /api/services - List services with filtering, sorting, pagination
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!canRead(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const searchParams = request.nextUrl.searchParams;

        // Pagination
        const page = parseInt(searchParams.get("page") || "1");
        const pageSize = parseInt(searchParams.get("pageSize") || "20");
        const skip = (page - 1) * pageSize;

        // Filters
        const search = searchParams.get("search") || undefined;
        const flightType = searchParams.get("flightType") as FlightType | undefined;
        const status = searchParams.get("status") as PaymentStatus | undefined;
        const advanceExtend = searchParams.get("advanceExtend") as AdvanceExtend | undefined;
        const dateFrom = searchParams.get("dateFrom");
        const dateTo = searchParams.get("dateTo");

        // Sorting
        const sortField = searchParams.get("sortField") || "createdAt";
        const sortDir = searchParams.get("sortDir") || "desc";

        // Build where clause
        const where: Prisma.FlightServiceWhereInput = {};

        if (search) {
            where.OR = [
                { airline: { contains: search, mode: "insensitive" } },
                { flightNumber: { contains: search, mode: "insensitive" } },
                { registration: { contains: search, mode: "insensitive" } },
                { receiptNo: { contains: search, mode: "insensitive" } },
            ];
        }

        if (flightType) {
            where.flightType = flightType;
        }

        if (status) {
            where.status = status;
        }

        if (advanceExtend) {
            where.advanceExtend = advanceExtend;
        }

        if (dateFrom || dateTo) {
            where.arrivalDate = {};
            if (dateFrom) {
                where.arrivalDate.gte = new Date(dateFrom);
            }
            if (dateTo) {
                where.arrivalDate.lte = new Date(dateTo);
            }
        }

        // Build order by
        const orderBy: Prisma.FlightServiceOrderByWithRelationInput = {
            [sortField]: sortDir,
        };

        // Execute queries
        const [services, total] = await Promise.all([
            prisma.flightService.findMany({
                where,
                orderBy,
                skip,
                take: pageSize,
                select: {
                    id: true,
                    seqNo: true,
                    airline: true,
                    flightType: true,
                    flightNumber: true,
                    registration: true,
                    arrivalDate: true,
                    ataUtc: true,
                    atdUtc: true,
                    advanceExtend: true,
                    durationMinutes: true,
                    billableHours: true,
                    netTotal: true,
                    receiptNo: true,
                    status: true,
                    createdAt: true,
                    currency: true,
                    exchangeRate: true,
                },
            }),
            prisma.flightService.count({ where }),
        ]);

        // Convert BigInt to string for JSON serialization
        const serializedServices = services.map((s) => ({
            ...s,
            netTotal: s.netTotal.toString(),
            currency: s.currency,
        }));

        return NextResponse.json({
            data: serializedServices,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        });
    } catch (error) {
        console.error("Error fetching services:", error);
        return NextResponse.json(
            { error: "Failed to fetch services" },
            { status: 500 }
        );
    }
}

// POST /api/services - Create a new service
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!canCreate(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const validatedData = serviceSchema.parse(body);

        // Calculate billing
        const billing = calculateBilling({
            serviceStartUtc: validatedData.serviceStartUtc,
            serviceEndUtc: validatedData.serviceEndUtc,
            useApp: validatedData.useApp,
            useTwr: validatedData.useTwr,
            useAfis: validatedData.useAfis,
        });

        // Generate receipt number - use ataUtc or atdUtc as reference date
        const referenceDate = validatedData.ataUtc || validatedData.atdUtc;
        if (!referenceDate) {
            return NextResponse.json(
                { error: "Either ATA or ATD must be provided" },
                { status: 400 }
            );
        }
        const receiptNo = await generateReceiptNo(
            prisma,
            referenceDate,
            validatedData.flightType as FlightType
        );

        // Create service
        const service = await prisma.flightService.create({
            data: {
                airline: validatedData.airline,
                flightType: validatedData.flightType as FlightType,
                flightNumber: validatedData.flightNumber,
                flightNumber2: validatedData.flightNumber2,
                registration: validatedData.registration,
                aircraftType: validatedData.aircraftType,
                depStation: validatedData.depStation,
                arrStation: validatedData.arrStation,
                arrivalDate: validatedData.arrivalDate,
                ataUtc: validatedData.ataUtc ?? undefined,
                atdUtc: validatedData.atdUtc ?? undefined,
                advanceExtend: validatedData.advanceExtend as AdvanceExtend,
                serviceStartUtc: validatedData.serviceStartUtc,
                serviceEndUtc: validatedData.serviceEndUtc,
                useApp: validatedData.useApp,
                useTwr: validatedData.useTwr,
                useAfis: validatedData.useAfis,
                // Auto-set currency based on flightType: INT = USD, DOM = IDR
                currency: validatedData.flightType === "INT" ? "USD" : "IDR",
                exchangeRate: validatedData.flightType === "INT" ? (validatedData.exchangeRate || null) : null,
                picDinas: validatedData.picDinas,
                durationMinutes: billing.durationMinutes,
                billableHours: billing.billableHours,
                grossApp: billing.grossApp,
                grossTwr: billing.grossTwr,
                grossAfis: billing.grossAfis,
                grossTotal: billing.grossTotal,
                ppn: billing.ppn,
                netTotal: billing.netTotal,
                receiptNo,
            },
        });

        // Convert BigInt for response
        const response = {
            ...service,
            grossApp: service.grossApp.toString(),
            grossTwr: service.grossTwr.toString(),
            grossAfis: service.grossAfis.toString(),
            grossTotal: service.grossTotal.toString(),
            ppn: service.ppn.toString(),
            netTotal: service.netTotal.toString(),
        };

        return NextResponse.json(response, { status: 201 });
    } catch (error) {
        console.error("Error creating service:", error);
        if (error instanceof Error && error.name === "ZodError") {
            return NextResponse.json(
                { error: "Validation failed", details: error },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: "Failed to create service" },
            { status: 500 }
        );
    }
}
