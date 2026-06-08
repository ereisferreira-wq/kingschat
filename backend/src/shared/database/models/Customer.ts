import {
  Table, Column, Model, DataType, PrimaryKey, AutoIncrement,
  Default, ForeignKey, BelongsTo
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";

@Table({ tableName: "customers" })
class Customer extends Model<Customer> {
  @PrimaryKey @AutoIncrement @Column(DataType.INTEGER)
  id: number;

  @Column(DataType.STRING)
  name: string;

  @Column(DataType.STRING)
  phone: string;

  @Column(DataType.STRING)
  email: string;

  @Default("lead")
  @Column(DataType.STRING)
  status: string;

  @Column(DataType.TEXT)
  notes: string;

  @Column(DataType.STRING)
  tags: string;

  @Column(DataType.DATE)
  lastContact: Date;

  @Column(DataType.DATE)
  nextFollowUp: Date;

  @ForeignKey(() => User)
  @Column(DataType.INTEGER)
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Company)
  @Column(DataType.INTEGER)
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column(DataType.DATE)
  createdAt: Date;

  @Column(DataType.DATE)
  updatedAt: Date;
}

export default Customer;
