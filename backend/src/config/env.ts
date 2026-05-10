import "dotenv/config";

const required = [
  "MONGO_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "OPENAI_API_KEY",
  "PINECONE_API_KEY",
  "PINECONE_INDEX"
] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

export const env = {
  port: Number(process.env.PORT || 8080),
  mongoUri: process.env.MONGO_URI!,
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET!,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
  redisUrl: process.env.REDIS_URL || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  openAiApiKey: process.env.OPENAI_API_KEY!,
  /** e.g. text-embedding-3-small — must match Pinecone index dimension settings */
  openAiEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
  /** Optional; set when using reduced dims (e.g. 1024) so vectors match your Pinecone index */
  openAiEmbeddingDimensions: process.env.OPENAI_EMBEDDING_DIMENSIONS
    ? Number(process.env.OPENAI_EMBEDDING_DIMENSIONS)
    : undefined,
  pineconeApiKey: process.env.PINECONE_API_KEY!,
  pineconeIndex: process.env.PINECONE_INDEX!,
  pineconeNamespace: process.env.PINECONE_NAMESPACE || "neurolearn",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
  resendApiKey: process.env.RESEND_API_KEY || "",
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:3000"
};
