import { Pinecone } from "@pinecone-database/pinecone";
import { env } from "../config/env";
import { TranscriptModel } from "../models/LearningModels";
import {
  formatTimestampLabel,
  parseTimestampSecondsFromQuestion
} from "../utils/timestamp";

const pinecone = new Pinecone({
  apiKey: env.pineconeApiKey
});

/**
 * TEMP MOCK VECTOR FIX
 * Removes OpenAI embedding dependency.
 */

function mockVector() {
  return Array(1024).fill(0.01);
}

export async function upsertTranscriptChunks(
  lectureId: string,
  chunks: Array<{
    id: string;
    text: string;
    startSec: number;
    endSec: number;
  }>
) {
  const vectors = await Promise.all(
    chunks.map(async (chunk) => {
      const values = mockVector();

      return {
        id: chunk.id,
        values,
        metadata: {
          lectureId,
          text: chunk.text.slice(0, 1000),
          startSec: chunk.startSec,
          endSec: chunk.endSec
        }
      };
    })
  );

  await pinecone
    .index(env.pineconeIndex)
    .namespace(env.pineconeNamespace)
    .upsert(vectors);
}

async function retrieveVectorReferences(
  lectureId: string,
  query: string
) {
  const queryVector = mockVector();

  const result = await pinecone
    .index(env.pineconeIndex)
    .namespace(env.pineconeNamespace)
    .query({
      vector: queryVector,
      topK: 6,
      includeMetadata: true,
      filter: {
        lectureId: {
          $eq: lectureId
        }
      }
    });

  return (result.matches || []).map((m: any) => ({
    text: String(m.metadata?.text || ""),
    startSec: Number(m.metadata?.startSec || 0),
    endSec: Number(m.metadata?.endSec || 0)
  }));
}

async function nearestTranscriptRefs(
  lectureId: string,
  targetSec: number,
  k = 4
) {
  const doc = await TranscriptModel.findOne({
    lectureId
  }).lean();

  const chunks = doc?.chunks;

  if (!chunks?.length) return [];

  const scored = chunks.map((c: any) => {
    const mid = (c.startSec + c.endSec) / 2;

    const dist = Math.abs(mid - targetSec);

    const inRange =
      targetSec >= c.startSec &&
      targetSec <= c.endSec
        ? -1
        : 0;

    return {
      ...c,
      dist: dist + inRange * 0.5
    };
  });

  scored.sort((a: any, b: any) => a.dist - b.dist);

  return scored.slice(0, k).map((c: any) => ({
    text: c.text,
    startSec: c.startSec,
    endSec: c.endSec
  }));
}

function refKey(r: any) {
  return `${r.startSec}:${r.endSec}:${r.text.slice(0, 40)}`;
}

function mergeReferences(primary: any[], secondary: any[]) {
  const seen = new Set();

  const out = [];

  for (const r of [...primary, ...secondary]) {
    const k = refKey(r);

    if (seen.has(k) || !r.text.trim()) continue;

    seen.add(k);

    out.push(r);
  }

  return out.slice(0, 10);
}

export async function retrieveContext(
  lectureId: string,
  question: string
) {
  const focusTimestampSec =
    parseTimestampSecondsFromQuestion(question);

  const vectorRefs =
    await retrieveVectorReferences(
      lectureId,
      question
    );

  let timeRefs: any[] = [];

  if (focusTimestampSec != null) {
    timeRefs = await nearestTranscriptRefs(
      lectureId,
      focusTimestampSec,
      4
    );
  }

  const references = mergeReferences(
    timeRefs,
    vectorRefs
  );

  const context = references
    .map(
      (ref) =>
        `[${formatTimestampLabel(
          ref.startSec
        )}–${formatTimestampLabel(
          ref.endSec
        )}]\n${ref.text}`
    )
    .join("\n\n");

  return {
    context,
    references,
    focusTimestampSec
  };
}