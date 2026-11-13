import { Candle, TechnicalIndicatorValues, TechnicalGaugeSummary, AnalysisHorizon, HorizonRecommendation } from '../types/market';

/**
 * Simple Moving Average (SMA)
 */
export function calculateSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  let sum = 0;

  for (let i = 0; i < data.length; i++) {
    sum += data[i];
    if (i >= period) {
      sum -= data[i - period];
    }
    if (i >= period - 1) {
      result.push(sum / period);
    } else {
      result.push(null);
    }
  }
  return result;
}

/**
 * Exponential Moving Average (EMA)
 */
export function calculateEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  let previousEMA: number | null = null;

  for (let i = 0; i < data.length; i++) {
    const val = data[i];
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      // First EMA is simple average
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[j];
      }
      previousEMA = sum / period;
      result.push(previousEMA);
    } else {
      if (previousEMA !== null) {
        const currentEMA: number = (val - previousEMA) * multiplier + previousEMA;
        previousEMA = currentEMA;
        result.push(currentEMA);
      } else {
        result.push(null);
      }
    }
  }
  return result;
}

/**
 * Relative Strength Index (RSI) using Wilder's smoothed method
 */
export function calculateRSI(closes: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [];
  if (closes.length < period + 1) {
    return closes.map(() => null);
  }

  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    const change = changes[i];
    if (change >= 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  // The first `period` entries have no RSI
  for (let i = 0; i < period; i++) {
    result.push(null);
  }

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push(100 - 100 / (1 + rs));

  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(100 - 100 / (1 + rs));
  }

  return result;
}

/**
 * Bollinger Bands
 */
export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
} {
  const middle = calculateSMA(closes, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < closes.length; i++) {
    const smaVal = middle[i];
    if (smaVal === null) {
      upper.push(null);
      lower.push(null);
    } else {
      let sumSqDiff = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sumSqDiff += Math.pow(closes[j] - smaVal, 2);
      }
      const stdDev = Math.sqrt(sumSqDiff / period);
      upper.push(smaVal + stdDevMultiplier * stdDev);
      lower.push(smaVal - stdDevMultiplier * stdDev);
    }
  }

  return { upper, middle, lower };
}

/**
 * MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
} {
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  const macdLine: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    const f = fastEMA[i];
    const s = slowEMA[i];
    if (f !== null && s !== null) {
      macdLine.push(f - s);
    } else {
      macdLine.push(null);
    }
  }

  // Calculate signal line as EMA of MACD line (skipping nulls)
  const validMacdValues: number[] = [];
  const validIndices: number[] = [];
  for (let i = 0; i < macdLine.length; i++) {
    const m = macdLine[i];
    if (m !== null) {
      validMacdValues.push(m);
      validIndices.push(i);
    }
  }

  const signalSub = calculateEMA(validMacdValues, signalPeriod);
  const signalLine: (number | null)[] = closes.map(() => null);
  for (let j = 0; j < validIndices.length; j++) {
    signalLine[validIndices[j]] = signalSub[j];
  }

  const histogram: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    const m = macdLine[i];
    const s = signalLine[i];
    if (m !== null && s !== null) {
      histogram.push(m - s);
    } else {
      histogram.push(null);
    }
  }

  return { macd: macdLine, signal: signalLine, histogram };
}

/**
 * Stochastic Oscillator (%K, %D)
 */
export function calculateStochastic(
  candles: Candle[],
  kPeriod: number = 14,
  dPeriod: number = 3
): {
  k: (number | null)[];
  d: (number | null)[];
} {
  const kLine: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i < kPeriod - 1) {
      kLine.push(null);
      continue;
    }

    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      if (candles[j].high > highestHigh) highestHigh = candles[j].high;
      if (candles[j].low < lowestLow) lowestLow = candles[j].low;
    }

    const currentClose = candles[i].close;
    const diff = highestHigh - lowestLow;
    if (diff === 0) {
      kLine.push(50);
    } else {
      kLine.push(((currentClose - lowestLow) / diff) * 100);
    }
  }

  // %D is SMA of %K
  const validKs: number[] = [];
  const validIdx: number[] = [];
  for (let i = 0; i < kLine.length; i++) {
    if (kLine[i] !== null) {
      validKs.push(kLine[i] as number);
      validIdx.push(i);
    }
  }

  const dSub = calculateSMA(validKs, dPeriod);
  const dLine: (number | null)[] = candles.map(() => null);
  for (let i = 0; i < validIdx.length; i++) {
    dLine[validIdx[i]] = dSub[i];
  }

  return { k: kLine, d: dLine };
}

