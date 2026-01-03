import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../model/userSchema.js";
import dotenv from "dotenv";
import { generateUniqueReferralCode } from "../helpers/referralHelper.js";


dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL, 
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email =
          profile.emails && profile.emails[0]
            ? profile.emails[0].value
            : null;

        let user = null;

        if (email) {
          user = await User.findOne({ email });
        }

        if (user) {

           if (user.isBlocked) {
            console.log("Blocked :", user.email);
            return done(null, false, { message: "Blocked by admin." });
          }

          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
            console.log(" Linked:", user.email);
          }
          return done(null, user);
        }

        const newUser = new User({
          name: profile.displayName || "Google User",
          email: email,
          googleId: profile.id,
           referralCode: await generateUniqueReferralCode(),
        });

        await newUser.save();
        console.log("user:", newUser.email);
        return done(null, newUser);
      } catch (error) {
        console.error("error:", error);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
