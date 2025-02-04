import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import ragChat from "@/lib/rag.server";
import { Redis } from "@upstash/redis";
import { Index } from "@upstash/vector";
import { Document } from "langchain/document";

interface Vector {
  id: string;
  values: number[];
}

interface Conntent {
  content: string;
}

interface QueryResponse {
  id: string;
  score: string;
  metadata: {
    content: Conntent;
  };
}

export const updateUpstash = async (
  index: Index,
  namespace: string,
  docs: Document[]
) => {
  let counter = 0;
  for (let i = 0; i < docs.length; i++) {
    const text = docs[i]["pageContent"];
    counter = counter + 1;

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 100,
    });
    const chunks = await textSplitter.createDocuments([text]);
    const embeddingsArrays =
      await new HuggingFaceInferenceEmbeddings().embedDocuments(
        chunks.map((chunk) => chunk.pageContent.replace(/\n/g, " "))
      );
    const batchSize = 100;
    let batch: Vector[] = [];
    let pageContent = "";
    for (let idx = 0; idx < chunks.length; idx++) {
      const vector = {
        id: `${counter}_${idx}`,
        values: embeddingsArrays[idx],
      };

      pageContent += chunks[idx].pageContent + " ";

      batch = [...batch, vector];
      if (batch.length === batchSize || idx === chunks.length - 1) {
        const response = await index.upsert(
          {
            id: batch[0].id,
            vector: batch[0].values,
            metadata: { content: pageContent },
          },
          { namespace: namespace }
        );
        await ragChat.context.add({
          type: "text",
          data: pageContent,
          options: { namespace: namespace },
        });
        console.log(`Batch: ${counter} response: ${JSON.stringify(response)}`);
        batch = [];
        pageContent = "";
      }
    }
  }
};

export const queryUpstashAndLLM = async (
  index: Index,
  namespace: string,
  sessionId: string,
  question: string
) => {
  const embeddingsArrays =
    await new HuggingFaceInferenceEmbeddings().embedDocuments([question]);
  const queryResponse: any[] = await index.query(
    {
      topK: 10,
      vector: embeddingsArrays[0],
      includeVectors: false,
      includeMetadata: true,
    },
    { namespace: namespace }
  );
  //console.log(queryResponse[0].metadata);
  if (queryResponse.length >= 1) {
    for (let idx = 0; idx < queryResponse.length; idx++) {
      try {
        const context = queryResponse[idx]?.metadata?.content;
        await ragChat.context.add({
          type: "text",
          data: context,
          options: { namespace: namespace },
        });
      } catch (err) {
        console.log(`There was an error ${err}`);
      }
    }
  }
  //let textResponse = "";
  const response = await ragChat.chat(question, {
    debug: true,
    streaming: true,
    namespace,
    sessionId,
    similarityThreshold: 0.7,
    historyLength: 5,
    topK: 5,
    /*onChunk: async ({
      content,
      inputTokens,
      chunkTokens,
      totalTokens,
      rawContent,
    }: {
      // Change or read your streamed chunks
      // Examples:
      //textResponse += content;
      //console.log(rawContent);
      // - Log the content: console.log(content);
      // - Modify the content: content = content.toUpperCase();
      // - Track token usage: console.log(`Tokens used: ${totalTokens}`);
      // - Analyze raw content: processRawContent(rawContent);
      // - Update UI in real-time: updateStreamingUI(content);
    }) => {
      textResponse += await content;
    },*/
  });
  //const formattedResponse = response.toString().replace(/\. /g, ".\n");
  return response;
};

export const queryUpstash = async (
  index: Index,
  namespace: string,
  sessionId: string,
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
    { namespace: namespace }
  );
  let quizcontent = "";
  if (queryResponse.length >= 1) {
    for (let idx = 0; idx < queryResponse.length; idx++) {
      quizcontent += queryResponse[0].metadata;
    }
  }
  return quizcontent;
};

export const deleteUpstashRedis = async (
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
