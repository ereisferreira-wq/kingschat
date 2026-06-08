import {
  Table, Column, Model, DataType, PrimaryKey, AutoIncrement,
  Default, ForeignKey, BelongsTo
} from "sequelize-typescript";
import Ticket from "./Ticket";
import Contact from "./Contact";
import Company from "./Company";

@Table({ tableName: "messages" })
class Message extends Model<Message> {
  @PrimaryKey @AutoIncrement @Column(DataType.INTEGER)
  id: number;

  @Column(DataType.TEXT)
  body: string;

  @Column(DataType.STRING)
  mediaUrl: string;

  @Column(DataType.STRING)
  mediaType: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  fromMe: boolean;

  @Default(0)
  @Column(DataType.INTEGER)
  ack: number;

  @Default(false)
  @Column(DataType.BOOLEAN)
  read: boolean;

  @ForeignKey(() => Ticket)
  @Column(DataType.INTEGER)
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @ForeignKey(() => Contact)
  @Column(DataType.INTEGER)
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

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

export default Message;
