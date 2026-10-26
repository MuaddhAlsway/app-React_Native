import type { Types } from 'mongoose';
import type { IUser } from './index.js';

// protect attaches the MongoDB user before authenticated route handlers execute.
// This module is explicitly imported, including in single-entry server builds.
declare global {
  namespace Express {
    interface Request {
      user: IUser & { _id: Types.ObjectId };
    }
  }
}

export {};
