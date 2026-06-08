import { OpenAIEmbeddings } from "@langchain/openai";
import { Document as LangchainDocument } from "langchain/document";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OllamaEmbeddings } from "@langchain/community/embeddings/ollama";
import pdfParse from "pdf-parse";
import * as fs from "fs";
import logger from "../../shared/utils/logger";

const vectorStores = new Map<number, MemoryVectorStore>();

function getEmbeddings(provider?: string) {
  if (provider === "ollama") {
    return new OllamaEmbeddings({
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      model: "nomic-embed-text",
    });
  }
  return new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "text-embedding-3-small",
  });
}

export async function processDocument(
  documentId: number,
  companyId: number,
  filePath: string,
  aiProvider?: string
) {
  try {
    const buffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await splitter.splitDocuments([
      new LangchainDocument({ pageContent: text, metadata: { documentId, companyId } }),
    ]);

    const embeddings = getEmbeddings(aiProvider);
    const vectorStore = await MemoryVectorStore.fromDocuments(chunks, embeddings);

    vectorStores.set(companyId, vectorStore);
    logger.info(`Document ${documentId} processed for company ${companyId}`);

    return { chunks: chunks.length, textLength: text.length };
  } catch (error) {
    logger.error(`Error processing document ${documentId}:`, error);
    throw error;
  }
}

export async function queryRag(
  companyId: number,
  question: string,
  aiProvider?: string,
  k: number = 5
) {
  const vectorStore = vectorStores.get(companyId);
  if (!vectorStore) {
    return null;
  }

  const results = await vectorStore.similaritySearch(question, k);
  return results.map((r) => r.pageContent).join("\n\n");
}

export function hasDocuments(companyId: number) {
  return vectorStores.has(companyId);
}
