/* eslint-disable @typescript-eslint/ban-ts-comment */
// import { JSBI, Pair, Token, TokenAmount, Trade } from 'pancakeswap/sdk';
import { CurrencyAmount, JSBI, Pair, Token, Trade } from '@pancakeswap/sdk';
import { ethers } from 'ethers';
import express from 'express';
// @ts-ignore
// import {
// BSC_CONSTANT,
// PANCAKE_CONSTANTS
// } from 'incognito-chain-web-js/build/wallet';
import toLower from 'lodash/toLower';
import Web3 from 'web3';
import convert from '../../utils/convert';
import { CommonRoutesConfig } from '../common/common.routes.config';
import {
  BSC_MAINNET_CONFIGS,
  BSC_TESTNET_CONFIGS,
  MULTI_CALL_ABI,
  PANCAKE_ABI,
  PANCAKE_FACTORY_ABI,
  PANCAKE_MAINNET_CONFIGS,
  PANCAKE_PAIR_ABI,
  PANCAKE_TESTNET_CONFIGS,
} from './constants';
import RequestDTOSchema from './pancake-swap.dto.config';

ethers.utils.Logger.globalLogger();
ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.DEBUG);

export class PancakeSwapRoutesConfig extends CommonRoutesConfig {
  async getBestRateFromPancake(params: {
    sourceToken: any;
    destToken: any;
    amount: any;
    isSwapFromBuyToSell: any;
    listDecimals: any;
    // bscConfigs: any;
    // pancakeConfigs: any;
    chainId: number;
  }) {
    const {
      sourceToken,
      destToken,
      amount,
      isSwapFromBuyToSell,
      listDecimals,
      chainId,
    } = params;



    let bscConfigs = BSC_MAINNET_CONFIGS;
    let pancakeConfigs = PANCAKE_MAINNET_CONFIGS;

    if (chainId == PANCAKE_TESTNET_CONFIGS.chainID) {
      bscConfigs = BSC_TESTNET_CONFIGS;
      pancakeConfigs = PANCAKE_TESTNET_CONFIGS;
    }

    console.log('bscConfigs', bscConfigs);
    console.log('pancakeConfigs', pancakeConfigs);
    console.log('chainId', chainId);


    const {
      routerV2: pancakeRouterV2,
      factoryAddress: pancakeFactoryAddress,
      chainID: pancakeChainID,
      multiCallContract: pancakeMultiCallContract,
    } = pancakeConfigs;
    const listCommon = [...Object.keys(listDecimals)]; // pairs token => sell/buy token -> find best rate
    const web3 = new Web3(bscConfigs.host);
    const MULTI_CALL_INST = new web3.eth.Contract(
      MULTI_CALL_ABI,
      pancakeMultiCallContract
    );
    const FACTORY_INST = new web3.eth.Contract(
      PANCAKE_FACTORY_ABI,
      pancakeFactoryAddress
    );
    const PANCAKE_ROUTER_INST = new web3.eth.Contract(
      PANCAKE_ABI,
      pancakeRouterV2
    );
    const pairList = [];
    // get list LPs
    const abiCallGetLPs = [];
    const token_pair = [];
    const listTokens = listCommon.slice();
    const listTokenDecimals = Object.assign({}, listDecimals);
    try {
      [sourceToken, destToken].forEach(function (item) {
        if (!listTokenDecimals[toLower(item.contractIdGetRate)]) {
          listTokenDecimals[toLower(item.contractIdGetRate)] = {
            decimals: item.decimals,
            symbol: item.symbol,
          };
          listTokens.push(item.contractIdGetRate);
        }
      });
    } catch (error) {
      console.log('ERROR', error);
    }
    for (let i = 0; i < listTokens.length - 1; i++) {
      for (let j = i + 1; j < listTokens.length; j++) {
        if (toLower(listTokens[i]) === toLower(listTokens[j])) continue;
        const temp = FACTORY_INST.methods
          .getPair(listTokens[i], listTokens[j])
          .encodeABI();
        abiCallGetLPs.push([pancakeFactoryAddress, temp]);
        token_pair.push({ token0: listTokens[i], token1: listTokens[j] });
      }
    } // pair sell / buy: [{sell, buy}]

    // detect exited pair between sell/buy in pancake
    const listLPs = await MULTI_CALL_INST.methods
      .tryAggregate(false, abiCallGetLPs)
      .call();
    const listPairExist = [];
    const getPairResrved = [];
    for (let i = 0; i < listLPs.length; i++) {
      if (!listLPs[i].success) {
        continue;
      }
      const contractLPAddress = '0x' + listLPs[i].returnData.substring(26);
      if (contractLPAddress === '0x0000000000000000000000000000000000000000') {
        continue;
      }
      const contractTemp = new web3.eth.Contract(
        PANCAKE_PAIR_ABI,
        contractLPAddress
      );
      const temp = contractTemp.methods.getReserves().encodeABI();
      const temp2 = contractTemp.methods.token0().encodeABI();
      getPairResrved.push([contractLPAddress, temp]);
      getPairResrved.push([contractLPAddress, temp2]);
      listPairExist.push(token_pair[i]);
    }

    if (getPairResrved.length === 0) {
      console.log('no LPs exist!!!');
      // @ts-ignore
      return null, null;
    }

    // get rate of pair
    const listReserved = await MULTI_CALL_INST.methods
      .tryAggregate(false, getPairResrved)
      .call();
    if (listReserved.length < 2) {
      console.log('no LPs exist!!!');
      // @ts-ignore
      return null, null;
    }

    for (let i = 0; i < listReserved.length; i += 2) {
      const reserve0 = JSBI.BigInt(
        '0x' + listReserved[i].returnData.substring(2, 66)
      );
      const reserve1 = JSBI.BigInt(
        '0x' + listReserved[i].returnData.substring(66, 130)
      );
      const token0: string =
        '0x' + listReserved[i + 1].returnData.substring(26);
      // @ts-ignore
      let token1: any = listPairExist[i / 2].token1;
      if (
        listPairExist[i / 2]?.token0?.toLowerCase() !== token0.toLowerCase()
      ) {
        token1 = listPairExist[i / 2]?.token0;
      }
      const token0Ins = new Token(
        pancakeChainID,
        token0,
        listTokenDecimals[toLower(token0)].decimals,
        listTokenDecimals[toLower(token0)].symbol
      );
      const token1Ins = new Token(
        pancakeChainID,
        token1,
        listTokenDecimals[toLower(token1)].decimals,
        listTokenDecimals[toLower(token1)].symbol
      );

      const tkca1 = new TokenAmount(token0Ins, reserve0);
      const tkca2 = new TokenAmount(token1Ins, reserve1);

      const pair = new Pair(tkca1, tkca2, pancakeChainID);
      pairList.push(pair);
    }
    const sellOriginalAmount = convert.toOriginalAmount({
      humanAmount: amount,
      decimals: isSwapFromBuyToSell ? destToken.decimals : sourceToken.decimals,
    });

    const sellAmount = JSBI.BigInt(sellOriginalAmount);
    const seltTokenInst = new Token(
      pancakeChainID,
      sourceToken.contractIdGetRate,
      sourceToken.decimals,
      sourceToken.symbol
    );
    const buyTokenInst = new Token(
      pancakeChainID,
      destToken.contractIdGetRate,
      destToken.decimals,
      destToken.symbol
    );

    const tkca1 = new TokenAmount(seltTokenInst, sellAmount);
    const tkca2 = new TokenAmount(buyTokenInst, sellAmount);

    let result;
    if (!isSwapFromBuyToSell) {
      result = Trade.bestTradeExactIn(
        // find best route
        pairList,
        tkca1,
        buyTokenInst,
        { maxNumResults: 1, maxHops: 3 }
      );
    } else {
      result = Trade.bestTradeExactOut(pairList, seltTokenInst, tkca2, {
        maxNumResults: 1,
        maxHops: 3,
      });
    }
    if (result.length === 0) {
      console.log('Can not find the best path for this pair');
      return null;
    }

    const priceImpact = result[0]?.priceImpact.toSignificant(18);
    const bestPath: any = result[0]?.route.path;
    const paths: any = [];
    bestPath.forEach(function (item: any) {
      paths.push(item.address);
    });
    let outputs;
    if (!isSwapFromBuyToSell) {
      outputs = await PANCAKE_ROUTER_INST.methods
        .getAmountsOut(sellAmount.toString(), paths)
        .call();
    } else {
      outputs = await PANCAKE_ROUTER_INST.methods
        .getAmountsIn(sellAmount.toString(), paths)
        .call();
    }
    // @ts-ignore
    return { paths, outputs, impactAmount: Number(priceImpact) };
  }

  async getBestRate(_req: express.Request, res: express.Response) {
    let requestBody = null;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    try {
      requestBody = await RequestDTOSchema.GetBestRateRequestDTO.validateAsync(
        _req.body
      );
    } catch (err: any) {
      res.status(400).json({
        error: err.message,
      });
      return;
    }

    try {
      // console.log("requestBody", requestBody);
      const result = await that.getBestRateFromPancake(requestBody);

      // console.log("result=>", JSON.stringify(result))
      //console.log("routeAmounts=>", JSON.stringify(routeAmounts));

      if (!result) {
        res.status(400).json({
          error: 'no route found',
        });
        return;
      }

      res.status(200).json({
        message: 'ok',
        data: result,
      });
      return;
    } catch (err: any) {
      res.status(500).json({
        error: err.message,
      });
      console.error(err);
    }
  }

  configureRoutes() {
    this.app
      .route(`/api/pancake/get-best-rate`)
      .post(this.getBestRate.bind(this));

    return this.app;
  }
}
