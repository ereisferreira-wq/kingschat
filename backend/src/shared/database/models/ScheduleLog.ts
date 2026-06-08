import {
  Table, Column, Model, DataType, PrimaryKey, AutoIncrement,
  Default, ForeignKey, BelongsTo
} from "sequelize-typescript";
import ScheduleTask from "./ScheduleTask";
import Customer from "./Customer";
import Company from "./Company";

@Table({ tableName: "schedule_logs" })
class ScheduleLog extends Model<ScheduleLog> {
  @PrimaryKey @AutoIncrement @Column(DataType.INTEGER)
  id: number;

  @ForeignKey(() => ScheduleTask)
  @Column(DataType.INTEGER)
  taskId: number;

  @BelongsTo(() => ScheduleTask)
  task: ScheduleTask;

  @ForeignKey(() => Customer)
  @Column(DataType.INTEGER)
  customerId: number;

  @BelongsTo(() => Customer)
  customer: Customer;

  @Default("pending")
  @Column(DataType.STRING)
  status: string;

  @Column(DataType.DATE)
  sentAt: Date;

  @Column(DataType.TEXT)
  error: string;

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

export default ScheduleLog;
