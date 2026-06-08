import {
  Table, Column, Model, DataType, PrimaryKey, AutoIncrement,
  Default, ForeignKey, BelongsTo
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";

@Table({ tableName: "schedule_tasks" })
class ScheduleTask extends Model<ScheduleTask> {
  @PrimaryKey @AutoIncrement @Column(DataType.INTEGER)
  id: number;

  @Column(DataType.STRING)
  name: string;

  @Column(DataType.TEXT)
  description: string;

  @Column(DataType.STRING)
  triggerType: string;

  @Column(DataType.INTEGER)
  triggerValue: number;

  @Column(DataType.TIME)
  triggerTime: string;

  @Column(DataType.TEXT)
  messageTemplate: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  repeat: boolean;

  @Column(DataType.INTEGER)
  repeatInterval: number;

  @Column(DataType.STRING)
  repeatIntervalType: string;

  @Column(DataType.TEXT)
  approach: string;

  @Column(DataType.STRING)
  targetType: string;

  @Column(DataType.STRING)
  targetStatus: string;

  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive: boolean;

  @Column(DataType.DATE)
  lastRun: Date;

  @Column(DataType.DATE)
  nextRun: Date;

  @ForeignKey(() => User)
  @Column(DataType.INTEGER)
  createdBy: number;

  @BelongsTo(() => User, "createdBy")
  creator: User;

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

export default ScheduleTask;
