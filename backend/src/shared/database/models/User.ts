import {
  Table, Column, Model, DataType, PrimaryKey, AutoIncrement,
  Default, ForeignKey, BelongsTo, HasMany, BeforeCreate, BeforeUpdate
} from "sequelize-typescript";
import { hash, compare } from "bcryptjs";
import Company from "./Company";

@Table({ tableName: "users", indexes: [
  { fields: ["email"], unique: true },
  { fields: ["companyId"] },
  { fields: ["role"] },
] })
class User extends Model<User> {
  @PrimaryKey @AutoIncrement @Column(DataType.INTEGER)
  id: number;

  @Column(DataType.STRING)
  name: string;

  @Column(DataType.STRING)
  email: string;

  @Column(DataType.VIRTUAL)
  password: string;

  @Column(DataType.STRING)
  passwordHash: string;

  @Default("user")
  @Column(DataType.STRING)
  role: string;

  @Column(DataType.STRING)
  profileImage: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  super: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  approved: boolean;

  @ForeignKey(() => Company)
  @Column(DataType.INTEGER)
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive: boolean;

  @Column(DataType.DATE)
  lastLogin: Date;

  @Column(DataType.DATE)
  createdAt: Date;

  @Column(DataType.DATE)
  updatedAt: Date;

  @BeforeUpdate
  @BeforeCreate
  static async hashPassword(instance: User) {
    if (instance.password) {
      instance.passwordHash = await hash(instance.password, 12);
    }
  }

  async checkPassword(password: string): Promise<boolean> {
    return compare(password, this.passwordHash);
  }
}

export default User;
