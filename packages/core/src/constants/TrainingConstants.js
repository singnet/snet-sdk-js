import BigNumber from "bignumber.js";

export const serviceStatus = {
    0: "CREATED",
    1: "VALIDATING",
    2: "VALIDATED",
    3: "TRAINING",
    4: "READY_TO_USE", // After training is completed
    5: "ERRORED",
    6: "DELETED",
}

export const UNIFIED_SIGN_EXPIRY = new BigNumber(300); // blocks number after that unified sign is expiry