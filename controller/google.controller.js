import { google } from 'googleapis';
import User, { deleteUser } from '../models/user.js';
import { unlink } from 'node:fs';
import fs from 'fs';
import dotenv from 'dotenv';
import {
  createDocument,
  allDocument,
  listDocument,
} from '../models/document.model.js';
dotenv.config();

const GOOGLE_API_FOLDER_ID = process.env.GOOGLE_FOLDER_ID;

// upload file in particular folder
export const uploadFile = async (req, res) => {
  if (!req.session.passport) {
    return res.render('error');
  }
  let file = req.file;
  let token = '';
  let user = await User.findById(req.user._id).select({
    accessToken: 1,
  });
  if (user) {
    token = user.accessToken;
  } else {
    token = req.user.accessToken;
  }
  const OAuth2Client = new google.auth.OAuth2();
  
  OAuth2Client.setCredentials({
    access_token: token,
  });
  if (!OAuth2Client.credentials.access_token) {
    await deleteUser(user._id);
    req.session.destroy();
    return res.render('expireToken');
  }
  const path = file.path;
  const drive = google.drive({
    version: 'v3',
    auth: OAuth2Client,
  });
  const fileMetadata = {
    name: file.originalname,
    parents: [GOOGLE_API_FOLDER_ID],
  };
  const media = {
    mimeType: file.mimetype,
    body: fs.createReadStream(path),
  };

  const response = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id,name',
  });
  const id = response.data.id;

  res.render('successResponse', {
    fileData: req.file.originalname,
  });

  const data = {};
  data.imageId = id;
  data.folderId = GOOGLE_API_FOLDER_ID;
  data.googleId = req.user.googleId;
  data.filename = req.file.filename;
  data.mimetype = req.file.mimetype;
  data.originalname = req.file.originalname;
  await createDocument(data);

  unlink(path, (err) => {
    if (err) throw err;
    console.log(`${path} file deleted`);
  });
};

// list all image file in
export const listFile = async (req, res) => {
  if (!req.session.passport) {
    return res.render('error');
  }
  let user = await User.findById(req.user._id).select({
    accessToken: 1,
    googleId: 1,
    _id: 0,
  });
  const googleId = user.googleId;
  const list = await listDocument(googleId, GOOGLE_API_FOLDER_ID);
  res.render('listResponse', {
    data: list,
  });
};

// delete file from drive using id
export const deleteFile = async (req, res) => {
  if (!req.session.passport) {
    return res.render('error');
  }
  let token = '';
  let user = await User.findById(req.user._id).select({
    accessToken: 1,
    _id: 0,
  });
  if (user) {
    token = user.accessToken;
  } else {
    token = req.user.accessToken;
  }
  let id = req.body.id;
  if (!id) {
    return console.warn(
      `this file ${id} is already deleted please check it again`
    );
  }
  const OAuth2Client = new google.auth.OAuth2();

  OAuth2Client.setCredentials({
    access_token: token,
  });

  const drive = google.drive({
    version: 'v3',
    auth: OAuth2Client,
  });

  const response = await drive.files.delete({ fileId: id }, (err, file) => {
    if (err) {
      console.log('error', err.errors[0]);
      res.render('notFound', { data: err.errors[0].message });
    } else {
      console.log('hello file deleted');
      res.render('deleteResponse');
    }
  });
};
