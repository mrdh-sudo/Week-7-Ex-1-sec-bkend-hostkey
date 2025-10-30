import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';

function isIsoDateString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && value === date.toISOString();
}

type ProductUpdatedDto = {
  id: string;
  name: string;
  pricePence: number;
  description: string;
  updatedAt: string; // ISO string format
};

function validatePayload(
  body: any
): { ok: true; data: ProductUpdatedDto } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!body || typeof body !== 'object') {
    return { ok: false, errors: ['Body must be a JSON object.'] };
  }

  const { id, name, pricePence, description, updatedAt } =
    body as Partial<ProductUpdatedDto>;

  if (typeof id !== 'string' || id.trim().length === 0)
    errors.push('id must be a non-empty string');
  if (typeof name !== 'string' || name.trim().length === 0)
    errors.push('name must be a non-empty string');
  if (
    typeof pricePence !== 'number' ||
    !Number.isInteger(pricePence) ||
    pricePence < 0
  )
    errors.push('pricePence must be a non-negative integer');
  if (typeof description !== 'string')
    errors.push('description must be a string');
  if (!isIsoDateString(updatedAt))
    errors.push('updatedAt must be an ISO 8601 string (Date.toISOString)');

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: { id, name, pricePence, description, updatedAt } as ProductUpdatedDto,
  };
}

async function productUpdatedHttpHandler(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Received product-updated event');
  let body: unknown;
  try {
    body = await request.json();
  } catch (err) {
    context.warn('Invalid JSON body', err);
    return {
      status: 400,
      jsonBody: { error: 'Invalid JSON body' },
    };
  }

  const result = validatePayload(body);
  if (!result.ok) {
    const errors = (result as { ok: false; errors: string[] }).errors;
    context.warn('Validation failed', errors);
    return {
      status: 400,
      jsonBody: { error: 'ValidationError', details: errors },
    };
  }

  // This service is a sink (dev-null). Log and acknowledge.
  context.log('Product updated:', result.data);

  return {
    status: 202,
    jsonBody: { message: 'accepted' },
  };
}

app.http('product-updated-http', {
  route: 'integration/events/product-updated',
  methods: ['POST'],
  authLevel: 'function',
  handler: productUpdatedHttpHandler,
});
