-- CreateTable
CREATE TABLE "confirmed" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "confirmed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deceased" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "deceased_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovered" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "recovered_pkey" PRIMARY KEY ("id")
);
