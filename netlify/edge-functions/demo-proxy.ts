export default async (request: Request) => {
  const url = new URL(request.url);
  const binanceUrl = `https://demo-fapi.binance.com${url.pathname}${url.search}`;

  return fetch(binanceUrl);
};

export const config = { path: "/demo-fapi/*" };