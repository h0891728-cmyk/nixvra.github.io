-- CreateTable
CREATE TABLE `tenants` (
    `id` CHAR(36) NOT NULL,
    `subdomain` VARCHAR(63) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `industry` ENUM('EDUCATION', 'HEALTHCARE', 'REAL_ESTATE', 'AGENCY', 'ECOMMERCE', 'HOSPITALITY', 'LEGAL', 'FINANCE', 'OTHER') NOT NULL,
    `modules` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tenants_subdomain_key`(`subdomain`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `tenantId` CHAR(36) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF', 'CUSTOMER') NOT NULL DEFAULT 'STAFF',
    `email` VARCHAR(320) NOT NULL,
    `passwordHash` TEXT NOT NULL,
    `displayName` VARCHAR(255) NULL,
    `avatarUrl` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `users_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `users_tenantId_email_key`(`tenantId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenant_integrations` (
    `id` CHAR(36) NOT NULL,
    `tenantId` CHAR(36) NOT NULL,
    `provider` ENUM('META_GRAPH', 'WHATSAPP_CLOUD', 'YOUTUBE_DATA', 'CANVA', 'RAZORPAY', 'STRIPE', 'PRACTO', 'ACRES_99', 'GOOGLE_ADS', 'SENDGRID', 'TWILIO', 'OPENAI') NOT NULL,
    `apiKey` TEXT NULL,
    `accessToken` LONGTEXT NULL,
    `refreshToken` LONGTEXT NULL,
    `webhookUrl` TEXT NULL,
    `metadata` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `tokenExpiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tenant_integrations_tenantId_idx`(`tenantId`),
    UNIQUE INDEX `tenant_integrations_tenantId_provider_key`(`tenantId`, `provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `social_posts` (
    `id` CHAR(36) NOT NULL,
    `tenantId` CHAR(36) NOT NULL,
    `platforms` JSON NOT NULL,
    `mediaUrl` TEXT NOT NULL,
    `canvaDesignId` VARCHAR(255) NULL,
    `caption` LONGTEXT NOT NULL,
    `hashtags` JSON NULL,
    `scheduledFor` DATETIME(3) NOT NULL,
    `publishedAt` DATETIME(3) NULL,
    `status` ENUM('DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `qstashMessageId` VARCHAR(255) NULL,
    `publishResult` JSON NULL,
    `errorLog` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `social_posts_tenantId_idx`(`tenantId`),
    INDEX `social_posts_scheduledFor_status_idx`(`scheduledFor`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ad_campaigns` (
    `id` CHAR(36) NOT NULL,
    `tenantId` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `metaCampaignId` VARCHAR(64) NULL,
    `metaAdSetId` VARCHAR(64) NULL,
    `objective` ENUM('LEADS', 'TRAFFIC', 'AWARENESS', 'ENGAGEMENT', 'CONVERSIONS', 'APP_INSTALLS', 'VIDEO_VIEWS') NOT NULL,
    `budget` DOUBLE NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'INR',
    `status` ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `targetingSpec` JSON NULL,
    `metrics` JSON NOT NULL,
    `lastSyncedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ad_campaigns_tenantId_idx`(`tenantId`),
    INDEX `ad_campaigns_metaCampaignId_idx`(`metaCampaignId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `webhook_events` (
    `id` CHAR(36) NOT NULL,
    `tenantId` CHAR(36) NOT NULL,
    `source` ENUM('WHATSAPP_CLOUD', 'META_GRAPH', 'ACRES_99', 'PRACTO', 'RAZORPAY', 'STRIPE', 'YOUTUBE_DATA', 'CANVA', 'INTERNAL') NOT NULL,
    `payload` JSON NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'DEAD_LETTER') NOT NULL DEFAULT 'PENDING',
    `externalId` VARCHAR(255) NULL,
    `retryCount` INTEGER NOT NULL DEFAULT 0,
    `errorLog` TEXT NULL,
    `processedAt` DATETIME(3) NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `webhook_events_tenantId_status_idx`(`tenantId`, `status`),
    INDEX `webhook_events_receivedAt_idx`(`receivedAt`),
    UNIQUE INDEX `webhook_events_source_externalId_key`(`source`, `externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `business_entities` (
    `id` CHAR(36) NOT NULL,
    `tenantId` CHAR(36) NOT NULL,
    `type` ENUM('STUDENT', 'PATIENT', 'LEAD', 'AGENT', 'CLIENT', 'VENDOR', 'MEMBER') NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `contact` VARCHAR(320) NOT NULL,
    `altContact` VARCHAR(320) NULL,
    `metadata` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `assignedToId` CHAR(36) NULL,
    `tags` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `business_entities_tenantId_type_idx`(`tenantId`, `type`),
    INDEX `business_entities_tenantId_contact_idx`(`tenantId`, `contact`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` CHAR(36) NOT NULL,
    `tenantId` CHAR(36) NOT NULL,
    `entityId` CHAR(36) NOT NULL,
    `invoiceNumber` VARCHAR(64) NULL,
    `description` TEXT NULL,
    `amount` DOUBLE NOT NULL,
    `discount` DOUBLE NULL DEFAULT 0,
    `tax` DOUBLE NULL DEFAULT 0,
    `totalAmount` DOUBLE NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'INR',
    `status` ENUM('PENDING', 'PROCESSING', 'PAID', 'PARTIALLY_PAID', 'FAILED', 'REFUNDED', 'CANCELLED', 'DISPUTED') NOT NULL DEFAULT 'PENDING',
    `paymentGateway` ENUM('RAZORPAY', 'STRIPE', 'CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'OTHER') NOT NULL DEFAULT 'CASH',
    `gatewayOrderId` VARCHAR(255) NULL,
    `gatewayPaymentId` VARCHAR(255) NULL,
    `gatewayResponse` JSON NULL,
    `paidAt` DATETIME(3) NULL,
    `dueDate` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `transactions_invoiceNumber_key`(`invoiceNumber`),
    INDEX `transactions_tenantId_idx`(`tenantId`),
    INDEX `transactions_entityId_idx`(`entityId`),
    INDEX `transactions_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` CHAR(36) NOT NULL,
    `tenantId` CHAR(36) NOT NULL,
    `actorId` CHAR(36) NULL,
    `resource` VARCHAR(64) NOT NULL,
    `resourceId` CHAR(36) NOT NULL,
    `action` VARCHAR(64) NOT NULL,
    `diff` JSON NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_tenantId_resource_idx`(`tenantId`, `resource`),
    INDEX `audit_logs_actorId_idx`(`actorId`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenant_integrations` ADD CONSTRAINT `tenant_integrations_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `social_posts` ADD CONSTRAINT `social_posts_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ad_campaigns` ADD CONSTRAINT `ad_campaigns_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `webhook_events` ADD CONSTRAINT `webhook_events_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `business_entities` ADD CONSTRAINT `business_entities_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `business_entities` ADD CONSTRAINT `business_entities_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_entityId_fkey` FOREIGN KEY (`entityId`) REFERENCES `business_entities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
