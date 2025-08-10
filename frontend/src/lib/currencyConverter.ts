// Currency conversion utility using exchangerate.host API

interface ExchangeRateResponse {
  success: boolean;
  result: number;
  info: {
    quote: number;
  };
  date: string;
  // Some providers include an error object when success is false
  error?: {
    code?: number;
    type?: string;
    info?: string;
  };
}

interface HistoricalRateResponse {
  success: boolean;
  quotes: {
    USDINR?: number;
    EURINR?: number;
  };
  date: string;
}

// Cache for exchange rates to avoid repeated API calls
const rateCache = new Map<string, { rate: number; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function convertToINR(
  amount: number, 
  fromCurrency: string, 
  date?: string
): Promise<{ inr: number; rate: number; date: string }> {
  if (fromCurrency === 'INR') {
    return { inr: amount, rate: 1, date: date || new Date().toISOString().split('T')[0] };
  }

  const cacheKey = `${fromCurrency}_${date || 'latest'}`;
  const cached = rateCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { 
      inr: amount * cached.rate, 
      rate: cached.rate, 
      date: date || new Date().toISOString().split('T')[0] 
    };
  }

  try {
    const apiKey = process.env.NEXT_PUBLIC_EXCHANGERATE_API_KEY;
    if (!apiKey) {
      throw new Error('Exchange rate API key not configured');
    }

    let url: string;
    if (date) {
      // Historical conversion
      url = `https://api.exchangerate.host/convert?access_key=${apiKey}&from=${fromCurrency}&to=INR&amount=${amount}&date=${date}`;
    } else {
      // Latest conversion
      url = `https://api.exchangerate.host/convert?access_key=${apiKey}&from=${fromCurrency}&to=INR&amount=${amount}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data: ExchangeRateResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.error?.info || 'API error');
    }

    const rate = data.info.quote;
    const result = data.result;

    // Cache the rate
    rateCache.set(cacheKey, { rate, timestamp: Date.now() });

    return {
      inr: result,
      rate,
      date: data.date || date || new Date().toISOString().split('T')[0]
    };
  } catch (error) {
    console.error('Currency conversion error:', error);
    
    // Fallback to approximate rates if API fails
    const fallbackRates: Record<string, number> = {
      USD: 75,
      EUR: 85
    };
    
    const fallbackRate = fallbackRates[fromCurrency] || 1;
    return {
      inr: amount * fallbackRate,
      rate: fallbackRate,
      date: date || new Date().toISOString().split('T')[0]
    };
  }
}

export async function getHistoricalRate(
  fromCurrency: string,
  date: string
): Promise<number> {
  if (fromCurrency === 'INR') return 1;

  const cacheKey = `${fromCurrency}_${date}`;
  const cached = rateCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.rate;
  }

  try {
    const apiKey = process.env.NEXT_PUBLIC_EXCHANGERATE_API_KEY;
    if (!apiKey) {
      throw new Error('Exchange rate API key not configured');
    }

    const url = `https://api.exchangerate.host/historical?access_key=${apiKey}&date=${date}&source=${fromCurrency}&currencies=INR`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data: HistoricalRateResponse = await response.json();
    
    if (!data.success) {
      throw new Error('API error');
    }

    const rate = data.quotes[`${fromCurrency}INR` as keyof typeof data.quotes] || 1;
    
    // Cache the rate
    rateCache.set(cacheKey, { rate, timestamp: Date.now() });

    return rate;
  } catch (error) {
    console.error('Historical rate fetch error:', error);
    
    // Fallback rates
    const fallbackRates: Record<string, number> = {
      USD: 75,
      EUR: 85
    };
    
    return fallbackRates[fromCurrency] || 1;
  }
}

// Utility function to format currency amounts
export function formatCurrency(amount: number, currency: string): string {
  const formatters: Record<string, Intl.NumberFormat> = {
    INR: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }),
    USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    EUR: new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR' })
  };

  const formatter = formatters[currency];
  return formatter ? formatter.format(amount) : `${currency} ${amount.toFixed(2)}`;
}
