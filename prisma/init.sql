-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'OPERATOR',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert admin user (password: admin123 hashed with bcrypt cost 12)
INSERT INTO users (id, email, password, name, role) VALUES 
    ('admin001', 'admin@airnav.co.id', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4T/S8KxLvHPspkKi', 'Administrator', 'ADMIN'),
    ('operator001', 'operator@airnav.co.id', '$2b$12$8K7Ie1OYbJqZcYZqJpWnG.qxQp3uEJXf8N3kJ5kzPj9mZwV7YhZHe', 'Operator WITT', 'OPERATOR'),
    ('viewer001', 'viewer@airnav.co.id', '$2b$12$vL7Nh8MwZqFpKjYxJnWxO.rySwP4dFYg9O4lK6lAQk0nAwW8ZiAJi', 'Viewer', 'VIEWER')
ON CONFLICT (email) DO NOTHING;

-- Create other tables
CREATE TABLE IF NOT EXISTS flight_services (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "seqNo" SERIAL UNIQUE,
    airline TEXT NOT NULL,
    "flightType" TEXT NOT NULL,
    "flightNumber" TEXT NOT NULL,
    "flightNumber2" TEXT,
    registration TEXT NOT NULL,
    "aircraftType" TEXT NOT NULL,
    "depStation" TEXT NOT NULL,
    "arrStation" TEXT NOT NULL,
    "arrivalDate" TIMESTAMP NOT NULL,
    "ataUtc" TIMESTAMP,
    "atdUtc" TIMESTAMP,
    "advanceExtend" TEXT NOT NULL,
    "serviceStartUtc" TIMESTAMP NOT NULL,
    "serviceEndUtc" TIMESTAMP NOT NULL,
    "useApp" BOOLEAN DEFAULT false,
    "useTwr" BOOLEAN DEFAULT false,
    "useAfis" BOOLEAN DEFAULT false,
    currency TEXT DEFAULT 'IDR',
    "exchangeRate" INTEGER,
    "picDinas" TEXT,
    "durationMinutes" INTEGER NOT NULL,
    "billableHours" INTEGER NOT NULL,
    "grossApp" BIGINT DEFAULT 0,
    "grossTwr" BIGINT DEFAULT 0,
    "grossAfis" BIGINT DEFAULT 0,
    "grossTotal" BIGINT NOT NULL,
    ppn BIGINT NOT NULL,
    "netTotal" BIGINT NOT NULL,
    "receiptNo" TEXT UNIQUE NOT NULL,
    "receiptDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'UNPAID',
    "paidAt" TIMESTAMP,
    "amountPaid" BIGINT,
    "paymentDifference" BIGINT,
    "paymentDays" INTEGER,
    "monitoringStatus" TEXT DEFAULT 'PENDING',
    "pph23Withheld" BOOLEAN DEFAULT false,
    "fakturPajakNo" TEXT,
    "fakturPajakDate" TIMESTAMP,
    "pdfReceiptPath" TEXT,
    "pdfBreakdownPath" TEXT,
    "pdfCombinedPath" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS receipt_counters (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    code TEXT NOT NULL,
    "lastSeq" INTEGER DEFAULT 0,
    UNIQUE(year, month, code)
);

CREATE TABLE IF NOT EXISTS signatures (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    title TEXT,
    type TEXT NOT NULL,
    "imageData" TEXT NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_flight_services_flight_type ON flight_services ("flightType");
CREATE INDEX IF NOT EXISTS idx_flight_services_status ON flight_services (status);
CREATE INDEX IF NOT EXISTS idx_flight_services_arrival_date ON flight_services ("arrivalDate");
CREATE INDEX IF NOT EXISTS idx_flight_services_receipt_no ON flight_services ("receiptNo");
CREATE INDEX IF NOT EXISTS idx_flight_services_monitoring_status ON flight_services ("monitoringStatus");
