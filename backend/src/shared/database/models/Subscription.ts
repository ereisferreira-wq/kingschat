import {
  Table, Column, Model, DataType, PrimaryKey, AutoIncrement,
  Default, ForeignKey, BelongsTo
} from "sequelize-typescript";
import Company from "./Company";
import Plan from "./Plan";

@Table({ tableName: "subscriptions" })
class Subscription extends Model<Subscription> {
  @PrimaryKey @AutoIncrement @Column(DataType.INTEGER)
  id: number;

  @Default("active")
  @Column(DataType.STRING)
  status: string;

  @Column(DataType.DATE)
  startDate: Date;

  @Column(DataType.DATE)
  endDate: Date;

  @Column(DataType.DATE)
  nextBillingDate: Date;

  @Default("manual")
  @Column(DataType.STRING)
  paymentMethod: string;

  @Column(DataType.STRING)
  paymentReference: string;

  @ForeignKey(() => Company)
  @Column(DataType.INTEGER)
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => Plan)
  @Column(DataType.INTEGER)
  planId: number;

  @BelongsTo(() => Plan)
  plan: Plan;

  @Column(DataType.DATE)
  createdAt: Date;

  @Column(DataType.DATE)
  updatedAt: Date;
}

export default Subscription;
