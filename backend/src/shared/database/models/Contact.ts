import {
  Table, Column, Model, DataType, PrimaryKey, AutoIncrement,
  ForeignKey, BelongsTo, HasMany
} from "sequelize-typescript";
import Ticket from "./Ticket";
import Message from "./Message";
import Company from "./Company";

@Table({ tableName: "contacts" })
class Contact extends Model<Contact> {
  @PrimaryKey @AutoIncrement @Column(DataType.INTEGER)
  id: number;

  @Column(DataType.STRING)
  name: string;

  @Column(DataType.STRING)
  number: string;

  @Column(DataType.STRING)
  email: string;

  @Column(DataType.TEXT)
  profilePicUrl: string;

  @Column(DataType.STRING)
  city: string;

  @Column(DataType.STRING)
  licensePlate: string;

  @ForeignKey(() => Company)
  @Column(DataType.INTEGER)
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @HasMany(() => Ticket)
  tickets: Ticket[];

  @HasMany(() => Message)
  messages: Message[];

  @Column(DataType.DATE)
  createdAt: Date;

  @Column(DataType.DATE)
  updatedAt: Date;
}

export default Contact;
