import {
  Table, Column, Model, DataType, PrimaryKey, AutoIncrement,
  Default, ForeignKey, BelongsTo
} from "sequelize-typescript";
import Company from "./Company";

@Table({ tableName: "documents" })
class Document extends Model<Document> {
  @PrimaryKey @AutoIncrement @Column(DataType.INTEGER)
  id: number;

  @Column(DataType.STRING)
  name: string;

  @Column(DataType.STRING)
  originalName: string;

  @Column(DataType.STRING)
  mimeType: string;

  @Column(DataType.INTEGER)
  size: number;

  @Column(DataType.STRING)
  path: string;

  @Default("processing")
  @Column(DataType.STRING)
  status: string;

  @Column(DataType.TEXT)
  extractedText: string;

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

export default Document;
