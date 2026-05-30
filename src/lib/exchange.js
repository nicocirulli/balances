const BNA_RATE_URL = 'https://api.bluelytics.com.ar/v2/latest';

export async function fetchBancoNacionVentaRate() {
  const response = await fetch(BNA_RATE_URL);
  if (!response.ok) {
    throw new Error('No se pudo obtener la cotización de dólar oficial.');
  }

  const data = await response.json();
  const rate = data?.oficial?.value_sell;
  if (typeof rate !== 'number' || rate <= 0) {
    throw new Error('La cotización recibida no es válida.');
  }

  return rate;
}

export const EXCHANGE_RATE_SOURCE = 'Bluelytics oficial venta';
