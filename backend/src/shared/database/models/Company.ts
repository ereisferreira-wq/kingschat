import {
  Table, Column, Model, DataType, PrimaryKey, AutoIncrement,
  Default, ForeignKey, BelongsTo, HasMany
} from "sequelize-typescript";
import User from "./User";
import Plan from "./Plan";

@Table({ tableName: "companies" })
class Company extends Model<Company> {
  @PrimaryKey @AutoIncrement @Column(DataType.INTEGER)
  id: number;

  @Column(DataType.STRING)
  name: string;

  @Column(DataType.STRING)
  email: string;

  @Column(DataType.STRING)
  phone: string;

  @Column({ type: DataType.STRING, defaultValue: "" })
  logo: string;

  @Column({ type: DataType.STRING, defaultValue: "" })
  document: string;

  @Column(DataType.BOOLEAN)
  status: boolean;

  @Column(DataType.DATE)
  dueDate: Date;

  @Default("monthly")
  @Column(DataType.STRING)
  recurrence: string;

  @ForeignKey(() => Plan)
  @Column(DataType.INTEGER)
  planId: number;

  @BelongsTo(() => Plan)
  plan: Plan;

  @ForeignKey(() => Plan)
  @Column({ type: DataType.INTEGER, allowNull: true })
  pendingPlanId: number | null;

  @BelongsTo(() => Plan, "pendingPlanId")
  pendingPlan: Plan;

  @HasMany(() => User)
  users: User[];

  @Column({ type: DataType.STRING, defaultValue: "" })
  paymentReceipt: string;

  @Column({ type: DataType.STRING, defaultValue: "" })
  upgradeReceipt: string;

  @Column(DataType.DATE)
  createdAt: Date;

  @Column(DataType.DATE)
  updatedAt: Date;
}

export default Company;
