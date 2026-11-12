import { Candle, Pattern } from '../types/market';
import { calculateSMA, calculateRSI } from './indicators';

export function detectCandlePatterns(candles: Candle[]): Pattern[] {
  const patterns: Pattern[] = [];
  if (candles.length < 5) return patterns;

  const closes = candles.map((c) => c.close);
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);
  const rsi = calculateRSI(closes, 14);

  // 1. Candlestick Patterns (examine recent 150 candles)
  const startIndex = Math.max(2, candles.length - 120);

  for (let i = startIndex; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    const prev2 = candles[i - 2];

    const body = Math.abs(c.close - c.open);
    const upperWick = c.high - Math.max(c.close, c.open);
    const lowerWick = Math.min(c.close, c.open) - c.low;
    const totalRange = c.high - c.low;

    if (totalRange === 0) continue;

    const prevBody = Math.abs(prev.close - prev.open);

    // Bullish Engulfing
    if (
      prev.close < prev.open && // red candle
      c.close > c.open && // green candle
      c.open <= prev.close &&
      c.close >= prev.open &&
      body > prevBody * 1.1
    ) {
      patterns.push({
        id: `bull-engulf-${i}`,
        name: 'Bullish Engulfing',
        nameCz: 'Býčí pohlcení (Engulfing)',
        type: 'bullish',
        candleIndex: i,
        price: c.low,
        time: c.time,
        description: 'Strong bullish reversal signal. The green body completely engulfs the prior red candle.',
        descriptionCz: 'Silný obratový signál růstu. Zelená svíčka zcela pohltila tělo předchozí červené svíčky.',
        confidence: 85,
      });
    }

    // Bearish Engulfing
    if (
      prev.close > prev.open && // green candle
      c.close < c.open && // red candle
      c.open >= prev.close &&
      c.close <= prev.open &&
      body > prevBody * 1.1
    ) {
      patterns.push({
        id: `bear-engulf-${i}`,
        name: 'Bearish Engulfing',
        nameCz: 'Medvědí pohlcení (Engulfing)',
        type: 'bearish',
        candleIndex: i,
        price: c.high,
        time: c.time,
        description: 'Strong bearish reversal signal. The red body engulfs the previous green candle.',
        descriptionCz: 'Silný medvědí obratový signál. Červená svíčka zcela pohltila předchozí růstovou svíčku.',
        confidence: 85,
      });
    }

    // Hammer (Bullish Reversal in downtrend)
    if (
      lowerWick >= body * 2 &&
      upperWick <= body * 0.3 &&
      c.close > c.low + totalRange * 0.6 &&
      prev.close < prev2.close
    ) {
      patterns.push({
        id: `hammer-${i}`,
        name: 'Hammer',
        nameCz: 'Kladivo (Hammer)',
        type: 'bullish',
        candleIndex: i,
        price: c.low,
        time: c.time,
        description: 'Long lower shadow indicates sellers pushed price down, but buyers aggressively recovered.',
        descriptionCz: 'Dlouhý spodní stín ukazuje, že prodejci tlačili cenu dolů, ale kupci ji agresivně vytáhli zpět.',
        confidence: 78,
      });
    }

    // Shooting Star (Bearish Reversal in uptrend)
    if (
      upperWick >= body * 2 &&
      lowerWick <= body * 0.3 &&
      c.close < c.low + totalRange * 0.4 &&
      prev.close > prev2.close
    ) {
      patterns.push({
        id: `shooting-star-${i}`,
        name: 'Shooting Star',
        nameCz: 'Padající hvězda (Shooting Star)',
        type: 'bearish',
        candleIndex: i,
        price: c.high,
        time: c.time,
        description: 'Long upper shadow rejection indicates exhaustion among buyers and selling pressure.',
        descriptionCz: 'Dlouhý horní stín značí vyčerpání kupců a odmítnutí vyšších cen silným prodejním tlakem.',
        confidence: 80,
      });
    }

    // Morning Star (3-candle bullish reversal)
    if (
      prev2.close < prev2.open && // strong red
      prevBody < totalRange * 0.3 && // small star
      c.close > c.open && // strong green
      c.close > prev2.open - (prev2.open - prev2.close) * 0.5
    ) {
      patterns.push({
        id: `morning-star-${i}`,
        name: 'Morning Star',
        nameCz: 'Jitřenka (Morning Star)',
        type: 'bullish',
        candleIndex: i,
        price: c.low,
        time: c.time,
        description: 'Three-candle bullish reversal pattern signaling transition from bear to bull momentum.',
        descriptionCz: 'Třísvíčková formace obratu trendu indikující přechod z medvědího do býčího momenta.',
        confidence: 88,
      });
    }

    // Evening Star (3-candle bearish reversal)
    if (
      prev2.close > prev2.open && // strong green
      prevBody < totalRange * 0.3 && // small star
      c.close < c.open && // strong red
      c.close < prev2.close - (prev2.close - prev2.open) * 0.5
    ) {
      patterns.push({
        id: `evening-star-${i}`,
        name: 'Evening Star',
        nameCz: 'Večernice (Evening Star)',
        type: 'bearish',
        candleIndex: i,
        price: c.high,
        time: c.time,
        description: 'Three-candle bearish reversal pattern signaling buyer exhaustion at peak.',
        descriptionCz: 'Třísvíčková medvědí formace indikující vyčerpání kupců na vrcholu a nástup poklesu.',
        confidence: 88,
      });
    }

    // Doji (Neutral indecision)
    if (body <= totalRange * 0.08 && totalRange > 0.001) {
      patterns.push({
        id: `doji-${i}`,
        name: 'Doji',
        nameCz: 'Doji nerozhodnost',
        type: 'neutral',
        candleIndex: i,
        price: c.close,
        time: c.time,
        description: 'Open and close are virtually identical. Indicates extreme market indecision.',
        descriptionCz: 'Otevírací a zavírací cena jsou téměř totožné. Signalizuje nerozhodnost trhu a možnou změnu.',
        confidence: 65,
      });
    }

    // Golden Cross / Death Cross detection (SMA 50 vs SMA 200)
    if (i > 1 && sma50[i] !== null && sma200[i] !== null && sma50[i - 1] !== null && sma200[i - 1] !== null) {
      const prev50 = sma50[i - 1] as number;
      const prev200 = sma200[i - 1] as number;
      const curr50 = sma50[i] as number;
      const curr200 = sma200[i] as number;

      if (prev50 <= prev200 && curr50 > curr200) {
        patterns.push({
          id: `golden-cross-${i}`,
          name: 'Golden Cross (SMA 50/200)',
          nameCz: 'Zlatý kříž (Golden Cross)',
          type: 'bullish',
          candleIndex: i,
          price: c.high,
          time: c.time,
          description: 'Long-term 50-day moving average crossed above 200-day moving average. Major macro bull signal.',
          descriptionCz: '50-periodový klouzavý průměr proťal 200-periodový zdola nahoru. Zásadní makro býčí signál.',
          confidence: 94,
        });
      } else if (prev50 >= prev200 && curr50 < curr200) {
        patterns.push({
          id: `death-cross-${i}`,
          name: 'Death Cross (SMA 50/200)',
          nameCz: 'Kříž smrti (Death Cross)',
          type: 'bearish',
          candleIndex: i,
          price: c.low,
          time: c.time,
          description: '50-day moving average crossed below 200-day moving average. Major macro bear warning.',
          descriptionCz: '50-periodový průměr proťal 200-periodový shora dolů. Varovný makro medvědí signál.',
          confidence: 94,
        });
      }
    }

    // RSI Divergence check
    if (i >= 10 && rsi[i] !== null && rsi[i - 8] !== null) {
      const currRsi = rsi[i] as number;
      const prevRsi = rsi[i - 8] as number;
      const priceDelta = c.close - candles[i - 8].close;

      // Bullish divergence: Price made lower low, but RSI made higher low
      if (priceDelta < 0 && currRsi > prevRsi + 5 && currRsi < 40) {
        patterns.push({
          id: `bull-rsi-div-${i}`,
          name: 'Bullish RSI Divergence',
          nameCz: 'Býčí RSI Divergence',
          type: 'bullish',
          candleIndex: i,
          price: c.low,
          time: c.time,
          description: 'Price printed lower lows while RSI momentum formed higher lows. Accumulation detected.',
          descriptionCz: 'Cena klesá na nová minima, ale RSI tvoří vyšší dno. Silný signál skryté akumulace.',
          confidence: 84,
        });
      }
      // Bearish divergence: Price made higher high, but RSI made lower high
      if (priceDelta > 0 && currRsi < prevRsi - 5 && currRsi > 60) {
        patterns.push({
          id: `bear-rsi-div-${i}`,
          name: 'Bearish RSI Divergence',
          nameCz: 'Medvědí RSI Divergence',
          type: 'bearish',
          candleIndex: i,
          price: c.high,
          time: c.time,
          description: 'Price printed higher highs while RSI momentum dropped. Distribution/exhaustion alert.',
          descriptionCz: 'Cena dosáhla nového maxima, ale indikátor RSI slábne. Signál vyčerpání kupců.',
          confidence: 84,
        });
      }
    }
  }

  // Deduplicate patterns close to each other
  const filtered: Pattern[] = [];
  const seenKeys = new Set<string>();

  for (const p of patterns.reverse()) {
    const key = `${p.name}-${Math.floor(p.candleIndex / 2)}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      filtered.push(p);
    }
  }

  return filtered.reverse();
}
