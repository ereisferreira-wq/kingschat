import {
  Table, Column, Model, DataType, PrimaryKey, AutoIncrement, Default,
} from "sequelize-typescript";

@Table({ tableName: "system_notices" })
class SystemNotice extends Model<SystemNotice> {
  @PrimaryKey @AutoIncrement @Column(DataType.INTEGER)
  id: number;

  @Column(DataType.TEXT)
  message: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isActive: boolean;

  @Column(DataType.DATE)
  scheduledAt: Date;

  @Column(DataType.DATE)
  createdAt: Date;

  @Column(DataType.DATE)
  updatedAt: Date;
}

export default SystemNotice;