/**
 * Average True Range (ATR)
 */
export function calculateATR(candles: Candle[], period: number = 14): (number | null)[] {
  const tr: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      tr.push(candles[i].high - candles[i].low);
    } else {
      const highLow = candles[i].high - candles[i].low;
      const highClose = Math.abs(candles[i].high - candles[i - 1].close);
      const lowClose = Math.abs(candles[i].low - candles[i - 1].close);
      tr.push(Math.max(highLow, highClose, lowClose));
    }
  }

  const result: (number | null)[] = [];
  let atr = 0;
  for (let i = 0; i < tr.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += tr[j];
      atr = sum / period;
      result.push(atr);
    } else {
      atr = (atr * (period - 1) + tr[i]) / period;
      result.push(atr);
    }
  }
  return result;
}

/**
 * Volume Weighted Average Price (VWAP)
 */
export function calculateVWAP(candles: Candle[]): (number | null)[] {
  let cumulativeTypicalVol = 0;
  let cumulativeVolume = 0;
  const result: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const typicalPrice = (c.high + c.low + c.close) / 3;
    cumulativeTypicalVol += typicalPrice * c.volume;
    cumulativeVolume += c.volume;

    if (cumulativeVolume > 0) {
      result.push(cumulativeTypicalVol / cumulativeVolume);
    } else {
      result.push(typicalPrice);
    }
  }
  return result;
}

/**
 * SuperTrend Indicator
 */
export function calculateSuperTrend(
  candles: Candle[],
  period: number = 10,
  multiplier: number = 3
): {
  values: (number | null)[];
  directions: ('up' | 'down' | null)[];
} {
  const atr = calculateATR(candles, period);
  const values: (number | null)[] = [];
  const directions: ('up' | 'down' | null)[] = [];

  let upperBand = 0;
  let lowerBand = 0;
  let trend: 'up' | 'down' = 'up';

  for (let i = 0; i < candles.length; i++) {
    const atrVal = atr[i];
    if (atrVal === null) {
      values.push(null);
      directions.push(null);
      continue;
    }

    const hl2 = (candles[i].high + candles[i].low) / 2;
    let basicUpper = hl2 + multiplier * atrVal;
    let basicLower = hl2 - multiplier * atrVal;

    if (i > 0 && values[i - 1] !== null) {
      const prevClose = candles[i - 1].close;
      if (basicUpper < upperBand || prevClose > upperBand) {
        upperBand = basicUpper;
      }
      if (basicLower > lowerBand || prevClose < lowerBand) {
        lowerBand = basicLower;
      }
    } else {
      upperBand = basicUpper;
      lowerBand = basicLower;
    }

    if (candles[i].close > upperBand) {
      trend = 'up';
    } else if (candles[i].close < lowerBand) {
      trend = 'down';
    }

    const currentVal = trend === 'up' ? lowerBand : upperBand;
    values.push(currentVal);
    directions.push(trend);
  }

  return { values, directions };
}

/**
 * Pivot Points (Classic and Fibonacci)
 */
export function calculatePivotPoints(lastCandle: Candle) {
  const { high, low, close } = lastCandle;
  const p = (high + low + close) / 3;
  const range = high - low;

  // Classic
  const classic = {
    p,
    r1: 2 * p - low,
    r2: p + range,
    r3: high + 2 * (p - low),
    s1: 2 * p - high,
    s2: p - range,
    s3: low - 2 * (high - p),
  };

  // Fibonacci
  const fibonacci = {
    p,
    r1: p + 0.382 * range,
    r2: p + 0.618 * range,
    r3: p + 1.0 * range,
    s1: p - 0.382 * range,
    s2: p - 0.618 * range,
    s3: p - 1.0 * range,
  };

  return { classic, fibonacci };
}

/**
 * Evaluates full technical indicators into a multi-factor quantitative gauge
 */
