import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { IPostModel } from './PostModel';

const HASH_ROUNDS = 10;

/**
 * TypeScript用型定義
 */

interface IUser {
  name?: string;
  birthYear?: number;
  gender?: string;
  placeState?: string;
  placeCity?: string;
  password: string;
  isAdmin: boolean;
  email: string;
  comparePassword: (candidatePassword: string) => boolean;
  posts?: IPostModel[];
}

export interface IUserModel extends IUser, mongoose.Document {}

/**
 * スキーマ定義
 */

const schema = new mongoose.Schema(
  {
    name: { type: String, default: null },
    birthYear: { type: Number, default: null },
    gender: { type: String, default: null },
    placeState: { type: String, default: null },
    placeCity: { type: String, default: null },
    isAdmin: { type: Boolean, default: false },
    email: { type: String, lowercase: true, required: true, unique: true },
    password: { type: String, required: true },
    posts: [{ type: mongoose.SchemaTypes.ObjectId, ref: 'PostModel' }],
  },
  { timestamps: true }
);

schema.set('toJSON', {
  transform: (doc, user) => {
    delete user.__v;
    if (user.password) {
      delete user.password;
    }
  },
});

/**
 * validations
 */

// emailフィールドのバリデーション
schema.path('email').validate(async (value) => {
  const emailCount = await mongoose.models.UserModel.countDocuments({
    email: value,
  });
  return !emailCount;
}, 'Email already exists');

/**
 * hooks
 */

// save時のhook
schema.pre('save', async function (next) {
  const user = this as IUserModel;
  // passwordフィールドが変更されていなかったらなにもしない
  if (!this.isModified('password')) next();
  // passwordが変更されていたらbcryptで暗号化する
  try {
    const salt = await bcrypt.genSalt(HASH_ROUNDS);
    user.password = await bcrypt.hash(user.password, salt);
    return next();
  } catch (e) {
    return next(e);
  }
});

/**
 * methods
 */

// 入力されたパスワードがbcryptで暗号化されたパスワードと一致するか比較するメソッド
schema.methods.comparePassword = async function (candidatePassword) {
  const user = this as IUserModel;
  return bcrypt.compare(candidatePassword, user.password);
};

export const UserModel =
  mongoose.models.UserModel || mongoose.model<IUserModel>('UserModel', schema);
