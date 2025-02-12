import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { quizCreationSchema } from "@/schemas/forms/quiz";
import db from "@/lib/db/db";
import { z } from "zod";
import axios from "axios";
import { headers } from "next/headers";
import getUserSession from "@/lib/user.server";

export async function POST(request: NextRequest) {
  const session: any = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "You must be logged in to create a game." },
      {
        status: 401,
      }
    );
  }

  const user = await getUserSession();
  const [sessionId, namespace] = user;
  console.log(user);

  const body = await request.json();
  const { topic, amount } = quizCreationSchema.parse(body);
  const type = "mcq";
  console.log(topic, type, amount);
  const headersList = await headers();
  const host = await headersList.get("host");
  //console.log(host);
  const game = await db.game.create({
    data: {
      gameType: type,
      timeStarted: new Date(),
      userId: session.user.id,
      topic,
    },
  });
  console.log(game);

  await db.topic_count.upsert({
    where: {
      topic,
    },
    create: {
      topic,
      count: 1,
    },
    update: {
      count: {
        increment: 1,
      },
    },
  });
  //const url = new URL(`/api/questions`, `http://${host as string}`) as string;

  const { data } = await axios.post(`http://${host as string}/api/questions`, {
    amount,
    topic,
    type,
    namespace,
  });
  console.log(amount, topic, type, namespace);
  console.log(data);
  let parsedData;
  try {
    parsedData = data.questions;
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      {
        status: 500,
      }
    );
  }

  if (type === "mcq") {
    type mcqQuestion = {
      question: string;
      answer: string;
      option1: string;
      option2: string;
      option3: string;
      option4: string;
    };

    const manyData = parsedData.map((question: mcqQuestion) => {
      const options = [
        question.option1,
        question.option2,
        question.option3,
        question.option4,
      ].sort(() => Math.random() - 0.5);
      return {
        question: question.question,
        answer: question.answer,
        options: JSON.stringify(options),
        gameId: game.id,
        questionType: "mcq",
      };
    });
    //console.log(manyData);
    await db.question.createMany({
      data: manyData,
    });
  }
  //console.log(game.id);

  return NextResponse.json({ gameId: game.id }, { status: 200 });
}
