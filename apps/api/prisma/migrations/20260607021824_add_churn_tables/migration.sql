-- CreateTable
CREATE TABLE "household_churn" (
    "hshd_num" INTEGER NOT NULL,
    "churn_probability" DOUBLE PRECISION NOT NULL,
    "risk_band" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "household_churn_pkey" PRIMARY KEY ("hshd_num")
);

-- CreateTable
CREATE TABLE "churn_model_metric" (
    "id" SERIAL NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "roc_auc" DOUBLE PRECISION NOT NULL,
    "churn_rate" DOUBLE PRECISION NOT NULL,
    "top_drivers" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "churn_model_metric_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "household_churn" ADD CONSTRAINT "household_churn_hshd_num_fkey" FOREIGN KEY ("hshd_num") REFERENCES "households"("hshd_num") ON DELETE CASCADE ON UPDATE CASCADE;
