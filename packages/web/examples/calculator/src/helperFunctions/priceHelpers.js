const priceData = {
    agixPrecision: 100000000,
    agiDivisibility: 8,
};

export const tokenName = "AGIX";

export const cogsToAgix = (cogs) =>
    (Number(cogs) / priceData.agixPrecision).toFixed(
        priceData.agiDivisibility
    );
