import {
  Table, Column, Model, DataType, PrimaryKey, AutoIncrement,
  Default, HasMany
} from "sequelize-typescript";
import Company from "./Company";

@Table({ tableName: "plans" })
class Plan extends Model<Plan> {
  @PrimaryKey @AutoIncrement @Column(DataType.INTEGER)
  id: number;

  @Column(DataType.STRING)
  name: string;

  @Default(1)
  @Column(DataType.INTEGER)
  maxUsers: number;

  @Default(1)
  @Column(DataType.INTEGER)
  maxConnections: number;

  @Default(500)
  @Column(DataType.INTEGER)
  maxContacts: number;

  @Default(3)
  @Column(DataType.INTEGER)
  maxProducts: number;

  @Default(3)
  @Column(DataType.INTEGER)
  maxPersist: number;

  @Column(DataType.FLOAT)
  price: number;

  @Default(true)
  @Column(DataType.BOOLEAN)
  useWhatsApp: boolean;

  @Default(true)
  @Column(DataType.BOOLEAN)
  useChatbot: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  useRag: boolean;

  @Column(DataType.INTEGER)
  maxDocuments: number;

  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive: boolean;

  @HasMany(() => Company)
  companies: Company[];
}

export default Plan;
