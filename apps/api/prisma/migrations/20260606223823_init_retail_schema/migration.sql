-- CreateTable
CREATE TABLE "households" (
    "hshd_num" INTEGER NOT NULL,
    "loyalty_flag" BOOLEAN NOT NULL,
    "age_range" TEXT,
    "marital" TEXT,
    "income_range" TEXT,
    "homeowner" TEXT,
    "hshd_composition" TEXT,
    "hh_size" TEXT,
    "children" TEXT,

    CONSTRAINT "households_pkey" PRIMARY KEY ("hshd_num")
);

-- CreateTable
CREATE TABLE "products" (
    "product_num" INTEGER NOT NULL,
    "department" TEXT NOT NULL,
    "commodity" TEXT NOT NULL,
    "brand_type" TEXT NOT NULL,
    "is_organic" BOOLEAN NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("product_num")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" SERIAL NOT NULL,
    "basket_num" INTEGER NOT NULL,
    "hshd_num" INTEGER NOT NULL,
    "product_num" INTEGER NOT NULL,
    "purchase_date" DATE NOT NULL,
    "spend" DECIMAL(10,2) NOT NULL,
    "units" INTEGER NOT NULL,
    "store_region" TEXT NOT NULL,
    "week_num" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transactions_hshd_num_idx" ON "transactions"("hshd_num");

-- CreateIndex
CREATE INDEX "transactions_basket_num_idx" ON "transactions"("basket_num");

-- CreateIndex
CREATE INDEX "transactions_product_num_idx" ON "transactions"("product_num");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_hshd_num_fkey" FOREIGN KEY ("hshd_num") REFERENCES "households"("hshd_num") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_product_num_fkey" FOREIGN KEY ("product_num") REFERENCES "products"("product_num") ON DELETE RESTRICT ON UPDATE CASCADE;
