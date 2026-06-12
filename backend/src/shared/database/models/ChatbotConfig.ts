import {
  Table, Column, Model, DataType, PrimaryKey, AutoIncrement,
  Default, ForeignKey, BelongsTo
} from "sequelize-typescript";
import Company from "./Company";

@Table({ tableName: "chatbot_configs" })
class ChatbotConfig extends Model<ChatbotConfig> {
  @PrimaryKey @AutoIncrement @Column(DataType.INTEGER)
  id: number;

  @Default(true)
  @Column(DataType.BOOLEAN)
  isActive: boolean;

  @Default("openai")
  @Column(DataType.STRING)
  aiProvider: string;

  @Default("gpt-3.5-turbo")
  @Column(DataType.STRING)
  aiModel: string;

  @Column(DataType.TEXT)
  systemPrompt: string;

  @Default(0.7)
  @Column(DataType.FLOAT)
  temperature: number;

  @Default(2048)
  @Column(DataType.INTEGER)
  maxTokens: number;

  @Column(DataType.STRING)
  apiKey: string;

  @Default("http://localhost:11434")
  @Column(DataType.STRING)
  ollamaBaseUrl: string;

  @Default(true)
  @Column(DataType.BOOLEAN)
  useRag: boolean;

  @Column(DataType.TEXT)
  welcomeMessage: string;

  @Column(DataType.TEXT)
  farewellMessage: string;

  @Column(DataType.TEXT)
  outOfHoursMessage: string;

  @Column(DataType.STRING)
  workingHoursStart: string;

  @Column(DataType.STRING)
  workingHoursEnd: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  workingDaysOnly: boolean;

  @Default(true)
  @Column(DataType.BOOLEAN)
  transferToHuman: boolean;

  @Default("atendente,humano,falar com alguém,quero falar com,transferir,suporte,reclamação,ajuda")
  @Column(DataType.TEXT)
  transferKeywords: string;

  @Default(3)
  @Column(DataType.INTEGER)
  maxTransferAttempts: number;

  @Default("Estou transferindo para um atendente humano. Por favor, aguarde um momento.")
  @Column(DataType.TEXT)
  transferMessage: string;

  @Column(DataType.TEXT)
  transferPrompt: string;

  @Column(DataType.TEXT)
  knowledgeBase: string;

  @Default("nome, cidade, placa")
  @Column(DataType.TEXT)
  extractionFields: string;

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

export default ChatbotConfig;
