const READABLE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 0, 1

let lastTimestampForCartId = 0;
let perMsSequenceForCartId = 0;

let lastTimestampForOrderId = 0;
let perMsSequenceForOrderId = 0;

function encodeNumberWithAlphabet(value: number): string {
    const base = READABLE_ALPHABET.length;
    if (!Number.isFinite(value) || value <= 0) {
        return READABLE_ALPHABET[0];
    }
    let remaining = Math.floor(value);
    let encoded = "";
    while (remaining > 0) {
        const index = remaining % base;
        encoded = READABLE_ALPHABET[index] + encoded;
        remaining = Math.floor(remaining / base);
    }
    return encoded;
}

function randomReadable(length: number): string {
    let out = "";
    for (let i = 0; i < length; i++) {
        const idx = Math.floor(Math.random() * READABLE_ALPHABET.length);
        out += READABLE_ALPHABET[idx];
    }
    return out;
}

function getDateCodeFromTimestamp(timestampMs: number): string {
    const d = new Date(timestampMs);
    const yy = String(d.getUTCFullYear()).slice(-2);
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yy}${mm}${dd}`;
}

export function generateCartUniqueId(productId: number, quantity: number): string {
    const now = Date.now();

    if (now === lastTimestampForCartId) {
        perMsSequenceForCartId += 1;
    } else {
        perMsSequenceForCartId = 0;
        lastTimestampForCartId = now;
    }

    const dateCode = getDateCodeFromTimestamp(now);

    const safeProductId = Math.abs(Math.trunc(productId));
    const productCode = `P${safeProductId}`;

    const quantityString = Number.isInteger(quantity)
        ? String(Math.trunc(quantity))
        : String(quantity).replace(/\./g, "P"); // replace decimal point with a readable marker
    const qtyCode = `Q${quantityString}`;

    const timePart = encodeNumberWithAlphabet(now).slice(-6); // last 6 chars of timestamp encoding
    const seqPart = encodeNumberWithAlphabet(perMsSequenceForCartId);
    const randPart = randomReadable(2);

    const suffix = `${timePart}${seqPart}${randPart}`;

    const cartUniqueId = `C-${dateCode}-${productCode}-${qtyCode}-${suffix}`;
    return cartUniqueId.toUpperCase();
}

export function generateOrderUniqueId(cartUniqueId: string, maxDateRequired: Date): string {
    const now = Date.now();

    if (now === lastTimestampForOrderId) {
        perMsSequenceForOrderId += 1;
    } else {
        perMsSequenceForOrderId = 0;
        lastTimestampForOrderId = now;
    }

    const dateCode = getDateCodeFromTimestamp(now);
    const deliveryDateCode = getDateCodeFromTimestamp(maxDateRequired.getTime());

    // Extract a short identifier from cart ID (last 4 chars)
    const cartShortId = cartUniqueId.slice(-4);

    const timePart = encodeNumberWithAlphabet(now).slice(-6); // last 6 chars of timestamp encoding
    const seqPart = encodeNumberWithAlphabet(perMsSequenceForOrderId);
    const randPart = randomReadable(2);

    const suffix = `${timePart}${seqPart}${randPart}`;

    const orderUniqueId = `O-${dateCode}-${deliveryDateCode}-${cartShortId}-${suffix}`;
    return orderUniqueId.toUpperCase();
}


export function generateBatchCode(productId: number, startDate: string | Date, endDate: string | Date) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const pad = (n: number) => n.toString().padStart(2, '0');

    const startDay = pad(start.getDate());
    const startMonth = pad(start.getMonth() + 1);
    const endDay = pad(end.getDate());
    const endMonth = pad(end.getMonth() + 1);

    const now = Date.now();

    return `${productId}${startDay}${startMonth}${endDay}${endMonth}${now}`;
}