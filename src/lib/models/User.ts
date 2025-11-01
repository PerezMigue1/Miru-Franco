import { getDatabase } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

export interface User {
  _id?: string;
  email: string;
  name: string;
  password: string;
  phone?: string;
  securityQuestions?: Array<{
    question: string;
    answer: string;
  }>;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserInput {
  email: string;
  name: string;
  password: string;
  phone?: string;
}

export class UserModel {
  static async create(userData: UserInput): Promise<User> {
    const db = await getDatabase();
    const users = db.collection<User>('users');

    // Verificar si el usuario ya existe
    const existingUser = await users.findOne({ email: userData.email });
    if (existingUser) {
      throw new Error('El usuario ya existe');
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const newUser: Omit<User, '_id'> = {
      email: userData.email,
      name: userData.name,
      password: hashedPassword,
      phone: userData.phone,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await users.insertOne(newUser as User);
    
    // Retornar el usuario sin la contraseña
    const { password, ...userWithoutPassword } = { ...newUser, _id: result.insertedId.toString() };
    return userWithoutPassword as User;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const db = await getDatabase();
    const users = db.collection<User>('users');
    return await users.findOne({ email });
  }

  static async findById(id: string): Promise<User | null> {
    const db = await getDatabase();
    const users = db.collection<User>('users');
    return await users.findOne({ _id: id as any });
  }

  static async verifyPassword(user: User, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.password);
  }

  static async updateResetToken(
    email: string,
    token: string,
    expires: Date
  ): Promise<void> {
    const db = await getDatabase();
    const users = db.collection<User>('users');
    await users.updateOne(
      { email },
      {
        $set: {
          resetPasswordToken: token,
          resetPasswordExpires: expires,
          updatedAt: new Date(),
        },
      }
    );
  }

  static async updatePassword(email: string, newPassword: string): Promise<void> {
    const db = await getDatabase();
    const users = db.collection<User>('users');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await users.updateOne(
      { email },
      {
        $set: {
          password: hashedPassword,
          resetPasswordToken: undefined,
          resetPasswordExpires: undefined,
          updatedAt: new Date(),
        },
      }
    );
  }

  static async findByResetToken(token: string): Promise<User | null> {
    const db = await getDatabase();
    const users = db.collection<User>('users');
    return await users.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });
  }

  static async updateSecurityQuestions(
    email: string,
    questions: Array<{ question: string; answer: string }>
  ): Promise<void> {
    const db = await getDatabase();
    const users = db.collection<User>('users');
    
    // Hashear las respuestas antes de guardarlas
    const hashedQuestions = await Promise.all(
      questions.map(async (q) => ({
        question: q.question,
        answer: await bcrypt.hash(q.answer.toLowerCase().trim(), 10),
      }))
    );
    
    await users.updateOne(
      { email },
      {
        $set: {
          securityQuestions: hashedQuestions,
          updatedAt: new Date(),
        },
      }
    );
  }

  static async verifySecurityQuestions(
    email: string,
    answers: Record<string, string>
  ): Promise<boolean> {
    const user = await this.findByEmail(email);
    if (!user || !user.securityQuestions) {
      return false;
    }

    for (const question of user.securityQuestions) {
      const userAnswer = answers[question.question];
      if (!userAnswer) {
        return false;
      }
      const isCorrect = await bcrypt.compare(
        userAnswer.toLowerCase().trim(),
        question.answer
      );
      if (!isCorrect) {
        return false;
      }
    }

    return true;
  }
}

