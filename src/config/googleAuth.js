const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Debug logs
console.log('Loading Google OAuth configuration...');
console.log('Environment variables:');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET);
console.log('NODE_ENV:', process.env.NODE_ENV);

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('Google OAuth credentials are missing in environment variables');
  process.exit(1);
}

const config = {
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'https://blog-tech-be.onrender.com/api/auth/google/callback',
  scope: ['profile', 'email']
};

console.log('Google OAuth Config:', { ...config, clientSecret: '[HIDDEN]' });

try {
  passport.use(
    new GoogleStrategy(
      config,
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log('Google authentication callback received');
          console.log('Profile:', JSON.stringify(profile, null, 2));

          // Cerca l'utente nel database
          let user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
            console.log('Existing user found:', user.email);
            // Se l'utente esiste, aggiorna le informazioni Google
            user.googleId = profile.id;
            user.avatar = profile.photos[0].value;
            await user.save();
            return done(null, user);
          }

          console.log('Creating new user for:', profile.emails[0].value);
          // Se l'utente non esiste, creane uno nuovo
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            avatar: profile.photos[0].value,
            role: 'author',
            password: Math.random().toString(36).slice(-8), // Password casuale
          });

          done(null, user);
        } catch (error) {
          console.error('Error in Google Strategy callback:', error);
          done(error, null);
        }
      }
    )
  );
} catch (error) {
  console.error('Error initializing Google Strategy:', error);
  process.exit(1);
}

passport.serializeUser((user, done) => {
  console.log('Serializing user:', user.email);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    console.log('Deserializing user ID:', id);
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    console.error('Deserialize User Error:', error);
    done(error, null);
  }
});

module.exports = passport; 