import Joi from 'joi';

const Token = Joi.object({
  decimals: Joi.number().required(),
  symbol: Joi.string().required(),
  contractIdGetRate: Joi.string().required(),
});

const GetBestRateRequestDTO = Joi.object({
  sourceToken: Token.required(),
  destToken: Token.required(),
  amount: Joi.number().required(),
  isSwapFromBuyToSell: Joi.boolean().required(),
  listDecimals: Joi.object().required(),
  forceCrossProtocol: Joi.boolean(),
});

export default {
  GetBestRateRequestDTO: GetBestRateRequestDTO,
};