export function evaluateTechnicalGauge(candles: Candle[]): {
  summary: TechnicalGaugeSummary;
  lastValues: TechnicalIndicatorValues;
} {
  const closes = candles.map((c) => c.close);
  const lastIndex = candles.length - 1;
  const currentPrice = candles[lastIndex].close;

  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes, 12, 26, 9);
  const bollinger = calculateBollingerBands(closes, 20, 2);
  const stoch = calculateStochastic(candles, 14, 3);
  const atr = calculateATR(candles, 14);
  const vwap = calculateVWAP(candles);
  const superTrend = calculateSuperTrend(candles, 10, 3);

  const lastSMA20 = sma20[lastIndex] ?? currentPrice;
  const lastSMA50 = sma50[lastIndex] ?? currentPrice;
  const lastSMA200 = sma200[lastIndex] ?? currentPrice;
  const lastEMA9 = ema9[lastIndex] ?? currentPrice;
  const lastEMA21 = ema21[lastIndex] ?? currentPrice;
  const lastRSI = rsi[lastIndex] ?? 50;
  const lastMACD = {
    macd: macd.macd[lastIndex] ?? 0,
    signal: macd.signal[lastIndex] ?? 0,
    histogram: macd.histogram[lastIndex] ?? 0,
  };
  const lastBB = {
    upper: bollinger.upper[lastIndex] ?? currentPrice * 1.02,
    middle: bollinger.middle[lastIndex] ?? currentPrice,
    lower: bollinger.lower[lastIndex] ?? currentPrice * 0.98,
    percentB:
      bollinger.upper[lastIndex] && bollinger.lower[lastIndex]
        ? (currentPrice - (bollinger.lower[lastIndex] as number)) /
          ((bollinger.upper[lastIndex] as number) - (bollinger.lower[lastIndex] as number))
        : 0.5,
  };
  const lastStoch = {
    k: stoch.k[lastIndex] ?? 50,
    d: stoch.d[lastIndex] ?? 50,
  };
  const lastATR = atr[lastIndex] ?? currentPrice * 0.015;
  const lastVWAP = vwap[lastIndex] ?? currentPrice;
  const lastST = {
    value: superTrend.values[lastIndex] ?? currentPrice,
    trend: (superTrend.directions[lastIndex] ?? 'up') as 'up' | 'down',
  };

  // Score Moving Averages
  let maBuy = 0;
  let maNeutral = 0;
  let maSell = 0;

  if (currentPrice > lastEMA9) maBuy++; else if (currentPrice < lastEMA9) maSell++; else maNeutral++;
  if (currentPrice > lastEMA21) maBuy++; else if (currentPrice < lastEMA21) maSell++; else maNeutral++;
  if (currentPrice > lastSMA20) maBuy++; else if (currentPrice < lastSMA20) maSell++; else maNeutral++;
  if (currentPrice > lastSMA50) maBuy++; else if (currentPrice < lastSMA50) maSell++; else maNeutral++;
  if (currentPrice > lastSMA200) maBuy++; else if (currentPrice < lastSMA200) maSell++; else maNeutral++;

  // Score Oscillators
  let oscBuy = 0;
  let oscNeutral = 0;
  let oscSell = 0;

  // RSI
  if (lastRSI < 30) oscBuy++;
  else if (lastRSI > 70) oscSell++;
  else oscNeutral++;

  // MACD
  if (lastMACD.histogram > 0) oscBuy++;
  else if (lastMACD.histogram < 0) oscSell++;
  else oscNeutral++;

  // Stochastic
  if (lastStoch.k < 20) oscBuy++;
  else if (lastStoch.k > 80) oscSell++;
  else oscNeutral++;

  // Bollinger Bands
  if (lastBB.percentB < 0.1) oscBuy++;
  else if (lastBB.percentB > 0.9) oscSell++;
  else oscNeutral++;

  // SuperTrend
  if (lastST.trend === 'up') oscBuy++;
  else oscSell++;

  const totalBuy = maBuy + oscBuy;
  const totalSell = maSell + oscSell;
  const totalSignals = totalBuy + maNeutral + oscNeutral + totalSell;
  const score = Math.round(((totalBuy - totalSell) / totalSignals) * 100);

  let overallRating: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL' = 'NEUTRAL';
  if (score >= 45) overallRating = 'STRONG_BUY';
  else if (score >= 15) overallRating = 'BUY';
  else if (score <= -45) overallRating = 'STRONG_SELL';
  else if (score <= -15) overallRating = 'SELL';

  const pivotPoints = calculatePivotPoints(candles[lastIndex]);

  return {
    summary: {
      overallRating,
      score,
      oscillators: {
        buy: oscBuy,
        neutral: oscNeutral,
        sell: oscSell,
        rating: oscBuy > oscSell + 1 ? 'BUY' : oscSell > oscBuy + 1 ? 'SELL' : 'NEUTRAL',
      },
      movingAverages: {
        buy: maBuy,
        neutral: maNeutral,
        sell: maSell,
        rating: maBuy > maSell + 1 ? 'BUY' : maSell > maBuy + 1 ? 'SELL' : 'NEUTRAL',
      },
      pivotPoints,
    },
    lastValues: {
      sma20: lastSMA20,
      sma50: lastSMA50,
      sma200: lastSMA200,
      ema9: lastEMA9,
      ema21: lastEMA21,
      rsi: lastRSI,
      macd: lastMACD,
      bollinger: lastBB,
      stochastic: lastStoch,
      atr: lastATR,
      vwap: lastVWAP,
      superTrend: lastST,
    },
  };
}

