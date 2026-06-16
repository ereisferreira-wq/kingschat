import {
  Table, Column, Model, DataType, PrimaryKey, AutoIncrement,
  Default, ForeignKey, BelongsTo, HasMany
} from "sequelize-typescript";
import Contact from "./Contact";
import Message from "./Message";
import User from "./User";
import Whatsapp from "./Whatsapp";
import Company from "./Company";

@Table({ tableName: "tickets", indexes: [
  { fields: ["companyId"] },
  { fields: ["contactId"] },
  { fields: ["whatsappId"] },
  { fields: ["userId"] },
  { fields: ["status", "companyId"] },
] })
class Ticket extends Model<Ticket> {
  @PrimaryKey @AutoIncrement @Column(DataType.INTEGER)
  id: number;

  @Default("pending")
  @Column(DataType.STRING)
  status: string;

  @Default(0)
  @Column(DataType.INTEGER)
  unreadMessages: number;

  @Column(DataType.STRING)
  lastMessage: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isGroup: boolean;

  @ForeignKey(() => User)
  @Column(DataType.INTEGER)
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Contact)
  @Column(DataType.INTEGER)
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @ForeignKey(() => Whatsapp)
  @Column(DataType.INTEGER)
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @ForeignKey(() => Company)
  @Column(DataType.INTEGER)
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isBot: boolean;

  @Column(DataType.STRING)
  botSessionId: string;

  @Default(0)
  @Column(DataType.INTEGER)
  botTransferAttempts: number;

  @Default(0)
  @Column(DataType.INTEGER)
  persistIndex: number;

  @Column({ type: DataType.STRING, defaultValue: "" })
  sector: string;

  @Column(DataType.DATE)
  createdAt: Date;

  @Column(DataType.DATE)
  updatedAt: Date;

  @HasMany(() => Message)
  messages: Message[];
}

export default Ticket;
