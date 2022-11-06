import BigNumber from 'bignumber.js';
BigNumber.config({ EXPONENTIAL_AT: 36 });
// const checkAmount = ({ amount }: { amount: any }) => {
//   if (!Number.isFinite(amount))
//     throw new Error('Can not format invalid amount');
// };
const getDecimalSeparator = function () {
  return ',';
};

const replaceDecimals = ({
  text,
  autoCorrect = false,
}: {
  text: any;
  autoCorrect?: boolean;
}) => {
  if (typeof text !== 'string') {
    return text;
  }

  if (
    getDecimalSeparator() === ',' &&
    !text?.includes?.('e+') &&
    !text?.includes?.('e-')
  ) {
    text = text.replace(/\./g, '_');
    text = text.replace(/,/g, '.');
    text = text.replace(/_/g, ',');
  }

  if (autoCorrect) {
    text = text.replace(/,/g, '');
  }

  return text;
};

const toNumber = ({
  text,
  autoCorrect = false,
}: {
  text: any;
  autoCorrect?: boolean;
}) => {
  const number = replaceDecimals({ text: text, autoCorrect: autoCorrect });
  return new BigNumber(number);
};

export default {
  toOriginalAmount({
    humanAmount,
    decimals,
    round = false,
  }: {
    humanAmount: any;
    decimals: any;
    round?: boolean;
  }) {
    let originalAmount = new BigNumber(0);
    try {
      const amount = toNumber({ text: humanAmount });
      // checkAmount({ amount: amount });
      // Use big number to solve float calculation problem
      // For example: 0.5000001 * 1e9 = 500000099.99999994
      // The result should be 500000100
      const decision_rate = Number(decimals) ? 10 ** Number(decimals) : 1;
      if (round) {
        return Math.floor(
          amount.multipliedBy(new BigNumber(decision_rate)).toNumber()
        );
      }
      originalAmount = amount.multipliedBy(new BigNumber(decision_rate));
    } catch (error) {
      console.log('toOriginalAmount-error', error);
    }
    return originalAmount;
  },

  toNumber,

  toInput({ text }: { text: any }) {
    if (typeof text !== 'string') {
      return text;
    }

    if (getDecimalSeparator() === ',') {
      text = text.replace(/\./g, '');
    }

    if (getDecimalSeparator() === '.') {
      text = text.replace(/,/g, '');
    }

    return text;
  },

  toHash({ text }: { text: any }) {
    let hash = 0,
      i,
      chr;
    if (text.length === 0) return '';
    for (i = 0; i < text.length; i++) {
      chr = text.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash.toString();
  },

  toDecimals({ number, token }: { number: any; token: any }) {
    return new BigNumber(
      replaceDecimals({
        text: {
          text: number,
          autoCorrect: true,
        },
      })
    )
      .dividedBy(new BigNumber(10).pow(token.pDecimals))
      .multipliedBy(new BigNumber(10).pow(token.decimals))
      .dividedToIntegerBy(1)
      .toFixed(0);
  },
};