/**
 * Evaluates dedicated Buy/Sell recommendation for either Short-Term (intraday/swing 1-5d)
 * or Long-Term (multi-week/month trend) horizon.
 */
export function evaluateHorizonRecommendation(
  candles: Candle[],
  horizon: AnalysisHorizon,
  livePrice?: number
): HorizonRecommendation {
  if (!candles || candles.length === 0) {
    const fallbackPrice = livePrice && livePrice > 0 ? livePrice : 100;
    return {
      horizon,
      action: 'HOLD',
      score: 0,
      confidence: 50,
      entryPrice: fallbackPrice,
      targetPrice: fallbackPrice,
      stopLoss: fallbackPrice,
      riskReward: '1 : 2.0',
      timeframeLabel: horizon === 'short' ? '15m / 1h' : '1D / 1W',
      reasons: ['Nedostatek dat pro výpočet signálu'],
      reasonsEn: ['Insufficient candle data for signal calculation'],
    };
  }

  const closes = candles.map((c) => c.close);
  const lastIndex = candles.length - 1;
  const currentPrice = livePrice && livePrice > 0 ? livePrice : closes[lastIndex];

  const sma20Arr = calculateSMA(closes, 20);
  const sma50Arr = calculateSMA(closes, 50);
  const sma200Arr = calculateSMA(closes, Math.min(200, Math.max(60, Math.floor(closes.length * 0.85))));
  const ema9Arr = calculateEMA(closes, 9);
  const ema21Arr = calculateEMA(closes, 21);
  const rsiArr = calculateRSI(closes, 14);
  const macd = calculateMACD(closes, 12, 26, 9);
  const stoch = calculateStochastic(candles, 14, 3);
  const atrArr = calculateATR(candles, 14);
  const vwapArr = calculateVWAP(candles);
  const superTrend = calculateSuperTrend(candles, 10, 3);

  const sma20 = sma20Arr[lastIndex] ?? currentPrice;
  const sma50 = sma50Arr[lastIndex] ?? currentPrice;
  const sma200 = sma200Arr[lastIndex] ?? sma50;
  const ema9 = ema9Arr[lastIndex] ?? currentPrice;
  const ema21 = ema21Arr[lastIndex] ?? currentPrice;
  const rsi = rsiArr[lastIndex] ?? 50;
  const macdHist = macd.histogram[lastIndex] ?? 0;
  const macdLine = macd.macd[lastIndex] ?? 0;
  const macdSignal = macd.signal[lastIndex] ?? 0;
  const stochK = stoch.k[lastIndex] ?? 50;
  const stochD = stoch.d[lastIndex] ?? 50;
  const atr = atrArr[lastIndex] ?? currentPrice * (horizon === 'short' ? 0.015 : 0.03);
  const vwap = vwapArr[lastIndex] ?? currentPrice;
  const stTrend = superTrend.directions[lastIndex] ?? 'up';

  let score = 0;
  const reasons: string[] = [];
  const reasonsEn: string[] = [];

  if (horizon === 'short') {
    // 1. Fast EMA 9/21 trend alignment (+/- 25)
    if (currentPrice > ema9 && ema9 > ema21) {
      score += 25;
      reasons.push('Cena nad EMA 9 a EMA 21 potvrzuje krátkodobé nákupní momentum');
      reasonsEn.push('Price above EMA 9 & EMA 21 confirms short-term bullish momentum');
    } else if (currentPrice < ema9 && ema9 < ema21) {
      score -= 25;
      reasons.push('Cena pod EMA 9 a EMA 21 značí krátkodobý prodejní tlak');
      reasonsEn.push('Price below EMA 9 & EMA 21 signals short-term selling pressure');
    } else if (currentPrice > ema21) {
      score += 10;
    } else {
      score -= 10;
    }

    // 2. SuperTrend (+/- 20)
    if (stTrend === 'up') {
      score += 20;
      reasons.push('SuperTrend drží býčí intradenní strukturu');
      reasonsEn.push('SuperTrend remains in bullish intraday structure');
    } else {
      score -= 20;
      reasons.push('SuperTrend signalizuje medvědí krátkodobý trend');
      reasonsEn.push('SuperTrend indicates bearish short-term direction');
    }

    // 3. MACD momentum (+/- 20)
    if (macdHist > 0 && macdLine >= macdSignal) {
      score += 20;
      reasons.push(`Kladný MACD histogram (${macdHist.toFixed(2)}) podporuje růst`);
      reasonsEn.push(`Positive MACD histogram (${macdHist.toFixed(2)}) supports upside`);
    } else if (macdHist < 0 && macdLine <= macdSignal) {
      score -= 20;
      reasons.push(`Záporný MACD histogram (${macdHist.toFixed(2)}) potvrzuje pokles`);
      reasonsEn.push(`Negative MACD histogram (${macdHist.toFixed(2)}) confirms downside`);
    }

    // 4. RSI & Stochastic mean reversion / momentum (+/- 25)
    if (rsi < 35) {
      score += 18;
      reasons.push(`RSI (${rsi.toFixed(1)}) v přeprodané zóně nahrává odrazu`);
      reasonsEn.push(`RSI (${rsi.toFixed(1)}) in oversold zone favors bounce`);
    } else if (rsi > 72) {
      score -= 18;
      reasons.push(`RSI (${rsi.toFixed(1)}) značí překoupenost a riziko korekce`);
      reasonsEn.push(`RSI (${rsi.toFixed(1)}) signals overbought pullback risk`);
    } else if (rsi >= 52) {
      score += 8;
    } else if (rsi <= 48) {
      score -= 8;
    }

    if (stochK < 25 && stochK >= stochD) {
      score += 10;
    } else if (stochK > 78 && stochK <= stochD) {
      score -= 10;
    }

    // 5. VWAP anchor (+/- 10)
    if (currentPrice > vwap) {
      score += 10;
    } else if (currentPrice < vwap) {
      score -= 10;
    }
  } else {
    // LONG-TERM HORIZON (1D/1W multi-week/month trend)
    // 1. Price vs SMA 50 & SMA 200 (+/- 30)
    if (currentPrice > sma50 && currentPrice > sma200) {
      score += 30;
      reasons.push('Cena nad SMA 50 i SMA 200 potvrzuje silný dlouhodobý růstový trend');
      reasonsEn.push('Price above both SMA 50 & SMA 200 confirms primary uptrend');
    } else if (currentPrice < sma50 && currentPrice < sma200) {
      score -= 30;
      reasons.push('Cena pod SMA 50 i SMA 200 indikuje dlouhodobý klesající trend');
      reasonsEn.push('Price below SMA 50 & SMA 200 signals primary downtrend');
    } else if (currentPrice > sma200) {
      score += 12;
      reasons.push('Cena drží dlouhodobou podporu nad SMA 200');
      reasonsEn.push('Price holds long-term support above SMA 200');
    } else {
      score -= 12;
      reasons.push('Cena zůstává pod klíčovým dlouhodobým průměrem SMA 200');
      reasonsEn.push('Price remains below key long-term SMA 200');
    }

    // 2. Golden Cross / Death Cross (SMA 50 vs SMA 200) (+/- 25)
    if (sma50 > sma200 * 1.005) {
      score += 25;
      reasons.push('SMA 50 nad SMA 200 (Golden Cross struktura)');
      reasonsEn.push('SMA 50 above SMA 200 (Golden Cross structure)');
    } else if (sma50 < sma200 * 0.995) {
      score -= 25;
      reasons.push('SMA 50 pod SMA 200 (Death Cross struktura)');
      reasonsEn.push('SMA 50 below SMA 200 (Death Cross structure)');
    }

    // 3. Multi-bar trend slope (last 20 vs 60 bars) (+/- 15)
    const lookbackIdx = Math.max(0, lastIndex - 20);
    const slopePct = closes[lookbackIdx] > 0 ? ((currentPrice - closes[lookbackIdx]) / closes[lookbackIdx]) * 100 : 0;
    if (slopePct > 3) {
      score += 15;
    } else if (slopePct < -3) {
      score -= 15;
    }

    // 4. Daily MACD structural trend (+/- 15)
    if (macdLine > 0 && macdHist >= 0) {
      score += 15;
      reasons.push('Denní MACD v kladném pásmu potvrzuje dlouhodobou akumulaci');
      reasonsEn.push('Daily MACD in positive territory confirms accumulation');
    } else if (macdLine < 0 && macdHist <= 0) {
      score -= 15;
      reasons.push('Denní MACD v záporném pásmu potvrzuje distribuci');
      reasonsEn.push('Daily MACD in negative territory confirms distribution');
    }

    // 5. Daily RSI health (+/- 15)
    if (rsi >= 50 && rsi <= 70) {
      score += 15;
    } else if (rsi < 35) {
      score += 10;
      reasons.push(`Denní RSI (${rsi.toFixed(1)}) je hluboko přeprodané – hodnota pro dlouhodobý vstup`);
      reasonsEn.push(`Daily RSI (${rsi.toFixed(1)}) deeply oversold – value entry zone`);
    } else if (rsi > 75) {
      score -= 10;
    } else if (rsi < 45) {
      score -= 15;
    }

    if (currentPrice > sma20) score += 5;
    else score -= 5;
  }

  const clampedScore = Math.max(-100, Math.min(100, Math.round(score)));
  let action: HorizonRecommendation['action'] = 'HOLD';
  if (clampedScore >= 40) action = 'STRONG_BUY';
  else if (clampedScore >= 15) action = 'BUY';
  else if (clampedScore <= -40) action = 'STRONG_SELL';
  else if (clampedScore <= -15) action = 'SELL';

  const isBearish = clampedScore < 0;
  const targetMult = horizon === 'short' ? 2.2 : 4.2;
  const stopMult = horizon === 'short' ? 1.1 : 2.1;

  const targetPrice = Number(
    (isBearish ? Math.max(0.01, currentPrice - atr * targetMult) : currentPrice + atr * targetMult).toFixed(2)
  );
  const stopLoss = Number(
    (isBearish ? currentPrice + atr * stopMult : Math.max(0.01, currentPrice - atr * stopMult)).toFixed(2)
  );

  const reward = Math.abs(targetPrice - currentPrice);
  const risk = Math.max(0.01, Math.abs(currentPrice - stopLoss));
  const rr = (reward / risk).toFixed(1);

  if (reasons.length === 0) {
    reasons.push('Smíšené signály indikátorů – trh konsoliduje v neutrálním pásmu');
    reasonsEn.push('Mixed indicator signals – market consolidating in neutral range');
  }

  return {
    horizon,
    action,
    score: clampedScore,
    confidence: Math.min(94, Math.max(54, 52 + Math.round(Math.abs(clampedScore) * 0.42))),
    entryPrice: Number(currentPrice.toFixed(2)),
    targetPrice,
    stopLoss,
    riskReward: `1 : ${rr}`,
    timeframeLabel: horizon === 'short' ? '15m / 1h (1–5d)' : '1D / 1W (1–6m)',
    reasons: reasons.slice(0, 3),
    reasonsEn: reasonsEn.slice(0, 3),
  };
}
