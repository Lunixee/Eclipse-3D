export const finiteNumber = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

export const positiveInteger = (value, fallback = 1, maximum = 1_000_000) => {
    const number = Math.floor(finiteNumber(value, fallback));
    return Math.min(maximum, Math.max(1, number));
};

export const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export const normalizeName = value => String(value ?? '').trim();

