import Joi from "joi";

const GetBestRateRequestDTO = Joi.object({
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
});

export default {
  GetBestRateRequestDTO: GetBestRateRequestDTO
}
