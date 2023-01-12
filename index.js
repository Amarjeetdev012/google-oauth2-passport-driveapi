import express from 'express';
import logger from 'morgan';
import dotenv from 'dotenv';
dotenv.config();
import passport from 'passport';
import { connectDatabase } from './database/mongoose.database.js';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import router from './config/passport.js';
import multer from 'multer';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(logger('dev'));
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(multer().any());
const PORT = process.env.PORT;
app.use(
  session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 },
  })
);
connectDatabase();
app.use(passport.initialize());
app.use(passport.session());
app.use('/', router);

app.listen(PORT, console.log(`listening at ${PORT}`));
