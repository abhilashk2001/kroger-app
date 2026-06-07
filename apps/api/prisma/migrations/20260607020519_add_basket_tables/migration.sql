-- CreateTable
CREATE TABLE "basket_rules" (
    "id" SERIAL NOT NULL,
    "antecedents" TEXT NOT NULL,
    "consequents" TEXT NOT NULL,
    "support" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "lift" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "basket_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "basket_model_metric" (
    "id" SERIAL NOT NULL,
    "target_commodity" TEXT NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "roc_auc" DOUBLE PRECISION NOT NULL,
    "top_drivers" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "basket_model_metric_pkey" PRIMARY KEY ("id")
);
