import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import ragChat from "@/lib/rag.server";
import { Redis } from "@upstash/redis";
import { Index } from "@upstash/vector";
import { Document } from "langchain/document";
import { summarizer } from "@/lib/groqSummarizer";
import { v4 as uuid } from "uuid";
import { SparseVector } from "@upstash/vector";

interface Metadata {
  content: string;
}
interface Vector {
  id: string;
  vector: number[];
  // sparseVector: SparseVector; // Ensures compatibility
  metadata: Metadata;
}

export const updateUpstash = async (
  index: Index,
  namespace: string,
  docs: Document[]
) => {
  const promiseList = docs.map(async (doc, counter) => {
    const text = doc["pageContent"];
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 2000,
      chunkOverlap: 200,
    });
    const chunks = await textSplitter.createDocuments([text]);

    const embeddingsArrays =
      await new HuggingFaceInferenceEmbeddings().embedDocuments(
        chunks.map((chunk) => chunk.pageContent.replace(/\n/g, " "))
      );

    const batchSize = 500;
    //let batch: Array<Vector> = [];
    let batch /*: Array<{
      id: string;
      vector: number[];
      metadata: Metadata;
    }> */ = [];
    let pageContent = "";
    const batchPromises = chunks.map(async (chunk, idx) => {
      const vector /*: Vector*/ = {
        id: uuid(),
        vector: embeddingsArrays[idx],
        //sparseVector: undefined, // Ensures compatibility
        metadata: {
          content: chunk.pageContent,
        },
      };

      pageContent += chunk.pageContent + " ";
      batch.push(vector);

      if (batch.length === batchSize || idx === chunks.length - 1) {
        const response = await index.upsert(
          /* {
            id: batch[idx].id,
            vector: batch[idx].values,
            metadata: { content: pageContent },
          },*/
          batch,
          { namespace: namespace }
        );
        const summary: any = await summarizer(
          `You are an expert summarizer who is able to capture the main talking points from a text.`,

          `Summarize the text in less than 150 words.`,
          pageContent
        );
        //console.log("summary before adding context", summary.content);
        await ragChat.context.add({
          type: "text",
          data: summary.content,
          options: { namespace: namespace },
        });

        console.log(`Batch: ${counter} response: ${JSON.stringify(response)}`);
        batch = [];
        pageContent = "";
      }
    });

    await Promise.all(batchPromises);
  });

  await Promise.all(promiseList);
};

export const queryUpstashAndLLM = async (
  index: Index,
  namespace: string,
  sessionId: string,
  question: string
) => {
  //console.log(namespace, question);
  const embeddingsArrays =
    await new HuggingFaceInferenceEmbeddings().embedDocuments([question]);
  //console.log(embeddingsArrays);
  const queryResponse: any[] = await index.query(
    {
      topK: 10,
      vector: embeddingsArrays[0],
      includeVectors: false,
      includeMetadata: true,
    },
    { namespace }
  );
  console.log("index query", queryResponse);
  if (queryResponse.length >= 1) {
    const contextPromises = queryResponse.map(async (result) => {
      try {
        const context = result?.metadata?.content;
        return ragChat.context.add({
          type: "text",
          data: context,
          options: { namespace },
        });
      } catch (err) {
        console.error(`There was an error: ${err}`);
        return Promise.resolve();
      }
    });

    await Promise.all(contextPromises);
  }

  const response = await ragChat.chat(question, {
    debug: true,
    streaming: true,
    namespace,
    sessionId,
    similarityThreshold: 0.7,
    historyLength: 5,
    topK: 5,
  });

  return response;
};

export const queryUpstash = async (
  index: Index,
  namespace: string,
  topic: string
) => {
  const embeddingsArrays =
    await new HuggingFaceInferenceEmbeddings().embedDocuments([topic]);

  const queryResponse: any[] = await index.query(
    {
      topK: 10,
      vector: embeddingsArrays[0],
      includeVectors: false,
      includeMetadata: true,
    },
    { namespace }
  );

  if (queryResponse.length === 0) return "";

  const quizContentArray = await Promise.all(
    queryResponse.map(async (result) => result?.metadata?.content || "")
  );

  return quizContentArray.join("");
};

export const deleteUpstash = async (
  index: Index,
  namespace: string,
  sessionId: string,
  taskId: number
) => {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  if (taskId == 1) {
    const responseReset = await index.reset({ namespace: namespace });
    console.log(responseReset);
    const history = await redis.keys(`${sessionId}*`);
    for (const key of history) {
      await redis.del(key);
    }
  }
  const context = await redis.keys(`${namespace}*`);
  for (const key of context) {
    await redis.del(key);
  }
};
