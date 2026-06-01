export default async (request: Request) => {
  const url = new URL(request.url);
  const binanceUrl = `https://fapi.binance.com${url.pathname}${url.search}`;

  return fetch(binanceUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Referer": "https://www.binance.com",
      "Origin": "https://www.binance.com",
    }
  });
};

export const config = { path: "/fapi/*" };