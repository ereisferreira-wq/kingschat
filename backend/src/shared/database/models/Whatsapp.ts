import {
  Table, Column, Model, DataType, PrimaryKey, AutoIncrement,
  Default, ForeignKey, BelongsTo, HasMany
} from "sequelize-typescript";
import Company from "./Company";

@Table({ tableName: "whatsapps" })
class Whatsapp extends Model<Whatsapp> {
  @PrimaryKey @AutoIncrement @Column(DataType.INTEGER)
  id: number;

  @Column(DataType.TEXT)
  name: string;

  @Column(DataType.TEXT)
  session: string;

  @Column(DataType.TEXT)
  qrcode: string;

  @Default("DISCONNECTED")
  @Column(DataType.STRING)
  status: string;

  @Column(DataType.STRING)
  battery: string;

  @Column(DataType.BOOLEAN)
  plugged: boolean;

  @Column(DataType.STRING)
  number: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isDefault: boolean;

  @ForeignKey(() => Company)
  @Column(DataType.INTEGER)
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column(DataType.STRING)
  token: string;

  @Column(DataType.DATE)
  createdAt: Date;

  @Column(DataType.DATE)
  updatedAt: Date;
}

export default Whatsapp;
