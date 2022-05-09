import Joi from "joi";

const QuoteRequestDTO = Joi.object({
  sourceToken: Joi.string()
    .required(),
  destToken: Joi.string()
    .required(),
  amount: Joi.string()
    .required(),
  isSwapFromBuyToSell: Joi.boolean(),
  listDecimals: Joi.string()
    .optional(),
  forceCrossProtocol: Joi.boolean(),

  topN: Joi.number().integer().default(3),
  topNTokenInOut: Joi.number().integer().default(2),
  topNSecondHop: Joi.number().integer().default(0),
  topNWithEachBaseToken: Joi.number().integer().default(2),
  topNWithBaseToken: Joi.number().integer().default(6),
  topNWithBaseTokenInSet: Joi.boolean().default(false),
  topNDirectSwaps: Joi.number().integer().default(2),
  maxSwapsPerPath: Joi.number().integer().default(3),
  minSplits: Joi.number().integer().default(1),
  maxSplits: Joi.number().integer().default(3),
  distributionPercent: Joi.number().integer().default(5),
  tokenListURI: Joi.string().optional(),
  router: Joi.string().optional().default('alpha'),
  debug: Joi.boolean().default(false),
  debugJSON: Joi.boolean().default(false),
});

export default {
  QuoteRequestDTO
}
