// CONTROLLER layer: HTTP only. Validates the household number and pagination
// params, calls the service, and maps the result to a response (200, 400, 404).

import { Router } from "express";
import { getHouseholdPull } from "./households.service";

export const householdsRouter = Router();

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

householdsRouter.get("/:hshdNum/pull", async (req, res) => {
  const hshdNum = Number(req.params.hshdNum);
  if (!Number.isInteger(hshdNum) || hshdNum <= 0) {
    return res.status(400).json({ error: "Household number must be a positive integer." });
  }

  const page = Math.max(1, Math.floor(Number(req.query.page)) || 1);
  const requestedSize = Math.floor(Number(req.query.pageSize)) || DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, requestedSize));

  const pull = await getHouseholdPull(hshdNum, page, pageSize);
  if (!pull) {
    return res.status(404).json({ error: `Household ${hshdNum} not found.` });
  }

  res.json(pull);
});
