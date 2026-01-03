import mongoose from "mongoose";
import User from "../model/userSchema.js";
import { findWalletByUserId, createWallet, saveWallet } from "../repositories/walletRepository.js";
import { createLedgerEntry } from "../repositories/walletLedgerRepository.js";
import { createReferralRecord } from "../repositories/referralRepository.js";

export const processReferral = async (referrerId, referredId, codeUsed) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const REFERRER_AMOUNT = 100;
    const REFERRED_AMOUNT = 50;

    // wallets exist
    let referrerWallet = await findWalletByUserId(referrerId, session);
    if (!referrerWallet) referrerWallet = (await createWallet(referrerId, session))[0];

    let referredWallet = await findWalletByUserId(referredId, session);
    if (!referredWallet) referredWallet = (await createWallet(referredId, session))[0];

    // Credit referrer
    referrerWallet.balance += REFERRER_AMOUNT;
    referrerWallet.totalCredits += REFERRER_AMOUNT;
    referrerWallet.lastTransactionAt = new Date();
    await saveWallet(referrerWallet, session);

    await createLedgerEntry(
      {
        walletId: referrerWallet._id,
        userId: referrerId,
        amount: REFERRER_AMOUNT,
        type: "REFERRAL",
        note: `Referral reward for referring user ${referredId}`,
        referenceId: `${referredId.toString()}`,
        balanceAfter: referrerWallet.balance,
      },
      session
    );

    // increment referrer's referralRewards 
    await User.updateOne(
      { _id: referrerId },
      { $inc: { referralRewards: REFERRER_AMOUNT } },
      { session }
    );

    // Credit referred 
    referredWallet.balance += REFERRED_AMOUNT;
    referredWallet.totalCredits += REFERRED_AMOUNT;
    referredWallet.lastTransactionAt = new Date();
    await saveWallet(referredWallet, session);

    await createLedgerEntry(
      {
        walletId: referredWallet._id,
        userId: referredId,
        amount: REFERRED_AMOUNT,
        type: "REFERRAL",
        note: `Signup referral bonus for using code ${codeUsed}`,
        referenceId: `${referrerId.toString()}`,
        balanceAfter: referredWallet.balance,
      },
      session
    );

    // Save referral record
    await createReferralRecord(
      {
        referrer: referrerId,
        referred: referredId,
        referrerAmount: REFERRER_AMOUNT,
        referredAmount: REFERRED_AMOUNT,
        codeUsed,
      },
      session
    );

    await session.commitTransaction();
    session.endSession();

    return { success: true };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

